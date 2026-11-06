export interface Sender {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  userType: "human" | "agent";
}

export interface ReactionItem {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
}

export interface MessageItem {
  id: string;
  workspaceId: string;
  channelId: string;
  senderId: string;
  content: string;
  metadata?: Record<string, any>;
  replyCount: number;
  lastReplyAt?: string | null;
  isEdited: boolean;
  createdAt: string;
  sender: Sender;
  reactions: ReactionItem[];
}

export interface ChannelItem {
  id: string;
  workspaceId: string;
  name: string;
  topic?: string | null;
  description?: string | null;
  type: "public" | "private" | "dm" | "group_dm";
}

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string | null;
  ownerId: string;
}

export interface MemberItem {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  userType: "human" | "agent";
  role: "owner" | "admin" | "member" | "guest";
}

export interface BotItem {
  id: string;
  userId: string;
  workspaceId: string;
  createdById: string;
  name: string;
  handle: string;
  description?: string | null;
  systemPrompt?: string | null;
  engine: "agy" | "claude";
  avatarLabel?: string;
  channelIds: string[];
  user: Sender;
  createdAt: string;
}

const API_BASE = "/api";

export const api = {
  async getWorkspaces(): Promise<WorkspaceItem[]> {
    const res = await fetch(`${API_BASE}/workspaces`);
    if (!res.ok) throw new Error("Failed to load workspaces");
    return res.json();
  },

  async getChannels(workspaceId: string): Promise<ChannelItem[]> {
    const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/channels`);
    if (!res.ok) throw new Error("Failed to load channels");
    return res.json();
  },

  async getMembers(workspaceId: string): Promise<MemberItem[]> {
    const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/members`);
    if (!res.ok) throw new Error("Failed to load members");
    return res.json();
  },

  async getBots(workspaceId: string): Promise<BotItem[]> {
    const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/bots`);
    if (!res.ok) throw new Error("Failed to load bots");
    return res.json();
  },

  async createBot(
    workspaceId: string,
    body: {
      name: string;
      handle: string;
      description?: string;
      systemPrompt?: string;
      engine?: string;
      channelIds?: string[];
      ownerId: string;
    }
  ): Promise<BotItem> {
    const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/bots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to create bot");
    return res.json();
  },

  async getChannelMembers(channelId: string): Promise<Sender[]> {
    const res = await fetch(`${API_BASE}/channels/${channelId}/members`);
    if (!res.ok) throw new Error("Failed to load channel members");
    return res.json();
  },

  async addChannelMember(channelId: string, userId: string) {
    const res = await fetch(`${API_BASE}/channels/${channelId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error("Failed to add member to channel");
    return res.json();
  },

  async removeChannelMember(channelId: string, userId: string) {
    const res = await fetch(`${API_BASE}/channels/${channelId}/members/${userId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to remove member from channel");
    return res.json();
  },

  async acceptBotInvite(
    channelId: string,
    messageId: string,
    body: { botUserId: string; invitedByUserId: string }
  ) {
    const res = await fetch(
      `${API_BASE}/channels/${channelId}/messages/${messageId}/accept-bot-invite`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) throw new Error("Failed to accept bot invite");
    return res.json();
  },

  async dismissBotInvite(channelId: string, messageId: string) {
    const res = await fetch(
      `${API_BASE}/channels/${channelId}/messages/${messageId}/dismiss-bot-invite`,
      {
        method: "POST",
      }
    );
    if (!res.ok) throw new Error("Failed to dismiss bot invite");
    return res.json();
  },

  async getMessages(channelId: string): Promise<MessageItem[]> {
    const res = await fetch(`${API_BASE}/channels/${channelId}/messages`);
    if (!res.ok) throw new Error("Failed to load messages");
    return res.json();
  },

  async getThreadReplies(messageId: string): Promise<MessageItem[]> {
    const res = await fetch(`${API_BASE}/messages/${messageId}/thread`);
    if (!res.ok) throw new Error("Failed to load thread");
    return res.json();
  },

  async sendMessage(
    channelId: string,
    body: { workspaceId: string; senderId: string; content: string; parentMessageId?: string }
  ): Promise<MessageItem> {
    const res = await fetch(`${API_BASE}/channels/${channelId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to send message");
    return res.json();
  },

  async toggleReaction(
    messageId: string,
    body: { userId: string; emoji: string; channelId: string }
  ) {
    const res = await fetch(`${API_BASE}/messages/${messageId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to toggle reaction");
    return res.json();
  },
};
