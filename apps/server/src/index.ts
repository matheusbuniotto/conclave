import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Redis from "ioredis";
import {
  db,
  users,
  workspaces,
  channels,
  messages,
  reactions,
  channelMembers,
  workspaceMembers,
  bots,
  workspaceApps,
  appVersions,
  feedItems,
  vaultSecrets,
  vaultAuditLogs,
  wikiPages,
  machines,
} from "@conclave/db";
import { eq, and, isNull, desc, asc, inArray } from "drizzle-orm";
import type { WebSocket } from "ws";
import { handleAgentResponse, stopActiveChannelTurn } from "./agent";
import { registerAppKitRoutes } from "./app-kit";

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

// Real-time presence map (userId -> lastHeartbeatMs)
const presenceHeartbeats = new Map<string, number>();

await fastify.register(cors, {
  origin: true,
  credentials: true,
});

await fastify.register(websocket);

// Register Conclave App Kit (/_conclave/*, /_laze/*, /api/apps/:slug/render, /api/apps/:slug/records/*)
registerAppKitRoutes(fastify, redisPublisher);

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
      .where(eq(channels.workspaceId, request.params.workspaceId))
      .orderBy(asc(channels.createdAt));
  }
);

// Create a new channel in a workspace
fastify.post<{
  Params: { workspaceId: string };
  Body: { name: string; topic?: string; type?: "public" | "private"; createdById: string };
}>("/api/workspaces/:workspaceId/channels", async (request, reply) => {
  const { workspaceId } = request.params;
  const { name, topic, type = "public", createdById } = request.body;
  const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");

  const [newChannel] = await db
    .insert(channels)
    .values({
      workspaceId,
      name: cleanName,
      topic: topic || null,
      type,
      createdById,
    })
    .returning();

  // Add all human workspace members to public channel
  const members = await db
    .select()
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  for (const m of members) {
    if (m.users.userType === "human") {
      await db.insert(channelMembers).values({
        channelId: newChannel.id,
        userId: m.users.id,
        listenMode: "mention",
      });
    }
  }

  await redisPublisher.publish(
    "conclave:events",
    JSON.stringify({
      type: "channel.created",
      workspaceId,
      data: newChannel,
    })
  );

  return reply.status(201).send(newChannel);
});

// List workspace members
fastify.get<{ Params: { workspaceId: string } }>(
  "/api/workspaces/:workspaceId/members",
  async (request) => {
    const rows = await db
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

    const now = Date.now();
    return rows.map((r) => ({
      ...r,
      online: r.userType === "agent" || !presenceHeartbeats.has(r.id) || now - (presenceHeartbeats.get(r.id) || 0) < 180000,
    }));
  }
);

// List workspace bots (with assigned channels, listenModes, and skills)
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
        connectionMode: bots.connectionMode,
        skills: bots.skills,
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
            listenMode: channelMembers.listenMode,
          })
          .from(channelMembers)
          .where(inArray(channelMembers.userId, botUserIds))
      : [];

    return workspaceBots.map((b) => {
      const botMemberships = memberships.filter((m) => m.userId === b.userId);
      const listenModes: Record<string, "mention" | "all"> = {};
      for (const m of botMemberships) {
        listenModes[m.channelId] = (m.listenMode as "mention" | "all") || "mention";
      }
      return {
        ...b,
        channelIds: botMemberships.map((m) => m.channelId),
        listenModes,
      };
    });
  }
);

// Create a new bot for the workspace
fastify.post<{
  Params: { workspaceId: string };
  Body: {
    name: string;
    handle: string;
    description?: string;
    systemPrompt?: string;
    engine?: string;
    avatarLabel?: string;
    connectionMode?: string;
    channelIds?: string[];
    skills?: Array<{ name: string; description: string; prompt?: string }>;
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
    connectionMode = "sandbox",
    channelIds = [],
    skills = [],
    ownerId,
  } = request.body;

  const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");

  const [botUser] = await db
    .insert(users)
    .values({
      email: `${cleanHandle}-${Date.now()}@bot.conclave.local`,
      displayName: name,
      avatarUrl: `face:${avatarLabel}`,
      userType: "agent",
    })
    .returning();

  await db.insert(workspaceMembers).values({
    workspaceId,
    userId: botUser.id,
    role: "member",
  });

  if (channelIds.length > 0) {
    for (const chId of channelIds) {
      await db.insert(channelMembers).values({
        channelId: chId,
        userId: botUser.id,
        listenMode: "mention",
      });
    }
  }

  const defaultSkills =
    skills.length > 0
      ? skills
      : [
          {
            name: "status",
            description: `Ask @${cleanHandle} for a quick status summary`,
            prompt: `@${cleanHandle} Give us a concise status update.`,
          },
          {
            name: "build-app",
            description: `Ask @${cleanHandle} to build a side-by-side interactive tool`,
            prompt: `@${cleanHandle} Build an interactive tracker app for this channel.`,
          },
        ];

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
      connectionMode,
      skills: defaultSkills,
    })
    .returning();

  await redisPublisher.publish(
    "conclave:events",
    JSON.stringify({
      type: "bot.created",
      workspaceId,
      data: {
        ...newBot,
        channelIds,
        listenModes: Object.fromEntries(channelIds.map((id) => [id, "mention"])),
        user: botUser,
      },
    })
  );

  return reply.status(201).send({
    ...newBot,
    channelIds,
    listenModes: Object.fromEntries(channelIds.map((id) => [id, "mention"])),
    user: botUser,
  });
});

// List members of a channel (humans and bots, with listenMode)
fastify.get<{ Params: { channelId: string } }>(
  "/api/channels/:channelId/members",
  async (request) => {
    return await db
      .select({
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        userType: users.userType,
        listenMode: channelMembers.listenMode,
        joinedAt: channelMembers.joinedAt,
      })
      .from(channelMembers)
      .innerJoin(users, eq(channelMembers.userId, users.id))
      .where(eq(channelMembers.channelId, request.params.channelId));
  }
);

// Add a member or bot to a channel (or update its listenMode)
fastify.post<{
  Params: { channelId: string };
  Body: { userId: string; listenMode?: "mention" | "all" };
}>("/api/channels/:channelId/members", async (request, reply) => {
  const { channelId } = request.params;
  const { userId, listenMode = "mention" } = request.body;

  const existing = await db
    .select()
    .from(channelMembers)
    .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, userId)));

  if (existing.length === 0) {
    await db.insert(channelMembers).values({
      channelId,
      userId,
      listenMode,
    });
  } else {
    await db
      .update(channelMembers)
      .set({ listenMode })
      .where(eq(channelMembers.id, existing[0].id));
  }

  await redisPublisher.publish(
    "conclave:events",
    JSON.stringify({
      type: "channel.member_joined",
      channelId,
      userId,
      listenMode,
    })
  );

  return reply.send({ success: true, channelId, userId, listenMode });
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

// Stop active agent turn in a channel (Laze /stop button)
fastify.post<{ Params: { channelId: string } }>(
  "/api/channels/:channelId/stop-turn",
  async (request, reply) => {
    const { channelId } = request.params;
    const res = stopActiveChannelTurn(channelId);
    if (res.stopped && res.messageId) {
      await db
        .update(messages)
        .set({
          content: `⏹️ Turn stopped by teammate.`,
          metadata: { status: "stopped" },
          updatedAt: new Date(),
        })
        .where(eq(messages.id, res.messageId));

      await redisPublisher.publish(
        "conclave:events",
        JSON.stringify({
          type: "message.updated",
          channelId,
          data: { id: res.messageId },
        })
      );
    }
    return reply.send(res);
  }
);

// Generate on-demand AI Catch-Up Summary for a channel (Laze Catch-Up card)
fastify.post<{ Params: { channelId: string } }>(
  "/api/channels/:channelId/catch-up",
  async (request) => {
    const { channelId } = request.params;
    const [ch] = await db.select().from(channels).where(eq(channels.id, channelId));
    const recent = await db
      .select({
        content: messages.content,
        senderName: users.displayName,
        userType: users.userType,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(and(eq(messages.channelId, channelId), isNull(messages.deletedAt)))
      .orderBy(desc(messages.createdAt))
      .limit(10);

    const bullets = recent
      .reverse()
      .map((m) => `• **${m.senderName}**: ${m.content.replace(/\n+/g, " ").slice(0, 110)}${m.content.length > 110 ? "…" : ""}`);

    return {
      channelId,
      channelName: ch?.name || "channel",
      messageCount: recent.length,
      summary:
        bullets.length > 0
          ? bullets.join("\n")
          : "No unread activity to summarize in this channel yet.",
      generatedAt: new Date().toISOString(),
    };
  }
);

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

// Get all active threads across the workspace (Laze Unified Threads View)
fastify.get<{ Params: { workspaceId: string } }>(
  "/api/workspaces/:workspaceId/threads",
  async (request) => {
    const roots = await db
      .select({
        id: messages.id,
        workspaceId: messages.workspaceId,
        channelId: messages.channelId,
        senderId: messages.senderId,
        content: messages.content,
        metadata: messages.metadata,
        replyCount: messages.replyCount,
        lastReplyAt: messages.lastReplyAt,
        createdAt: messages.createdAt,
        channelName: channels.name,
        sender: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          userType: users.userType,
        },
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .innerJoin(channels, eq(messages.channelId, channels.id))
      .where(
        and(
          eq(messages.workspaceId, request.params.workspaceId),
          isNull(messages.parentMessageId),
          isNull(messages.deletedAt)
        )
      )
      .orderBy(desc(messages.createdAt));

    const activeRoots = roots.filter((r) => r.replyCount > 0);
    const result = [];
    for (const root of activeRoots) {
      const replies = await db
        .select({
          id: messages.id,
          content: messages.content,
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
        .where(and(eq(messages.parentMessageId, root.id), isNull(messages.deletedAt)))
        .orderBy(asc(messages.createdAt));

      result.push({
        ...root,
        replies,
      });
    }
    return result;
  }
);

// Get thread replies for a root message
fastify.get<{ Params: { messageId: string } }>(
  "/api/messages/:messageId/thread",
  async (request) => {
    return await db
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
  }
);

// Resolve an inline Attention Card (Approval / Question / External Draft) on a message
fastify.post<{
  Params: { messageId: string };
  Body: {
    action: "allowed" | "denied" | "answered" | "sent" | "dismissed";
    decidedByName: string;
    decidedById?: string;
    note?: string;
    selectedOption?: string;
    editedDraft?: string;
  };
}>("/api/messages/:messageId/attention", async (request, reply) => {
  const { messageId } = request.params;
  const { action, decidedByName, decidedById, note, selectedOption, editedDraft } = request.body;

  const [msg] = await db.select().from(messages).where(eq(messages.id, messageId));
  if (!msg) return reply.status(404).send({ error: "Message not found" });

  const meta = { ...(msg.metadata || {}) } as Record<string, any>;
  if (meta.attention) {
    meta.attention = {
      ...meta.attention,
      status: action,
      decidedByName,
      decidedAt: new Date().toISOString(),
      note,
      selectedOption,
      draftBody: editedDraft || meta.attention.draftBody,
    };
  }

  const [updatedMsg] = await db
    .update(messages)
    .set({ metadata: meta, updatedAt: new Date() })
    .where(eq(messages.id, messageId))
    .returning();

  // Also sync any linked Feed item
  await db
    .update(feedItems)
    .set({
      status: action,
      decidedById: decidedById || null,
      decidedAt: new Date(),
      resolution: { decidedByName, note, selectedOption },
    })
    .where(eq(feedItems.messageId, messageId));

  const [sender] = await db.select().from(users).where(eq(users.id, msg.senderId));

  await redisPublisher.publish(
    "conclave:events",
    JSON.stringify({
      type: "message.updated",
      channelId: msg.channelId,
      data: {
        ...updatedMsg,
        sender,
        reactions: [],
      },
    })
  );

  await redisPublisher.publish(
    "conclave:events",
    JSON.stringify({
      type: "feed.updated",
      workspaceId: msg.workspaceId,
    })
  );

  return { success: true, message: updatedMsg };
});

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
    const handleRegex = new RegExp(`@(${b.handle}|${b.name.replace(/\s+/g, "")})`, "i");
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

  await redisPublisher.publish(
    "conclave:events",
    JSON.stringify({
      type: "message.created",
      channelId,
      parentMessageId: parentMessageId || null,
      data: payload,
    })
  );

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

// Accept bot invite to channel (with listenMode selection)
fastify.post<{
  Params: { channelId: string; messageId: string };
  Body: { botUserId: string; invitedByUserId: string; listenMode?: "mention" | "all" };
}>("/api/channels/:channelId/messages/:messageId/accept-bot-invite", async (request, reply) => {
  const { channelId, messageId } = request.params;
  const { botUserId, invitedByUserId, listenMode = "mention" } = request.body;

  const existing = await db
    .select()
    .from(channelMembers)
    .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, botUserId)));

  if (existing.length === 0) {
    await db.insert(channelMembers).values({
      channelId,
      userId: botUserId,
      listenMode,
    });

    await redisPublisher.publish(
      "conclave:events",
      JSON.stringify({
        type: "channel.member_joined",
        channelId,
        userId: botUserId,
        listenMode,
      })
    );
  }

  const [channel] = await db.select().from(channels).where(eq(channels.id, channelId));
  const [botUser] = await db.select().from(users).where(eq(users.id, botUserId));
  const [inviter] = await db.select().from(users).where(eq(users.id, invitedByUserId));

  if (channel && botUser && inviter) {
    const [systemMsg] = await db
      .insert(messages)
      .values({
        workspaceId: channel.workspaceId,
        channelId,
        senderId: inviter.id,
        content: `added @${botUser.displayName} to #${channel.name} (${listenMode === "all" ? "listens to every message" : "when @mentioned"}).`,
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
// WORKSPACE APPS, VERSION HISTORY, REVERT & PINNING ROUTES
// -------------------------------------------------------------

fastify.get<{ Params: { workspaceId: string } }>(
  "/api/workspaces/:workspaceId/apps",
  async (request) => {
    const apps = await db
      .select()
      .from(workspaceApps)
      .where(eq(workspaceApps.workspaceId, request.params.workspaceId))
      .orderBy(desc(workspaceApps.updatedAt));

    const result = [];
    for (const app of apps) {
      const versions = await db
        .select({
          id: appVersions.id,
          version: appVersions.version,
          summary: appVersions.summary,
          createdAt: appVersions.createdAt,
        })
        .from(appVersions)
        .where(eq(appVersions.appId, app.id))
        .orderBy(desc(appVersions.version));

      result.push({
        ...app,
        versions,
      });
    }
    return result;
  }
);

fastify.post<{
  Params: { appId: string };
  Body: { version: number };
}>("/api/apps/:appId/revert", async (request, reply) => {
  const { appId } = request.params;
  const { version } = request.body;

  const [updated] = await db
    .update(workspaceApps)
    .set({ currentVersion: version, updatedAt: new Date() })
    .where(eq(workspaceApps.id, appId))
    .returning();

  if (!updated) return reply.status(404).send({ error: "App not found" });

  await redisPublisher.publish(
    "conclave:events",
    JSON.stringify({
      type: "app.updated",
      workspaceId: updated.workspaceId,
      channelId: updated.channelId,
      data: updated,
    })
  );

  return updated;
});

fastify.patch<{
  Params: { appId: string };
  Body: { isPinned?: boolean; accessLevel?: string; status?: string };
}>("/api/apps/:appId", async (request, reply) => {
  const { appId } = request.params;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (request.body.isPinned !== undefined) patch.isPinned = request.body.isPinned;
  if (request.body.accessLevel !== undefined) patch.accessLevel = request.body.accessLevel;
  if (request.body.status !== undefined) patch.status = request.body.status;

  const [updated] = await db
    .update(workspaceApps)
    .set(patch)
    .where(eq(workspaceApps.id, appId))
    .returning();

  if (!updated) return reply.status(404).send({ error: "App not found" });

  await redisPublisher.publish(
    "conclave:events",
    JSON.stringify({
      type: "app.updated",
      workspaceId: updated.workspaceId,
      channelId: updated.channelId,
      data: updated,
    })
  );

  return updated;
});

// -------------------------------------------------------------
// PERSONAL TRIAGE FEED ROUTES (Laze Feed & External Comms Guardrail)
// -------------------------------------------------------------

fastify.get<{ Params: { workspaceId: string } }>(
  "/api/workspaces/:workspaceId/feed",
  async (request) => {
    const items = await db
      .select()
      .from(feedItems)
      .where(eq(feedItems.workspaceId, request.params.workspaceId))
      .orderBy(desc(feedItems.createdAt));

    return items;
  }
);

fastify.post<{
  Params: { feedId: string };
  Body: {
    status: "allowed" | "denied" | "sent" | "dismissed" | "pending";
    decidedById?: string;
    decidedByName?: string;
    note?: string;
    draftBody?: string;
  };
}>("/api/feed/:feedId/resolve", async (request, reply) => {
  const { feedId } = request.params;
  const { status, decidedById, decidedByName, note, draftBody } = request.body;

  const [item] = await db.select().from(feedItems).where(eq(feedItems.id, feedId));
  if (!item) return reply.status(404).send({ error: "Feed item not found" });

  const [updated] = await db
    .update(feedItems)
    .set({
      status,
      draftBody: draftBody !== undefined ? draftBody : item.draftBody,
      decidedById: decidedById || null,
      decidedAt: status === "pending" ? null : new Date(),
      resolution: { decidedByName, note },
    })
    .where(eq(feedItems.id, feedId))
    .returning();

  // If linked to a chat message, also update its inline Attention Card
  if (item.messageId) {
    const [msg] = await db.select().from(messages).where(eq(messages.id, item.messageId));
    if (msg) {
      const meta = { ...(msg.metadata || {}) } as Record<string, any>;
      if (meta.attention) {
        meta.attention = {
          ...meta.attention,
          status,
          decidedByName,
          note,
          draftBody: draftBody !== undefined ? draftBody : meta.attention.draftBody,
        };
        await db.update(messages).set({ metadata: meta, updatedAt: new Date() }).where(eq(messages.id, msg.id));
        await redisPublisher.publish(
          "conclave:events",
          JSON.stringify({ type: "message.updated", channelId: msg.channelId, data: { id: msg.id } })
        );
      }
    }
  }

  await redisPublisher.publish(
    "conclave:events",
    JSON.stringify({
      type: "feed.updated",
      workspaceId: item.workspaceId,
    })
  );

  return updated;
});

// -------------------------------------------------------------
// VAULT SECRETS & EGRESS PROXY AUDIT LOG ROUTES
// -------------------------------------------------------------

fastify.get<{ Params: { workspaceId: string } }>(
  "/api/workspaces/:workspaceId/vault",
  async (request) => {
    const secrets = await db
      .select()
      .from(vaultSecrets)
      .where(eq(vaultSecrets.workspaceId, request.params.workspaceId))
      .orderBy(asc(vaultSecrets.createdAt));

    const logs = await db
      .select()
      .from(vaultAuditLogs)
      .where(eq(vaultAuditLogs.workspaceId, request.params.workspaceId))
      .orderBy(desc(vaultAuditLogs.createdAt))
      .limit(25);

    return { secrets, logs };
  }
);

fastify.post<{
  Params: { workspaceId: string };
  Body: {
    name: string;
    provider: string;
    accessLevel: "auto" | "checked" | "ask" | "human_only";
    secretValue: string;
    description?: string;
    createdById?: string;
  };
}>("/api/workspaces/:workspaceId/vault", async (request, reply) => {
  const { workspaceId } = request.params;
  const { name, provider, accessLevel, secretValue, description, createdById } = request.body;
  const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const maskedValue = `{{vault:${cleanName}_${secretValue.slice(0, 3)}...}}`;

  const [created] = await db
    .insert(vaultSecrets)
    .values({
      workspaceId,
      name: cleanName,
      provider,
      accessLevel,
      maskedValue,
      description: description || null,
      createdById: createdById || null,
    })
    .returning();

  return reply.status(201).send(created);
});

fastify.patch<{
  Params: { secretId: string };
  Body: { accessLevel: "auto" | "checked" | "ask" | "human_only" };
}>("/api/vault/:secretId", async (request, reply) => {
  const { secretId } = request.params;
  const [updated] = await db
    .update(vaultSecrets)
    .set({ accessLevel: request.body.accessLevel })
    .where(eq(vaultSecrets.id, secretId))
    .returning();

  if (!updated) return reply.status(404).send({ error: "Secret not found" });
  return updated;
});

fastify.post<{
  Params: { secretId: string };
  Body: { actorName: string; reason: string; targetEndpoint: string };
}>("/api/vault/:secretId/simulate", async (request, reply) => {
  const { secretId } = request.params;
  const { actorName, reason, targetEndpoint } = request.body;

  const [secret] = await db.select().from(vaultSecrets).where(eq(vaultSecrets.id, secretId));
  if (!secret) return reply.status(404).send({ error: "Secret not found" });

  const status = secret.accessLevel === "auto" || secret.accessLevel === "checked" ? "allowed" : "pending_approval";
  const action = status === "allowed" ? "proxy_injected" : "awaiting_approval";

  await db
    .update(vaultSecrets)
    .set({ usageCount: (secret.usageCount || 0) + 1, lastUsedAt: new Date() })
    .where(eq(vaultSecrets.id, secretId));

  const [log] = await db
    .insert(vaultAuditLogs)
    .values({
      workspaceId: secret.workspaceId,
      secretId: secret.id,
      actorName,
      actorType: "agent",
      action,
      reason,
      targetEndpoint,
      status,
    })
    .returning();

  return { secret, log };
});

// -------------------------------------------------------------
// MEMORY & WORKSPACE WIKI ROUTES (SOUL.md, AGENTS.md, MEMORY.md & Wiki)
// -------------------------------------------------------------

fastify.get<{ Params: { workspaceId: string } }>(
  "/api/workspaces/:workspaceId/wiki",
  async (request) => {
    return await db
      .select()
      .from(wikiPages)
      .where(eq(wikiPages.workspaceId, request.params.workspaceId))
      .orderBy(asc(wikiPages.path));
  }
);

fastify.post<{
  Params: { workspaceId: string };
  Body: { path: string; title: string; content: string; updatedById?: string };
}>("/api/workspaces/:workspaceId/wiki", async (request) => {
  const { workspaceId } = request.params;
  const { path, title, content, updatedById } = request.body;

  const existing = await db
    .select()
    .from(wikiPages)
    .where(and(eq(wikiPages.workspaceId, workspaceId), eq(wikiPages.path, path)));

  if (existing.length > 0) {
    const [updated] = await db
      .update(wikiPages)
      .set({
        title,
        content,
        version: (existing[0].version || 1) + 1,
        updatedById: updatedById || null,
        updatedAt: new Date(),
      })
      .where(eq(wikiPages.id, existing[0].id))
      .returning();
    return updated;
  } else {
    const [created] = await db
      .insert(wikiPages)
      .values({
        workspaceId,
        path,
        title,
        content,
        version: 1,
        updatedById: updatedById || null,
      })
      .returning();
    return created;
  }
});

// -------------------------------------------------------------
// MACHINES & BROWSER HANDOFF ROUTES
// -------------------------------------------------------------

fastify.get<{ Params: { workspaceId: string } }>(
  "/api/workspaces/:workspaceId/machines",
  async (request) => {
    return await db
      .select()
      .from(machines)
      .where(eq(machines.workspaceId, request.params.workspaceId))
      .orderBy(asc(machines.createdAt));
  }
);

fastify.post<{
  Params: { machineId: string };
  Body: { action: "complete_handoff" | "request_handoff"; reason?: string };
}>("/api/machines/:machineId/handoff", async (request, reply) => {
  const { machineId } = request.params;
  const { action, reason } = request.body;

  const [machine] = await db.select().from(machines).where(eq(machines.id, machineId));
  if (!machine) return reply.status(404).send({ error: "Machine not found" });

  const isCompleting = action === "complete_handoff";
  const [updated] = await db
    .update(machines)
    .set({
      status: isCompleting ? "driving" : "handoff",
      handoffRequested: !isCompleting,
      handoffReason: isCompleting ? null : reason || "Sign-in verification requested on live browser screen.",
      updatedAt: new Date(),
    })
    .where(eq(machines.id, machineId))
    .returning();

  await redisPublisher.publish(
    "conclave:events",
    JSON.stringify({
      type: "machine.updated",
      workspaceId: machine.workspaceId,
      data: updated,
    })
  );

  return updated;
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
          if (msg.userId) {
            client.userId = msg.userId;
            presenceHeartbeats.set(msg.userId, Date.now());
          }
        } else if (msg.type === "channel.leave") {
          client.subscribedChannels.delete(msg.channelId);
        } else if (msg.type === "presence.heartbeat") {
          if (msg.userId) {
            client.userId = msg.userId;
            presenceHeartbeats.set(msg.userId, Date.now());
          }
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
