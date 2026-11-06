import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type MemberItem,
  type MessageItem,
  type BotItem,
  type WorkspaceAppItem,
} from "./api";
import { WorkspaceRail } from "./components/WorkspaceRail";
import { Sidebar, type NavView } from "./components/Sidebar";
import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MessageList";
import { MessageComposer } from "./components/MessageComposer";
import { ThreadDrawer } from "./components/ThreadDrawer";
import { ArtifactPanel, type ActiveAppArtifact } from "./components/ArtifactPanel";
import { CreateBotModal } from "./components/CreateBotModal";
import { ChannelMembersModal } from "./components/ChannelMembersModal";
import { BotProfileModal } from "./components/BotProfileModal";
import { FeedView } from "./components/FeedView";
import { ThreadsView } from "./components/ThreadsView";
import { AppsView } from "./components/AppsView";
import { VaultView } from "./components/VaultView";
import { WikiView } from "./components/WikiView";
import { MachinesView } from "./components/MachinesView";
import { ConnectCliModal } from "./components/ConnectCliModal";
import { CommandPaletteModal } from "./components/CommandPaletteModal";

export const App: React.FC = () => {
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);

  // Active navigation & split-pane states
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<NavView>("chat");
  const [activeThreadMessage, setActiveThreadMessage] = useState<MessageItem | null>(null);
  const [activeArtifact, setActiveArtifact] = useState<ActiveAppArtifact | null>(null);
  const [currentUser, setCurrentUser] = useState<MemberItem | null>(null);
  const [selectedWikiPath, setSelectedWikiPath] = useState<string | null>(null);

  // Catch-up summary state per channel
  const [catchUpSummary, setCatchUpSummary] = useState<{
    channelName: string;
    messageCount: number;
    summary: string;
  } | null>(null);

  // Modals state
  const [isCreateBotModalOpen, setIsCreateBotModalOpen] = useState(false);
  const [isConnectCliModalOpen, setIsConnectCliModalOpen] = useState(false);
  const [isChannelMembersModalOpen, setIsChannelMembersModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedBotForProfile, setSelectedBotForProfile] = useState<BotItem | null>(null);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K for Command Palette, also forwarded from App iframes!)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    const onMessage = (ev: MessageEvent) => {
      if (
        ev.data?.type === "conclave:app:keydown" &&
        (ev.data.metaKey || ev.data.ctrlKey) &&
        ev.data.key?.toLowerCase() === "k"
      ) {
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  // 1. Fetch Workspaces
  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: api.getWorkspaces,
  });

  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspaceId) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId]);

  // 2. Fetch Channels
  const { data: channels = [] } = useQuery({
    queryKey: ["channels", activeWorkspaceId],
    queryFn: () => (activeWorkspaceId ? api.getChannels(activeWorkspaceId) : Promise.resolve([])),
    enabled: !!activeWorkspaceId,
  });

  // Default to first channel (#ops)
  useEffect(() => {
    if (channels.length > 0 && !activeChannelId) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  // 3. Fetch Workspace Members & Bots
  const { data: members = [] } = useQuery({
    queryKey: ["members", activeWorkspaceId],
    queryFn: () => (activeWorkspaceId ? api.getMembers(activeWorkspaceId) : Promise.resolve([])),
    enabled: !!activeWorkspaceId,
  });

  const { data: bots = [] } = useQuery({
    queryKey: ["bots", activeWorkspaceId],
    queryFn: () => (activeWorkspaceId ? api.getBots(activeWorkspaceId) : Promise.resolve([])),
    enabled: !!activeWorkspaceId,
  });

  const { data: channelMembers = [] } = useQuery({
    queryKey: ["channelMembers", activeChannelId],
    queryFn: () =>
      activeChannelId ? api.getChannelMembers(activeChannelId) : Promise.resolve([]),
    enabled: !!activeChannelId,
  });

  useEffect(() => {
    if (members.length > 0 && !currentUser) {
      const human = members.find((m) => m.userType === "human") || members[0];
      setCurrentUser(human);
    }
  }, [members, currentUser]);

  // 4. Fetch Workspace Apps, Feed, Threads, Vault, Wiki, Machines
  const { data: workspaceApps = [] } = useQuery({
    queryKey: ["apps", activeWorkspaceId],
    queryFn: () =>
      activeWorkspaceId ? api.getWorkspaceApps(activeWorkspaceId) : Promise.resolve([]),
    enabled: !!activeWorkspaceId,
  });

  const { data: feedItems = [] } = useQuery({
    queryKey: ["feed", activeWorkspaceId],
    queryFn: () => (activeWorkspaceId ? api.getFeedItems(activeWorkspaceId) : Promise.resolve([])),
    enabled: !!activeWorkspaceId,
  });

  const { data: workspaceThreads = [] } = useQuery({
    queryKey: ["workspaceThreads", activeWorkspaceId],
    queryFn: () =>
      activeWorkspaceId ? api.getWorkspaceThreads(activeWorkspaceId) : Promise.resolve([]),
    enabled: !!activeWorkspaceId,
  });

  const { data: vaultData = { secrets: [], logs: [] } } = useQuery({
    queryKey: ["vault", activeWorkspaceId],
    queryFn: () =>
      activeWorkspaceId
        ? api.getVault(activeWorkspaceId)
        : Promise.resolve({ secrets: [], logs: [] }),
    enabled: !!activeWorkspaceId,
  });

  const { data: wikiPages = [] } = useQuery({
    queryKey: ["wiki", activeWorkspaceId],
    queryFn: () => (activeWorkspaceId ? api.getWikiPages(activeWorkspaceId) : Promise.resolve([])),
    enabled: !!activeWorkspaceId,
  });

  const { data: machines = [] } = useQuery({
    queryKey: ["machines", activeWorkspaceId],
    queryFn: () => (activeWorkspaceId ? api.getMachines(activeWorkspaceId) : Promise.resolve([])),
    enabled: !!activeWorkspaceId,
  });

  // Auto-open pinned app when entering #ops for the first time
  const hasAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (!hasAutoOpenedRef.current && activeChannelId && workspaceApps.length > 0) {
      const pinned = workspaceApps.find(
        (a) => a.channelId === activeChannelId && a.isPinned
      );
      if (pinned) {
        hasAutoOpenedRef.current = true;
        setActiveArtifact({
          appId: pinned.id,
          appSlug: pinned.slug,
          appTitle: pinned.title,
          appUrl: pinned.appUrl,
          containerPort: pinned.containerPort,
          version: pinned.currentVersion,
          versions: pinned.versions,
          accessLevel: pinned.accessLevel,
        });
      }
    }
  }, [activeChannelId, workspaceApps]);

  // 5. Fetch Channel Messages & Thread Replies
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", activeChannelId],
    queryFn: () => (activeChannelId ? api.getMessages(activeChannelId) : Promise.resolve([])),
    enabled: !!activeChannelId,
  });

  const { data: threadReplies = [] } = useQuery({
    queryKey: ["thread", activeThreadMessage?.id],
    queryFn: () =>
      activeThreadMessage ? api.getThreadReplies(activeThreadMessage.id) : Promise.resolve([]),
    enabled: !!activeThreadMessage,
  });

  // 6. Real-time WebSocket connection & Presence Heartbeat
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws`);
    socketRef.current = ws;

    ws.onopen = () => {
      if (activeChannelId && currentUser) {
        ws.send(
          JSON.stringify({
            type: "channel.join",
            channelId: activeChannelId,
            userId: currentUser.id,
          })
        );
      }
    };

    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN && currentUser) {
        ws.send(
          JSON.stringify({
            type: "presence.heartbeat",
            userId: currentUser.id,
          })
        );
      }
    }, 45000);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "message.created" || payload.type === "message.updated") {
          queryClient.invalidateQueries({ queryKey: ["messages", payload.channelId] });
          queryClient.invalidateQueries({ queryKey: ["workspaceThreads", activeWorkspaceId] });
          if (payload.parentMessageId) {
            queryClient.invalidateQueries({ queryKey: ["thread", payload.parentMessageId] });
          }
        } else if (payload.type === "reaction.added" || payload.type === "reaction.removed") {
          queryClient.invalidateQueries({ queryKey: ["messages", payload.channelId] });
        } else if (payload.type === "bot.created") {
          queryClient.invalidateQueries({ queryKey: ["bots", activeWorkspaceId] });
          queryClient.invalidateQueries({ queryKey: ["members", activeWorkspaceId] });
          queryClient.invalidateQueries({ queryKey: ["channelMembers", activeChannelId] });
        } else if (
          payload.type === "channel.member_joined" ||
          payload.type === "channel.member_left"
        ) {
          queryClient.invalidateQueries({ queryKey: ["channelMembers", payload.channelId] });
          queryClient.invalidateQueries({ queryKey: ["bots", activeWorkspaceId] });
        } else if (payload.type === "channel.created") {
          queryClient.invalidateQueries({ queryKey: ["channels", activeWorkspaceId] });
        } else if (payload.type === "app.updated" || payload.type === "app.records_updated") {
          queryClient.invalidateQueries({ queryKey: ["apps", activeWorkspaceId] });
        } else if (payload.type === "feed.updated") {
          queryClient.invalidateQueries({ queryKey: ["feed", activeWorkspaceId] });
        } else if (payload.type === "machine.updated") {
          queryClient.invalidateQueries({ queryKey: ["machines", activeWorkspaceId] });
        }
      } catch (e) {
        console.error("Error processing websocket payload", e);
      }
    };

    return () => {
      clearInterval(heartbeatInterval);
      ws.close();
    };
  }, [activeChannelId, activeWorkspaceId, currentUser, queryClient]);

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => {
      if (!activeWorkspaceId || !activeChannelId || !currentUser) {
        throw new Error("Missing workspace, channel, or user context");
      }
      return api.sendMessage(activeChannelId, {
        workspaceId: activeWorkspaceId,
        senderId: currentUser.id,
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", activeChannelId] });
    },
  });

  const sendThreadReplyMutation = useMutation({
    mutationFn: ({
      channelId,
      parentMessageId,
      content,
    }: {
      channelId: string;
      parentMessageId: string;
      content: string;
    }) => {
      if (!activeWorkspaceId || !currentUser) {
        throw new Error("Missing thread context");
      }
      return api.sendMessage(channelId, {
        workspaceId: activeWorkspaceId,
        senderId: currentUser.id,
        content,
        parentMessageId,
      });
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["thread", vars.parentMessageId] });
      queryClient.invalidateQueries({ queryKey: ["messages", vars.channelId] });
      queryClient.invalidateQueries({ queryKey: ["workspaceThreads", activeWorkspaceId] });
    },
  });

  const toggleReactionMutation = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!currentUser || !activeChannelId) throw new Error("Missing context");
      return api.toggleReaction(messageId, {
        userId: currentUser.id,
        emoji,
        channelId: activeChannelId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", activeChannelId] });
    },
  });

  const createChannelMutation = useMutation({
    mutationFn: (name: string) => {
      if (!activeWorkspaceId || !currentUser) throw new Error("Missing context");
      return api.createChannel(activeWorkspaceId, {
        name,
        createdById: currentUser.id,
      });
    },
    onSuccess: (newCh) => {
      queryClient.invalidateQueries({ queryKey: ["channels", activeWorkspaceId] });
      setActiveChannelId(newCh.id);
      setActiveView("chat");
    },
  });

  const createBotMutation = useMutation({
    mutationFn: (data: {
      name: string;
      handle: string;
      description?: string;
      systemPrompt?: string;
      engine: "agy" | "claude";
      avatarLabel?: string;
      connectionMode?: string;
      channelIds: string[];
    }) => {
      if (!activeWorkspaceId || !currentUser) {
        throw new Error("Missing workspace or user context");
      }
      return api.createBot(activeWorkspaceId, {
        ...data,
        ownerId: currentUser.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots", activeWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ["members", activeWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ["channelMembers", activeChannelId] });
    },
  });

  const addMemberToChannelMutation = useMutation({
    mutationFn: ({
      userId,
      listenMode = "mention",
    }: {
      userId: string;
      listenMode?: "mention" | "all";
    }) => {
      if (!activeChannelId) throw new Error("Missing active channel");
      return api.addChannelMember(activeChannelId, userId, listenMode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channelMembers", activeChannelId] });
      queryClient.invalidateQueries({ queryKey: ["bots", activeWorkspaceId] });
    },
  });

  const removeMemberFromChannelMutation = useMutation({
    mutationFn: (userId: string) => {
      if (!activeChannelId) throw new Error("Missing active channel");
      return api.removeChannelMember(activeChannelId, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channelMembers", activeChannelId] });
      queryClient.invalidateQueries({ queryKey: ["bots", activeWorkspaceId] });
    },
  });

  const acceptBotInviteMutation = useMutation({
    mutationFn: ({
      messageId,
      botUserId,
      listenMode,
    }: {
      messageId: string;
      botUserId: string;
      listenMode: "mention" | "all";
    }) => {
      if (!activeChannelId || !currentUser) throw new Error("Missing context");
      return api.acceptBotInvite(activeChannelId, messageId, {
        botUserId,
        invitedByUserId: currentUser.id,
        listenMode,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", activeChannelId] });
      queryClient.invalidateQueries({ queryKey: ["channelMembers", activeChannelId] });
      queryClient.invalidateQueries({ queryKey: ["bots", activeWorkspaceId] });
    },
  });

  const dismissBotInviteMutation = useMutation({
    mutationFn: (messageId: string) => {
      if (!activeChannelId) throw new Error("Missing active channel");
      return api.dismissBotInvite(activeChannelId, messageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", activeChannelId] });
    },
  });

  const stopTurnMutation = useMutation({
    mutationFn: () => {
      if (!activeChannelId) throw new Error("No active channel");
      return api.stopChannelTurn(activeChannelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", activeChannelId] });
    },
  });

  const catchUpMutation = useMutation({
    mutationFn: () => {
      if (!activeChannelId) throw new Error("No active channel");
      return api.getChannelCatchUp(activeChannelId);
    },
    onSuccess: (data) => {
      setCatchUpSummary(data);
    },
  });

  const resolveAttentionMutation = useMutation({
    mutationFn: ({
      messageId,
      action,
      note,
      selectedOption,
      editedDraft,
    }: {
      messageId: string;
      action: "allowed" | "denied" | "answered" | "sent" | "dismissed";
      note?: string;
      selectedOption?: string;
      editedDraft?: string;
    }) => {
      return api.resolveAttentionCard(messageId, {
        action,
        decidedByName: currentUser?.displayName || "Mara Jensen",
        decidedById: currentUser?.id,
        note,
        selectedOption,
        editedDraft,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", activeChannelId] });
      queryClient.invalidateQueries({ queryKey: ["feed", activeWorkspaceId] });
    },
  });

  const resolveFeedItemMutation = useMutation({
    mutationFn: ({
      feedId,
      status,
      note,
      draftBody,
    }: {
      feedId: string;
      status: "allowed" | "denied" | "sent" | "dismissed" | "pending";
      note?: string;
      draftBody?: string;
    }) => {
      return api.resolveFeedItem(feedId, {
        status,
        decidedById: currentUser?.id,
        decidedByName: currentUser?.displayName || "Mara Jensen",
        note,
        draftBody,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed", activeWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ["messages", activeChannelId] });
    },
  });

  const revertAppMutation = useMutation({
    mutationFn: ({ appId, version }: { appId: string; version: number }) =>
      api.revertAppVersion(appId, version),
    onSuccess: (updatedApp) => {
      queryClient.invalidateQueries({ queryKey: ["apps", activeWorkspaceId] });
      if (activeArtifact && activeArtifact.appId === updatedApp.id) {
        setActiveArtifact((prev) =>
          prev ? { ...prev, version: updatedApp.currentVersion } : null
        );
      }
    },
  });

  const updateAppMutation = useMutation({
    mutationFn: ({
      appId,
      body,
    }: {
      appId: string;
      body: { isPinned?: boolean; accessLevel?: string; status?: string };
    }) => api.updateApp(appId, body),
    onSuccess: (updatedApp) => {
      queryClient.invalidateQueries({ queryKey: ["apps", activeWorkspaceId] });
      if (activeArtifact && activeArtifact.appId === updatedApp.id) {
        setActiveArtifact((prev) =>
          prev
            ? {
                ...prev,
                accessLevel: updatedApp.accessLevel as any,
              }
            : null
        );
      }
    },
  });

  const openAppInSplitPane = (app: WorkspaceAppItem | ActiveAppArtifact) => {
    if ("slug" in app) {
      setActiveArtifact({
        appId: app.id,
        appSlug: app.slug,
        appTitle: app.title,
        appUrl: app.appUrl,
        containerPort: app.containerPort,
        version: app.currentVersion,
        versions: app.versions,
        accessLevel: app.accessLevel,
      });
    } else {
      const matched = workspaceApps.find(
        (a) => a.id === app.appId || a.slug === app.appSlug || a.title === app.appTitle
      );
      setActiveArtifact({
        ...app,
        appId: matched?.id || app.appId,
        appSlug: matched?.slug || app.appSlug,
        version: matched?.currentVersion || app.version || 1,
        versions: matched?.versions || app.versions,
        accessLevel: matched?.accessLevel || app.accessLevel,
      });
    }
    setActiveThreadMessage(null);
  };

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null;
  const activeChannel = channels.find((c) => c.id === activeChannelId) || null;
  const pinnedChannelApps = workspaceApps.filter(
    (a) => a.channelId === activeChannelId && a.isPinned
  );
  const pendingFeedCount = feedItems.filter((i) => i.status === "pending").length;
  const handoffMachinesCount = machines.filter((m) => m.handoffRequested).length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1d1626] p-1.5 gap-0 text-zinc-900">
      {/* 1. Deep Plum Workspace & Platform Switcher Rail */}
      <WorkspaceRail
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        activeView={activeView}
        onSelectWorkspace={(id) => {
          setActiveWorkspaceId(id);
          setActiveChannelId(null);
          setActiveThreadMessage(null);
          setActiveArtifact(null);
        }}
        onSelectView={setActiveView}
      />

      {/* 2. Laze Deep Plum Sidebar */}
      <Sidebar
        workspace={activeWorkspace}
        channels={channels}
        members={members}
        bots={bots}
        apps={workspaceApps}
        activeView={activeView}
        activeChannelId={activeChannelId}
        pendingFeedCount={pendingFeedCount}
        activeThreadsCount={workspaceThreads.length}
        handoffMachinesCount={handoffMachinesCount}
        onSelectView={setActiveView}
        onSelectChannel={(id) => {
          setActiveChannelId(id);
          setActiveThreadMessage(null);
          setCatchUpSummary(null);
          const pinned = workspaceApps.find((a) => a.channelId === id && a.isPinned);
          if (pinned) {
            openAppInSplitPane(pinned);
          } else {
            setActiveArtifact(null);
          }
        }}
        onOpenAppPreview={(app) => openAppInSplitPane(app)}
        currentUser={currentUser}
        onSwitchUser={setCurrentUser}
        onOpenCreateBotModal={() => setIsCreateBotModalOpen(true)}
        onOpenConnectCliModal={() => setIsConnectCliModalOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenBotProfile={(bot) => setSelectedBotForProfile(bot)}
        onCreateChannel={(name) => createChannelMutation.mutate(name)}
      />

      {/* 3. Main Concentric Rounded Content Sheet (Laze .laze-sheet) */}
      <div className="flex-1 flex min-w-0 bg-white rounded-[14px] overflow-hidden shadow-2xl border border-white/10">
        {activeView === "feed" ? (
          <FeedView
            items={feedItems}
            channels={channels}
            currentUserName={currentUser?.displayName}
            onResolveItem={(feedId, payload) =>
              resolveFeedItemMutation.mutate({ feedId, ...payload })
            }
            onJumpToChannel={(chId) => {
              setActiveChannelId(chId);
              setActiveView("chat");
            }}
          />
        ) : activeView === "threads" ? (
          <ThreadsView
            threads={workspaceThreads}
            onReplyThread={(channelId, parentMessageId, content) =>
              sendThreadReplyMutation.mutate({ channelId, parentMessageId, content })
            }
            onJumpToChannel={(chId) => {
              setActiveChannelId(chId);
              setActiveView("chat");
            }}
          />
        ) : activeView === "apps" ? (
          <AppsView
            apps={workspaceApps}
            channels={channels}
            onOpenAppSideBySide={(app) => {
              if (app.channelId) setActiveChannelId(app.channelId);
              setActiveView("chat");
              openAppInSplitPane(app);
            }}
            onRevertAppVersion={(appId, version) =>
              revertAppMutation.mutate({ appId, version })
            }
            onTogglePin={(app) =>
              updateAppMutation.mutate({
                appId: app.id,
                body: { isPinned: !app.isPinned },
              })
            }
          />
        ) : activeView === "vault" ? (
          <VaultView
            secrets={vaultData.secrets}
            logs={vaultData.logs}
            onCreateSecret={async (data) => {
              if (!activeWorkspaceId) return;
              await api.createVaultSecret(activeWorkspaceId, {
                ...data,
                createdById: currentUser?.id,
              });
              queryClient.invalidateQueries({ queryKey: ["vault", activeWorkspaceId] });
            }}
            onUpdateLevel={async (secretId, accessLevel) => {
              await api.updateVaultSecretLevel(secretId, accessLevel);
              queryClient.invalidateQueries({ queryKey: ["vault", activeWorkspaceId] });
            }}
            onSimulateProxy={async (secretId, body) => {
              await api.simulateVaultProxyCall(secretId, body);
              queryClient.invalidateQueries({ queryKey: ["vault", activeWorkspaceId] });
            }}
          />
        ) : activeView === "wiki" ? (
          <WikiView
            pages={wikiPages}
            initialPath={selectedWikiPath}
            onSavePage={async (data) => {
              if (!activeWorkspaceId) return;
              await api.saveWikiPage(activeWorkspaceId, {
                ...data,
                updatedById: currentUser?.id,
              });
              queryClient.invalidateQueries({ queryKey: ["wiki", activeWorkspaceId] });
            }}
          />
        ) : activeView === "machines" ? (
          <MachinesView
            machines={machines}
            onUpdateHandoff={async (machineId, action, reason) => {
              await api.updateMachineHandoff(machineId, { action, reason });
              queryClient.invalidateQueries({ queryKey: ["machines", activeWorkspaceId] });
            }}
          />
        ) : (
          /* Default View: Central Chat Column + Side-by-Side App / Thread Split Pane */
          <>
            <div className="flex-1 flex flex-col min-w-0 bg-white">
              <ChatHeader
                channel={activeChannel}
                memberCount={channelMembers.length || members.length}
                botCount={
                  bots.filter(
                    (b) => activeChannelId && b.channelIds.includes(activeChannelId)
                  ).length
                }
                pinnedApps={pinnedChannelApps}
                activeAppSlug={activeArtifact?.appSlug}
                isCatchingUp={catchUpMutation.isPending}
                onOpenMembersModal={() => setIsChannelMembersModalOpen(true)}
                onOpenCreateBotModal={() => setIsCreateBotModalOpen(true)}
                onSelectPinnedApp={(app) => openAppInSplitPane(app)}
                onRequestCatchUp={() => catchUpMutation.mutate()}
              />

              <MessageList
                messages={messages}
                currentUserId={currentUser?.id}
                currentUserName={currentUser?.displayName}
                catchUpSummary={catchUpSummary}
                onDismissCatchUp={() => setCatchUpSummary(null)}
                onOpenThread={(msg) => {
                  setActiveThreadMessage(msg);
                  setActiveArtifact(null);
                }}
                onToggleReaction={(messageId, emoji) =>
                  toggleReactionMutation.mutate({ messageId, emoji })
                }
                onOpenAppPreview={(artifact) => openAppInSplitPane(artifact)}
                onAcceptBotInvite={(messageId, botUserId, listenMode) =>
                  acceptBotInviteMutation.mutate({ messageId, botUserId, listenMode })
                }
                onDismissBotInvite={(messageId) =>
                  dismissBotInviteMutation.mutate(messageId)
                }
                onOpenBotProfile={(botUserId) => {
                  const bot = bots.find((b) => b.userId === botUserId) || null;
                  if (bot) setSelectedBotForProfile(bot);
                }}
                onStopTurn={() => stopTurnMutation.mutate()}
                onResolveAttention={(messageId, payload) =>
                  resolveAttentionMutation.mutate({ messageId, ...payload })
                }
                onOpenWikiPath={(path) => {
                  setSelectedWikiPath(path);
                  setActiveView("wiki");
                }}
              />

              <MessageComposer
                placeholder={
                  activeChannel ? `Message #${activeChannel.name} (@agent, /skill, [[wiki]])` : "Message..."
                }
                bots={bots}
                members={members}
                wikiPages={wikiPages}
                onSendMessage={(content) => sendMessageMutation.mutate(content)}
                onStopTurn={() => stopTurnMutation.mutate()}
              />
            </div>

            {activeThreadMessage && (
              <ThreadDrawer
                parentMessage={activeThreadMessage}
                replies={threadReplies}
                channelName={activeChannel?.name || ""}
                onClose={() => setActiveThreadMessage(null)}
                onSendReply={(content) => {
                  if (!activeChannelId) return;
                  sendThreadReplyMutation.mutate({
                    channelId: activeChannelId,
                    parentMessageId: activeThreadMessage.id,
                    content,
                  });
                }}
              />
            )}

            {activeArtifact && (
              <ArtifactPanel
                artifact={activeArtifact}
                onClose={() => setActiveArtifact(null)}
                onRevertVersion={async (appId, version) => {
                  await revertAppMutation.mutateAsync({ appId, version });
                }}
                onUpdateAccessLevel={async (appId, accessLevel) => {
                  await updateAppMutation.mutateAsync({
                    appId,
                    body: { accessLevel },
                  });
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <CreateBotModal
        isOpen={isCreateBotModalOpen}
        onClose={() => setIsCreateBotModalOpen(false)}
        channels={channels}
        currentChannelId={activeChannelId}
        onCreateBot={async (data) => {
          await createBotMutation.mutateAsync(data);
        }}
      />

      <ConnectCliModal
        isOpen={isConnectCliModalOpen}
        onClose={() => setIsConnectCliModalOpen(false)}
        workspace={activeWorkspace}
        activeChannel={activeChannel}
        onQuickCreateConnectedBot={async ({ name, handle, engine }) => {
          await createBotMutation.mutateAsync({
            name,
            handle,
            description: `Connected from local developer machine (${engine} CLI bridge)`,
            systemPrompt: `You are ${name}, connected from a teammate's laptop via CLI bridge.`,
            engine,
            connectionMode: "cli",
            channelIds: activeChannelId ? [activeChannelId] : [],
          });
        }}
      />

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        channels={channels}
        bots={bots}
        apps={workspaceApps}
        wikiPages={wikiPages}
        onSelectChannel={(chId) => setActiveChannelId(chId)}
        onSelectView={(v) => setActiveView(v)}
        onOpenApp={(app) => {
          if (app.channelId) setActiveChannelId(app.channelId);
          setActiveView("chat");
          openAppInSplitPane(app);
        }}
        onOpenBot={(bot) => setSelectedBotForProfile(bot)}
        onOpenWikiPath={(path) => setSelectedWikiPath(path)}
      />

      <ChannelMembersModal
        isOpen={isChannelMembersModalOpen}
        onClose={() => setIsChannelMembersModalOpen(false)}
        channel={activeChannel}
        channelMembers={members}
        allBots={bots}
        onAddBotToChannel={async (botUserId, listenMode = "mention") => {
          await addMemberToChannelMutation.mutateAsync({
            userId: botUserId,
            listenMode,
          });
        }}
        onRemoveBotFromChannel={async (botUserId) => {
          await removeMemberFromChannelMutation.mutateAsync(botUserId);
        }}
        onOpenCreateBotModal={() => setIsCreateBotModalOpen(true)}
      />

      <BotProfileModal
        isOpen={!!selectedBotForProfile}
        onClose={() => setSelectedBotForProfile(null)}
        bot={selectedBotForProfile}
        channels={channels}
        onToggleChannel={async (botUserId, channelId, isCurrentlyIn) => {
          if (isCurrentlyIn) {
            await api.removeChannelMember(channelId, botUserId);
          } else {
            await api.addChannelMember(channelId, botUserId, "mention");
          }
          queryClient.invalidateQueries({ queryKey: ["bots", activeWorkspaceId] });
          queryClient.invalidateQueries({ queryKey: ["channelMembers", activeChannelId] });
          if (selectedBotForProfile) {
            setSelectedBotForProfile({
              ...selectedBotForProfile,
              channelIds: isCurrentlyIn
                ? selectedBotForProfile.channelIds.filter((id) => id !== channelId)
                : [...selectedBotForProfile.channelIds, channelId],
            });
          }
        }}
      />
    </div>
  );
};
