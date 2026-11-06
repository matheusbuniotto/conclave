export interface Sender {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  userType: "human" | "agent";
  listenMode?: "mention" | "all";
}

export interface ReactionItem {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
}

export interface LiveStepItem {
  id?: string;
  kind: "tool" | "subagent" | "shell";
  label: string;
  detail?: string;
  task?: string;
  status: "running" | "done" | "failed";
  duration?: string;
  stepsCount?: number;
}

export interface AttentionCardPayload {
  id: string;
  kind: "approval" | "question" | "draft";
  status: "pending" | "allowed" | "denied" | "answered" | "sent" | "dismissed";
  title: string;
  summary?: string;
  commandLine?: string;
  judgeLine?: string;
  draftHeader?: string;
  draftBody?: string;
  options?: Array<{ id: string; label: string; description?: string }>;
  deciders?: string[];
  decidedByName?: string;
  decidedAt?: string;
  note?: string;
  selectedOption?: string;
}

export interface MessageItem {
  id: string;
  workspaceId: string;
  channelId: string;
  senderId: string;
  content: string;
  metadata?: {
    system?: boolean;
    status?: "thinking" | "stopped" | "done";
    error?: boolean;
    type?: "interactive_app";
    appId?: string;
    appSlug?: string;
    appTitle?: string;
    appUrl?: string;
    containerPort?: number;
    version?: number;
    engine?: string;
    duration?: string;
    steps?: LiveStepItem[];
    attention?: AttentionCardPayload;
    pendingBotInvite?: {
      botId: string;
      userId: string;
      name: string;
      handle: string;
      avatarLabel?: string;
    };
    [key: string]: any;
  };
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
  online?: boolean;
}

export interface BotSkillItem {
  name: string;
  description: string;
  prompt?: string;
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
  connectionMode?: "sandbox" | "cli" | "mcp";
  skills?: BotSkillItem[];
  channelIds: string[];
  listenModes?: Record<string, "mention" | "all">;
  user: Sender;
  createdAt: string;
}

export interface AppVersionItem {
  id: string;
  version: number;
  summary: string;
  createdAt: string;
}

export interface WorkspaceAppItem {
  id: string;
  workspaceId: string;
  channelId?: string | null;
  botId?: string | null;
  slug: string;
  title: string;
  description?: string | null;
  icon: string;
  status: "draft" | "published";
  accessLevel: "restricted" | "workspace" | "public";
  isPinned: boolean;
  currentVersion: number;
  appUrl: string;
  containerPort?: number;
  sandboxId?: string;
  versions: AppVersionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface FeedItem {
  id: string;
  workspaceId: string;
  channelId?: string | null;
  messageId?: string | null;
  botId?: string | null;
  targetUserId?: string | null;
  kind: "approval" | "question" | "draft" | "alert";
  priority: "urgent" | "high" | "normal" | "low";
  title: string;
  summary?: string | null;
  commandLine?: string | null;
  draftHeader?: string | null;
  draftBody?: string | null;
  options?: Array<{ id: string; label: string; description?: string }>;
  status: "pending" | "allowed" | "denied" | "answered" | "sent" | "dismissed";
  resolution?: {
    decidedByName?: string;
    note?: string;
    selectedOption?: string;
  };
  decidedById?: string | null;
  decidedAt?: string | null;
  createdAt: string;
}

export interface VaultSecretItem {
  id: string;
  workspaceId: string;
  name: string;
  provider: string;
  accessLevel: "auto" | "checked" | "ask" | "human_only";
  maskedValue: string;
  description?: string | null;
  lastUsedAt?: string | null;
  usageCount: number;
  createdAt: string;
}

export interface VaultAuditLogItem {
  id: string;
  workspaceId: string;
  secretId: string;
  actorName: string;
  actorType: string;
  action: string;
  reason: string;
  targetEndpoint?: string | null;
  status: string;
  createdAt: string;
}

export interface WikiPageItem {
  id: string;
  workspaceId: string;
  path: string;
  title: string;
  content: string;
  version: number;
  updatedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MachineItem {
  id: string;
  workspaceId: string;
  name: string;
  kind: "cloud_computer" | "browser_machine" | "local_host";
  region: string;
  specs: string;
  ipAddress: string;
  status: "online" | "driving" | "handoff" | "sleeping";
  activeAgentName?: string | null;
  currentUrl?: string | null;
  handoffRequested: boolean;
  handoffReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadFeedItem extends MessageItem {
  channelName: string;
  replies: Array<{
    id: string;
    content: string;
    createdAt: string;
    sender: Sender;
  }>;
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

  async createChannel(
    workspaceId: string,
    body: { name: string; topic?: string; type?: "public" | "private"; createdById: string }
  ): Promise<ChannelItem> {
    const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/channels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to create channel");
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
      avatarLabel?: string;
      connectionMode?: string;
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

  async addChannelMember(channelId: string, userId: string, listenMode: "mention" | "all" = "mention") {
    const res = await fetch(`${API_BASE}/channels/${channelId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, listenMode }),
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

  async stopChannelTurn(channelId: string) {
    const res = await fetch(`${API_BASE}/channels/${channelId}/stop-turn`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to stop turn");
    return res.json();
  },

  async getChannelCatchUp(channelId: string): Promise<{
    channelId: string;
    channelName: string;
    messageCount: number;
    summary: string;
    generatedAt: string;
  }> {
    const res = await fetch(`${API_BASE}/channels/${channelId}/catch-up`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to generate catch-up summary");
    return res.json();
  },

  async acceptBotInvite(
    channelId: string,
    messageId: string,
    body: { botUserId: string; invitedByUserId: string; listenMode?: "mention" | "all" }
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

  async getWorkspaceThreads(workspaceId: string): Promise<ThreadFeedItem[]> {
    const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/threads`);
    if (!res.ok) throw new Error("Failed to load threads");
    return res.json();
  },

  async getThreadReplies(messageId: string): Promise<MessageItem[]> {
    const res = await fetch(`${API_BASE}/messages/${messageId}/thread`);
    if (!res.ok) throw new Error("Failed to load thread");
    return res.json();
  },

  async resolveAttentionCard(
    messageId: string,
    body: {
      action: "allowed" | "denied" | "answered" | "sent" | "dismissed";
      decidedByName: string;
      decidedById?: string;
      note?: string;
      selectedOption?: string;
      editedDraft?: string;
    }
  ) {
    const res = await fetch(`${API_BASE}/messages/${messageId}/attention`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to resolve attention card");
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

  async getWorkspaceApps(workspaceId: string): Promise<WorkspaceAppItem[]> {
    const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/apps`);
    if (!res.ok) throw new Error("Failed to load apps");
    return res.json();
  },

  async revertAppVersion(appId: string, version: number): Promise<WorkspaceAppItem> {
    const res = await fetch(`${API_BASE}/apps/${appId}/revert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version }),
    });
    if (!res.ok) throw new Error("Failed to revert app version");
    return res.json();
  },

  async updateApp(
    appId: string,
    body: { isPinned?: boolean; accessLevel?: string; status?: string }
  ): Promise<WorkspaceAppItem> {
    const res = await fetch(`${API_BASE}/apps/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to update app");
    return res.json();
  },

  async getFeedItems(workspaceId: string): Promise<FeedItem[]> {
    const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/feed`);
    if (!res.ok) throw new Error("Failed to load feed");
    return res.json();
  },

  async resolveFeedItem(
    feedId: string,
    body: {
      status: "allowed" | "denied" | "sent" | "dismissed" | "pending";
      decidedById?: string;
      decidedByName?: string;
      note?: string;
      draftBody?: string;
    }
  ): Promise<FeedItem> {
    const res = await fetch(`${API_BASE}/feed/${feedId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to resolve feed item");
    return res.json();
  },

  async getVault(workspaceId: string): Promise<{ secrets: VaultSecretItem[]; logs: VaultAuditLogItem[] }> {
    const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/vault`);
    if (!res.ok) throw new Error("Failed to load vault");
    return res.json();
  },

  async createVaultSecret(
    workspaceId: string,
    body: {
      name: string;
      provider: string;
      accessLevel: "auto" | "checked" | "ask" | "human_only";
      secretValue: string;
      description?: string;
      createdById?: string;
    }
  ): Promise<VaultSecretItem> {
    const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/vault`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to create secret");
    return res.json();
  },

  async updateVaultSecretLevel(
    secretId: string,
    accessLevel: "auto" | "checked" | "ask" | "human_only"
  ): Promise<VaultSecretItem> {
    const res = await fetch(`${API_BASE}/vault/${secretId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessLevel }),
    });
    if (!res.ok) throw new Error("Failed to update secret level");
    return res.json();
  },

  async simulateVaultProxyCall(
    secretId: string,
    body: { actorName: string; reason: string; targetEndpoint: string }
  ) {
    const res = await fetch(`${API_BASE}/vault/${secretId}/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to simulate vault proxy call");
    return res.json();
  },

  async getWikiPages(workspaceId: string): Promise<WikiPageItem[]> {
    const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/wiki`);
    if (!res.ok) throw new Error("Failed to load wiki pages");
    return res.json();
  },

  async saveWikiPage(
    workspaceId: string,
    body: { path: string; title: string; content: string; updatedById?: string }
  ): Promise<WikiPageItem> {
    const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/wiki`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to save wiki page");
    return res.json();
  },

  async getMachines(workspaceId: string): Promise<MachineItem[]> {
    const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/machines`);
    if (!res.ok) throw new Error("Failed to load machines");
    return res.json();
  },

  async updateMachineHandoff(
    machineId: string,
    body: { action: "complete_handoff" | "request_handoff"; reason?: string }
  ): Promise<MachineItem> {
    const res = await fetch(`${API_BASE}/machines/${machineId}/handoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to update machine handoff");
    return res.json();
  },
};
