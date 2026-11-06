import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Redis from "ioredis";
import { db, users, workspaces, channels, messages, reactions, channelMembers, workspaceMembers } from "@conclave/db";
import { eq, and, isNull, desc, asc } from "drizzle-orm";
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

  const [newMsg] = await db
    .insert(messages)
    .values({
      workspaceId,
      channelId: request.params.channelId,
      senderId,
      content,
      parentMessageId: parentMessageId || null,
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
      channelId: request.params.channelId,
      parentMessageId: parentMessageId || null,
      data: payload,
    })
  );

  // Trigger agent in background if not sent by bot
  setTimeout(() => {
    handleAgentResponse({
      workspaceId,
      channelId: request.params.channelId,
      userMessage: content,
      parentMessageId,
      senderId,
      redisPublisher,
    }).catch((err) => console.error("Agent execution error:", err));
  }, 50);

  return reply.status(201).send(payload);
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
