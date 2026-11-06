import { db, users, workspaces, workspaceMembers, channels, channelMembers, messages, reactions, bots } from "./index";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  // 1. Clean up existing data
  await db.delete(reactions);
  await db.delete(messages);
  await db.delete(bots);
  await db.delete(channelMembers);
  await db.delete(channels);
  await db.delete(workspaceMembers);
  await db.delete(workspaces);
  await db.delete(users);

  // 2. Insert Users
  const [alice] = await db
    .insert(users)
    .values({
      email: "alice@conclave.local",
      displayName: "Alice Vance",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
      userType: "human",
    })
    .returning();

  const [bob] = await db
    .insert(users)
    .values({
      email: "bob@conclave.local",
      displayName: "Bob Stone",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
      userType: "human",
    })
    .returning();

  const [agent] = await db
    .insert(users)
    .values({
      email: "agent@conclave.local",
      displayName: "Conclave Assistant",
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=ConclaveBot",
      userType: "agent",
    })
    .returning();

  console.log(`✓ Created 3 users: Alice, Bob, and Conclave Assistant (Agent)`);

  // 3. Insert Workspace
  const [acme] = await db
    .insert(workspaces)
    .values({
      name: "Acme Corp",
      slug: "acme",
      iconUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=Acme",
      ownerId: alice.id,
    })
    .returning();

  // 4. Add Members to Workspace
  await db.insert(workspaceMembers).values([
    { workspaceId: acme.id, userId: alice.id, role: "owner" },
    { workspaceId: acme.id, userId: bob.id, role: "member" },
    { workspaceId: acme.id, userId: agent.id, role: "member" },
  ]);

  console.log(`✓ Created workspace "Acme Corp" with 3 members`);

  // 5. Create Channels
  const [general] = await db
    .insert(channels)
    .values({
      workspaceId: acme.id,
      name: "general",
      topic: "Company-wide announcements and chat",
      description: "Default channel for all workspace members",
      type: "public",
      createdById: alice.id,
    })
    .returning();

  const [engineering] = await db
    .insert(channels)
    .values({
      workspaceId: acme.id,
      name: "engineering",
      topic: "Engineering discussions, architecture & code reviews",
      description: "Everything tech & infrastructure",
      type: "public",
      createdById: alice.id,
    })
    .returning();

  const [randomChannel] = await db
    .insert(channels)
    .values({
      workspaceId: acme.id,
      name: "random",
      topic: "Non-work banter and fun water-cooler chat",
      description: "Coffee breaks and memes",
      type: "public",
      createdById: bob.id,
    })
    .returning();

  // Add members to channels
  for (const ch of [general, engineering, randomChannel]) {
    await db.insert(channelMembers).values([
      { channelId: ch.id, userId: alice.id },
      { channelId: ch.id, userId: bob.id },
      { channelId: ch.id, userId: agent.id },
    ]);
  }

  console.log(`✓ Created channels: #general, #engineering, #random`);

  // 6. Seed sample messages in #general
  const [welcomeMsg] = await db
    .insert(messages)
    .values({
      workspaceId: acme.id,
      channelId: general.id,
      senderId: alice.id,
      content: "Welcome to **Conclave**! 👋 The open-source AI-native workspace.",
      replyCount: 2,
    })
    .returning();

  await db.insert(messages).values([
    {
      workspaceId: acme.id,
      channelId: general.id,
      senderId: bob.id,
      parentMessageId: welcomeMsg.id,
      content: "Excited to be here! The Slack clone layout feels super snappy.",
    },
    {
      workspaceId: acme.id,
      channelId: general.id,
      senderId: agent.id,
      parentMessageId: welcomeMsg.id,
      content: "Hello everyone! I'm your Conclave AI agent. You can mention me or ask me to build internal tools.",
    },
  ]);

  // Seed reactions
  await db.insert(reactions).values([
    { messageId: welcomeMsg.id, userId: bob.id, emoji: "🚀" },
    { messageId: welcomeMsg.id, userId: agent.id, emoji: "🎉" },
  ]);

  console.log("✅ Seed completed successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
