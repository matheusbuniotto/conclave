import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Redis from "ioredis";
import { db, users, workspaces, channels, messages, reactions, channelMembers, workspaceMembers, bots } from "@conclave/db";
import { eq, and, isNull, desc, asc, inArray } from "drizzle-orm";
import type { WebSocket } from "ws";
import { handleAgentResponse } from "./agent";

const fastify = Fastify({ logger: true });

// Redis clients for Pub/Sub
const redisPublisher = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const redisSubscriber = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// In-memory socket registry for this node
interface SocketClient {
  ws: WebSocket;
  userId?: string;
  subscribedChannels: Set<string>;
}
const clients = new Set<SocketClient>();

await fastify.register(cors, {
  origin: true,
  credentials: true,
});

await fastify.register(websocket);

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// List all workspaces
fastify.get("/api/workspaces", async () => {
  return await db.select().from(workspaces);
});

// List channels in a workspace
fastify.get<{ Params: { workspaceId: string } }>(
  "/api/workspaces/:workspaceId/channels",
  async (request) => {
    return await db
      .select()
      .from(channels)
      .where(eq(channels.workspaceId, request.params.workspaceId));
  }
);

// List workspace members
fastify.get<{ Params: { workspaceId: string } }>(
  "/api/workspaces/:workspaceId/members",
  async (request) => {
    return await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        userType: users.userType,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, request.params.workspaceId));
  }
);

// List workspace bots (with assigned channels)
fastify.get<{ Params: { workspaceId: string } }>(
  "/api/workspaces/:workspaceId/bots",
  async (request) => {
    const workspaceBots = await db
      .select({
        id: bots.id,
        userId: bots.userId,
        workspaceId: bots.workspaceId,
        createdById: bots.createdById,
        name: bots.name,
        handle: bots.handle,
        description: bots.description,
        systemPrompt: bots.systemPrompt,
        engine: bots.engine,
        avatarLabel: bots.avatarLabel,
        createdAt: bots.createdAt,
        user: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          userType: users.userType,
        },
      })
      .from(bots)
      .innerJoin(users, eq(bots.userId, users.id))
      .where(eq(bots.workspaceId, request.params.workspaceId));

    const botUserIds = workspaceBots.map((b) => b.userId);
    const memberships = botUserIds.length
      ? await db
          .select({
            userId: channelMembers.userId,
            channelId: channelMembers.channelId,
          })
          .from(channelMembers)
          .where(inArray(channelMembers.userId, botUserIds))
      : [];

    return workspaceBots.map((b) => ({
      ...b,
      channelIds: memberships
        .filter((m) => m.userId === b.userId)
        .map((m) => m.channelId),
    }));
  }
);

// Create a new bot for the workspace owner
fastify.post<{
  Params: { workspaceId: string };
  Body: {
    name: string;
    handle: string;
    description?: string;
    systemPrompt?: string;
    engine?: string;
    avatarLabel?: string;
    channelIds?: string[];
    ownerId: string;
  };
}>("/api/workspaces/:workspaceId/bots", async (request, reply) => {
  const { workspaceId } = request.params;
  const {
    name,
    handle,
    description,
    systemPrompt,
    engine = "agy",
    avatarLabel = "1.7.0.0",
    channelIds = [],
    ownerId,
  } = request.body;

  const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");

  // 1. Create a user record of type 'agent' with procedural face avatar
  const [botUser] = await db
    .insert(users)
    .values({
      email: `${cleanHandle}-${Date.now()}@bot.conclave.local`,
      displayName: name,
      avatarUrl: `face:${avatarLabel}`,
      userType: "agent",
    })
    .returning();

  // 2. Add bot to workspace members
  await db.insert(workspaceMembers).values({
    workspaceId,
    userId: botUser.id,
    role: "member",
  });

  // 3. Add bot to selected channels
  if (channelIds.length > 0) {
    for (const chId of channelIds) {
      await db.insert(channelMembers).values({
        channelId: chId,
        userId: botUser.id,
      });
    }
  }

  // 4. Create the bot record
  const [newBot] = await db
    .insert(bots)
    .values({
      userId: botUser.id,
      workspaceId,
      createdById: ownerId,
      name,
      handle: cleanHandle,
      description: description || null,
      systemPrompt: systemPrompt || null,
      engine,
      avatarLabel,
    })
    .returning();

  // 5. Broadcast new member / bot event
  await redisPublisher.publish(
    "conclave:events",
    JSON.stringify({
      type: "bot.created",
      workspaceId,
      data: {
        ...newBot,
        channelIds,
        user: botUser,
      },
    })
  );

  return reply.status(201).send({
    ...newBot,
    channelIds,
    user: botUser,
  });
});

// List members of a channel (humans and bots)
fastify.get<{ Params: { channelId: string } }>(
  "/api/channels/:channelId/members",
  async (request) => {
    return await db
      .select({
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        userType: users.userType,
        joinedAt: channelMembers.joinedAt,
      })
      .from(channelMembers)
      .innerJoin(users, eq(channelMembers.userId, users.id))
      .where(eq(channelMembers.channelId, request.params.channelId));
  }
);

// Add a member or bot to a channel
fastify.post<{
  Params: { channelId: string };
  Body: { userId: string };
}>("/api/channels/:channelId/members", async (request, reply) => {
  const { channelId } = request.params;
  const { userId } = request.body;

  // Check if already in channel
  const existing = await db
    .select()
    .from(channelMembers)
    .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, userId)));

  if (existing.length === 0) {
    await db.insert(channelMembers).values({
      channelId,
      userId,
    });

    await redisPublisher.publish(
      "conclave:events",
      JSON.stringify({
        type: "channel.member_joined",
        channelId,
        userId,
      })
    );
  }

  return reply.send({ success: true, channelId, userId });
});

// Remove a member or bot from a channel
fastify.delete<{
  Params: { channelId: string; userId: string };
}>("/api/channels/:channelId/members/:userId", async (request, reply) => {
  const { channelId, userId } = request.params;

  await db
    .delete(channelMembers)
    .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, userId)));

  await redisPublisher.publish(
    "conclave:events",
    JSON.stringify({
      type: "channel.member_left",
      channelId,
      userId,
    })
  );

  return reply.send({ success: true, channelId, userId });
});

// Get channel message feed (root messages only, not thread replies)
fastify.get<{ Params: { channelId: string } }>(
  "/api/channels/:channelId/messages",
  async (request) => {
    const rawMessages = await db
      .select({
        id: messages.id,
        workspaceId: messages.workspaceId,
        channelId: messages.channelId,
        senderId: messages.senderId,
        content: messages.content,
        metadata: messages.metadata,
        replyCount: messages.replyCount,
        lastReplyAt: messages.lastReplyAt,
        isEdited: messages.isEdited,
        createdAt: messages.createdAt,
        sender: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          userType: users.userType,
        },
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          eq(messages.channelId, request.params.channelId),
          isNull(messages.parentMessageId),
          isNull(messages.deletedAt)
        )
      )
      .orderBy(asc(messages.createdAt));

    // Fetch reactions for these messages
    const messageIds = rawMessages.map((m) => m.id);
    const allReactions = messageIds.length
      ? await db
          .select({
            id: reactions.id,
            messageId: reactions.messageId,
            userId: reactions.userId,
            emoji: reactions.emoji,
          })
          .from(reactions)
      : [];

    return rawMessages.map((msg) => ({
      ...msg,
      reactions: allReactions.filter((r) => r.messageId === msg.id),
    }));
  }
);

// Get thread replies for a root message
fastify.get<{ Params: { messageId: string } }>(
  "/api/messages/:messageId/thread",
  async (request) => {
    const replies = await db
      .select({
        id: messages.id,
        workspaceId: messages.workspaceId,
        channelId: messages.channelId,
        senderId: messages.senderId,
        parentMessageId: messages.parentMessageId,
        content: messages.content,
        metadata: messages.metadata,
        isEdited: messages.isEdited,
        createdAt: messages.createdAt,
        sender: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          userType: users.userType,
        },
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          eq(messages.parentMessageId, request.params.messageId),
          isNull(messages.deletedAt)
        )
      )
      .orderBy(asc(messages.createdAt));

    return replies;
  }
);

// Create a new message (root or thread reply)
fastify.post<{
  Params: { channelId: string };
  Body: {
    workspaceId: string;
    senderId: string;
    content: string;
    parentMessageId?: string;
  };
}>("/api/channels/:channelId/messages", async (request, reply) => {
  const { workspaceId, senderId, content, parentMessageId } = request.body;
  const channelId = request.params.channelId;

  // Check if content mentions a bot that is NOT currently in this channel
  const workspaceBots = await db
    .select({
      id: bots.id,
      userId: bots.userId,
      name: bots.name,
      handle: bots.handle,
      avatarLabel: bots.avatarLabel,
    })
    .from(bots)
    .where(eq(bots.workspaceId, workspaceId));

  const currentChannelMemberships = await db
    .select({ userId: channelMembers.userId })
    .from(channelMembers)
    .where(eq(channelMembers.channelId, channelId));
  const channelMemberIds = new Set(currentChannelMemberships.map((m) => m.userId));

  let pendingBotInvite: {
    botId: string;
    userId: string;
    name: string;
    handle: string;
    avatarLabel: string;
  } | null = null;

  for (const b of workspaceBots) {
    const handleRegex = new RegExp(`@?(${b.handle}|${b.name.replace(/\s+/g, "")})`, "i");
    if (handleRegex.test(content) && !channelMemberIds.has(b.userId)) {
      pendingBotInvite = {
        botId: b.id,
        userId: b.userId,
        name: b.name,
        handle: b.handle,
        avatarLabel: b.avatarLabel,
      };
      break;
    }
  }

  const initialMetadata: Record<string, unknown> = {};
  if (pendingBotInvite) {
    initialMetadata.pendingBotInvite = pendingBotInvite;
  }

  const [newMsg] = await db
    .insert(messages)
    .values({
      workspaceId,
      channelId,
      senderId,
      content,
      parentMessageId: parentMessageId || null,
      metadata: initialMetadata,
    })
    .returning();

  // If this is a reply, increment parent's replyCount
  if (parentMessageId) {
    const [parent] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, parentMessageId));
    if (parent) {
      await db
        .update(messages)
        .set({
          replyCount: (parent.replyCount || 0) + 1,
          lastReplyAt: new Date(),
        })
        .where(eq(messages.id, parentMessageId));
    }
  }

  // Fetch full sender data
  const [sender] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      userType: users.userType,
    })
    .from(users)
    .where(eq(users.id, senderId));

  const payload = {
    ...newMsg,
    sender,
    reactions: [],
  };

  // Broadcast to Redis
  await redisPublisher.publish(
    "conclave:events",
    JSON.stringify({
      type: "message.created",
      channelId,
      parentMessageId: parentMessageId || null,
      data: payload,
    })
  );

  // If no pending invite, trigger agent in background if not sent by bot
  if (!pendingBotInvite) {
    setTimeout(() => {
      handleAgentResponse({
        workspaceId,
        channelId,
        userMessage: content,
        parentMessageId,
        senderId,
        redisPublisher,
      }).catch((err) => console.error("Agent execution error:", err));
    }, 50);
  }

  return reply.status(201).send(payload);
});

// Accept bot invite to channel (Slack first mention flow)
fastify.post<{
  Params: { channelId: string; messageId: string };
  Body: { botUserId: string; invitedByUserId: string };
}>("/api/channels/:channelId/messages/:messageId/accept-bot-invite", async (request, reply) => {
  const { channelId, messageId } = request.params;
  const { botUserId, invitedByUserId } = request.body;

  // 1. Add bot to channel
  const existing = await db
    .select()
    .from(channelMembers)
    .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, botUserId)));

  if (existing.length === 0) {
    await db.insert(channelMembers).values({
      channelId,
      userId: botUserId,
    });

    await redisPublisher.publish(
      "conclave:events",
      JSON.stringify({
        type: "channel.member_joined",
        channelId,
        userId: botUserId,
      })
    );
  }

  // 2. Fetch channel, bot, and inviter
  const [channel] = await db.select().from(channels).where(eq(channels.id, channelId));
  const [botUser] = await db.select().from(users).where(eq(users.id, botUserId));
  const [inviter] = await db.select().from(users).where(eq(users.id, invitedByUserId));

  // 3. Insert system announcement message: "<User> added @<Bot> to #<channel>."
  if (channel && botUser && inviter) {
    const [systemMsg] = await db
      .insert(messages)
      .values({
        workspaceId: channel.workspaceId,
        channelId,
        senderId: inviter.id,
        content: `added @${botUser.displayName} to #${channel.name}.`,
        metadata: { system: true },
      })
      .returning();

    await redisPublisher.publish(
      "conclave:events",
      JSON.stringify({
        type: "message.created",
        channelId,
        data: {
          ...systemMsg,
          sender: inviter,
          reactions: [],
        },
      })
    );
  }

  // 4. Clear pendingBotInvite from original message
  const [originalMsg] = await db.select().from(messages).where(eq(messages.id, messageId));
  if (originalMsg) {
    const updatedMeta = { ...(originalMsg.metadata || {}) };
    delete updatedMeta.pendingBotInvite;

    const [updatedMsg] = await db
      .update(messages)
      .set({
        metadata: updatedMeta,
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId))
      .returning();

    const [sender] = await db.select().from(users).where(eq(users.id, originalMsg.senderId));

    await redisPublisher.publish(
      "conclave:events",
      JSON.stringify({
        type: "message.updated",
        channelId,
        data: {
          ...updatedMsg,
          sender,
          reactions: [],
        },
      })
    );

    // 5. Trigger agent loop on the original message now that the bot is in the channel!
    setTimeout(() => {
      handleAgentResponse({
        workspaceId: originalMsg.workspaceId,
        channelId,
        userMessage: originalMsg.content,
        parentMessageId: originalMsg.parentMessageId,
        senderId: originalMsg.senderId,
        redisPublisher,
      }).catch((err) => console.error("Agent execution error:", err));
    }, 50);
  }

  return reply.send({ success: true });
});

// Dismiss bot invite prompt
fastify.post<{
  Params: { channelId: string; messageId: string };
}>("/api/channels/:channelId/messages/:messageId/dismiss-bot-invite", async (request, reply) => {
  const { channelId, messageId } = request.params;
  const [originalMsg] = await db.select().from(messages).where(eq(messages.id, messageId));

  if (originalMsg) {
    const updatedMeta = { ...(originalMsg.metadata || {}) };
    delete updatedMeta.pendingBotInvite;

    const [updatedMsg] = await db
      .update(messages)
      .set({
        metadata: updatedMeta,
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId))
      .returning();

    const [sender] = await db.select().from(users).where(eq(users.id, originalMsg.senderId));

    await redisPublisher.publish(
      "conclave:events",
      JSON.stringify({
        type: "message.updated",
        channelId,
        data: {
          ...updatedMsg,
          sender,
          reactions: [],
        },
      })
    );
  }

  return reply.send({ success: true });
});

// Toggle reaction
fastify.post<{
  Params: { messageId: string };
  Body: { userId: string; emoji: string; channelId: string };
}>("/api/messages/:messageId/reactions", async (request) => {
  const { userId, emoji, channelId } = request.body;
  const existing = await db
    .select()
    .from(reactions)
    .where(
      and(
        eq(reactions.messageId, request.params.messageId),
        eq(reactions.userId, userId),
        eq(reactions.emoji, emoji)
      )
    );

  if (existing.length > 0) {
    await db.delete(reactions).where(eq(reactions.id, existing[0].id));
    await redisPublisher.publish(
      "conclave:events",
      JSON.stringify({
        type: "reaction.removed",
        channelId,
        messageId: request.params.messageId,
        data: { userId, emoji },
      })
    );
    return { action: "removed", emoji };
  } else {
    const [created] = await db
      .insert(reactions)
      .values({
        messageId: request.params.messageId,
        userId,
        emoji,
      })
      .returning();
    await redisPublisher.publish(
      "conclave:events",
      JSON.stringify({
        type: "reaction.added",
        channelId,
        messageId: request.params.messageId,
        data: created,
      })
    );
    return { action: "added", reaction: created };
  }
});

// -------------------------------------------------------------
// REAL-TIME WEBSOCKET HUB
// -------------------------------------------------------------

fastify.register(async function (fastifyInstance) {
  fastifyInstance.get("/ws", { websocket: true }, (connection) => {
    const client: SocketClient = {
      ws: connection,
      subscribedChannels: new Set<string>(),
    };
    clients.add(client);

    connection.on("message", (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "channel.join") {
          client.subscribedChannels.add(msg.channelId);
          if (msg.userId) client.userId = msg.userId;
        } else if (msg.type === "channel.leave") {
          client.subscribedChannels.delete(msg.channelId);
        } else if (msg.type === "typing.set") {
          redisPublisher.publish(
            "conclave:events",
            JSON.stringify({
              type: "typing.updated",
              channelId: msg.channelId,
              data: {
                userId: client.userId,
                displayName: msg.displayName,
                isTyping: msg.isTyping,
              },
            })
          );
        }
      } catch (e) {
        console.error("Malformed websocket frame", e);
      }
    });

    connection.on("close", () => {
      clients.delete(client);
    });
  });
});

// Subscribe to Redis events and dispatch to connected websocket clients
redisSubscriber.subscribe("conclave:events", (err) => {
  if (err) console.error("Redis subscription failed", err);
  else console.log("✓ Subscribed to Redis conclave:events bus");
});

redisSubscriber.on("message", (_channel, eventString) => {
  try {
    const event = JSON.parse(eventString);
    const broadcastStr = JSON.stringify(event);

    for (const client of clients) {
      if (
        client.ws.readyState === client.ws.OPEN &&
        (!event.channelId || client.subscribedChannels.has(event.channelId))
      ) {
        client.ws.send(broadcastStr);
      }
    }
  } catch (err) {
    console.error("Error distributing event", err);
  }
});

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`🚀 Conclave API & Real-time Server listening on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
