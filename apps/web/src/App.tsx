import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type MemberItem, type MessageItem, type BotItem, type Sender } from "./api";
import { WorkspaceRail } from "./components/WorkspaceRail";
import { Sidebar } from "./components/Sidebar";
import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MessageList";
import { MessageComposer } from "./components/MessageComposer";
import { ThreadDrawer } from "./components/ThreadDrawer";
import { ArtifactPanel, type ActiveAppArtifact } from "./components/ArtifactPanel";
import { CreateBotModal } from "./components/CreateBotModal";
import { ChannelMembersModal } from "./components/ChannelMembersModal";
import { BotProfileModal } from "./components/BotProfileModal";

export const App: React.FC = () => {
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);

  // Active navigation states
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeThreadMessage, setActiveThreadMessage] = useState<MessageItem | null>(null);
  const [activeArtifact, setActiveArtifact] = useState<ActiveAppArtifact | null>(null);
  const [currentUser, setCurrentUser] = useState<MemberItem | null>(null);

  // Bot & Channel modals state
  const [isCreateBotModalOpen, setIsCreateBotModalOpen] = useState(false);
  const [isChannelMembersModalOpen, setIsChannelMembersModalOpen] = useState(false);
  const [selectedBotForProfile, setSelectedBotForProfile] = useState<BotItem | null>(null);

  // 1. Fetch Workspaces
  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: api.getWorkspaces,
  });

  // Default to first workspace
  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspaceId) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId]);

  // 2. Fetch Channels for active workspace
  const { data: channels = [] } = useQuery({
    queryKey: ["channels", activeWorkspaceId],
    queryFn: () => (activeWorkspaceId ? api.getChannels(activeWorkspaceId) : Promise.resolve([])),
    enabled: !!activeWorkspaceId,
  });

  // Default to first channel (#general)
  useEffect(() => {
    if (channels.length > 0 && !activeChannelId) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  // 3. Fetch Workspace Members
  const { data: members = [] } = useQuery({
    queryKey: ["members", activeWorkspaceId],
    queryFn: () => (activeWorkspaceId ? api.getMembers(activeWorkspaceId) : Promise.resolve([])),
    enabled: !!activeWorkspaceId,
  });

  // 3b. Fetch Workspace Bots
  const { data: bots = [] } = useQuery({
    queryKey: ["bots", activeWorkspaceId],
    queryFn: () => (activeWorkspaceId ? api.getBots(activeWorkspaceId) : Promise.resolve([])),
    enabled: !!activeWorkspaceId,
  });

  // 3c. Fetch Channel Members
  const { data: channelMembers = [] } = useQuery({
    queryKey: ["channelMembers", activeChannelId],
    queryFn: () => (activeChannelId ? api.getChannelMembers(activeChannelId) : Promise.resolve([])),
    enabled: !!activeChannelId,
  });

  // Default to first human user (Alice)
  useEffect(() => {
    if (members.length > 0 && !currentUser) {
      setCurrentUser(members[0]);
    }
  }, [members, currentUser]);

  // 4. Fetch Channel Messages
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", activeChannelId],
    queryFn: () => (activeChannelId ? api.getMessages(activeChannelId) : Promise.resolve([])),
    enabled: !!activeChannelId,
  });

  // 5. Fetch Thread Replies if open
  const { data: threadReplies = [] } = useQuery({
    queryKey: ["thread", activeThreadMessage?.id],
    queryFn: () =>
      activeThreadMessage ? api.getThreadReplies(activeThreadMessage.id) : Promise.resolve([]),
    enabled: !!activeThreadMessage,
  });

  // 6. Real-time WebSocket connection
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

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "message.created" || payload.type === "message.updated") {
          if (payload.parentMessageId) {
            queryClient.invalidateQueries({ queryKey: ["thread", payload.parentMessageId] });
            queryClient.invalidateQueries({ queryKey: ["messages", payload.channelId] });
          } else {
            queryClient.invalidateQueries({ queryKey: ["messages", payload.channelId] });
          }
        } else if (payload.type === "reaction.added" || payload.type === "reaction.removed") {
          queryClient.invalidateQueries({ queryKey: ["messages", payload.channelId] });
        } else if (payload.type === "bot.created") {
          queryClient.invalidateQueries({ queryKey: ["bots", activeWorkspaceId] });
          queryClient.invalidateQueries({ queryKey: ["members", activeWorkspaceId] });
          queryClient.invalidateQueries({ queryKey: ["channelMembers", activeChannelId] });
        } else if (payload.type === "channel.member_joined" || payload.type === "channel.member_left") {
          queryClient.invalidateQueries({ queryKey: ["channelMembers", payload.channelId] });
          queryClient.invalidateQueries({ queryKey: ["bots", activeWorkspaceId] });
        }
      } catch (e) {
        console.error("Error processing websocket payload", e);
      }
    };

    return () => {
      ws.close();
    };
  }, [activeChannelId, currentUser, queryClient]);

  // Send message mutation
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

  // Send thread reply mutation
  const sendThreadReplyMutation = useMutation({
    mutationFn: (content: string) => {
      if (!activeWorkspaceId || !activeChannelId || !currentUser || !activeThreadMessage) {
        throw new Error("Missing thread context");
      }
      return api.sendMessage(activeChannelId, {
        workspaceId: activeWorkspaceId,
        senderId: currentUser.id,
        content,
        parentMessageId: activeThreadMessage.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thread", activeThreadMessage?.id] });
      queryClient.invalidateQueries({ queryKey: ["messages", activeChannelId] });
    },
  });

  // Toggle reaction mutation
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

  // Create Bot mutation
  const createBotMutation = useMutation({
    mutationFn: (data: {
      name: string;
      handle: string;
      description: string;
      systemPrompt: string;
      engine: "agy" | "claude";
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

  // Add bot/member to channel mutation
  const addMemberToChannelMutation = useMutation({
    mutationFn: (userId: string) => {
      if (!activeChannelId) throw new Error("Missing active channel");
      return api.addChannelMember(activeChannelId, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channelMembers", activeChannelId] });
      queryClient.invalidateQueries({ queryKey: ["bots", activeWorkspaceId] });
    },
  });

  // Remove bot/member from channel mutation
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

  // Accept bot invite mutation (Slack first mention flow)
  const acceptBotInviteMutation = useMutation({
    mutationFn: ({ messageId, botUserId }: { messageId: string; botUserId: string }) => {
      if (!activeChannelId || !currentUser) throw new Error("Missing context");
      return api.acceptBotInvite(activeChannelId, messageId, {
        botUserId,
        invitedByUserId: currentUser.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", activeChannelId] });
      queryClient.invalidateQueries({ queryKey: ["channelMembers", activeChannelId] });
      queryClient.invalidateQueries({ queryKey: ["bots", activeWorkspaceId] });
    },
  });

  // Dismiss bot invite prompt
  const dismissBotInviteMutation = useMutation({
    mutationFn: (messageId: string) => {
      if (!activeChannelId) throw new Error("Missing active channel");
      return api.dismissBotInvite(activeChannelId, messageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", activeChannelId] });
    },
  });

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null;
  const activeChannel = channels.find((c) => c.id === activeChannelId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-gray-900">
      {/* 1. Leftmost Workspace Switcher Rail */}
      <WorkspaceRail
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={(id) => {
          setActiveWorkspaceId(id);
          setActiveChannelId(null);
          setActiveThreadMessage(null);
          setActiveArtifact(null);
        }}
      />

      {/* 2. Channel & DM Navigation Sidebar */}
      <Sidebar
        workspace={activeWorkspace}
        channels={channels}
        members={members}
        bots={bots}
        activeChannelId={activeChannelId}
        onSelectChannel={(id) => {
          setActiveChannelId(id);
          setActiveThreadMessage(null);
        }}
        currentUser={currentUser}
        onSwitchUser={setCurrentUser}
        onOpenCreateBotModal={() => setIsCreateBotModalOpen(true)}
        onOpenBotProfile={(bot) => setSelectedBotForProfile(bot)}
      />

      {/* 3. Central Chat Column (True Slack Layout) */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <ChatHeader
          channel={activeChannel}
          memberCount={channelMembers.length || members.length}
          botCount={bots.filter((b) => activeChannelId && b.channelIds.includes(activeChannelId)).length}
          onOpenMembersModal={() => setIsChannelMembersModalOpen(true)}
          onOpenCreateBotModal={() => setIsCreateBotModalOpen(true)}
        />

        <MessageList
          messages={messages}
          currentUserId={currentUser?.id}
          onOpenThread={(msg) => {
            setActiveThreadMessage(msg);
            setActiveArtifact(null); // Switch focus to thread
          }}
          onToggleReaction={(messageId, emoji) =>
            toggleReactionMutation.mutate({ messageId, emoji })
          }
          onOpenAppPreview={(artifact) => {
            setActiveArtifact(artifact);
            setActiveThreadMessage(null); // Switch focus to artifact split pane
          }}
          onAcceptBotInvite={(messageId, botUserId) =>
            acceptBotInviteMutation.mutate({ messageId, botUserId })
          }
          onDismissBotInvite={(messageId) =>
            dismissBotInviteMutation.mutate(messageId)
          }
          onOpenBotProfile={(botUserId) => {
            const bot = bots.find((b) => b.userId === botUserId) || null;
            if (bot) setSelectedBotForProfile(bot);
          }}
        />

        <MessageComposer
          placeholder={activeChannel ? `Message #${activeChannel.name}` : "Message..."}
          onSendMessage={(content) => sendMessageMutation.mutate(content)}
        />
      </div>

      {/* 4. Split Pane: Thread Drawer */}
      {activeThreadMessage && (
        <ThreadDrawer
          parentMessage={activeThreadMessage}
          replies={threadReplies}
          channelName={activeChannel?.name || ""}
          onClose={() => setActiveThreadMessage(null)}
          onSendReply={(content) => sendThreadReplyMutation.mutate(content)}
        />
      )}

      {/* 5. Split Pane: Live Micro-App / Artifact Panel */}
      {activeArtifact && (
        <ArtifactPanel
          artifact={activeArtifact}
          onClose={() => setActiveArtifact(null)}
        />
      )}

      {/* 6. Modal: Create New Bot */}
      <CreateBotModal
        isOpen={isCreateBotModalOpen}
        onClose={() => setIsCreateBotModalOpen(false)}
        channels={channels}
        currentChannelId={activeChannelId}
        onCreateBot={async (data) => {
          await createBotMutation.mutateAsync(data);
        }}
      />

      {/* 7. Modal: Channel Members & Bots Management */}
      <ChannelMembersModal
        isOpen={isChannelMembersModalOpen}
        onClose={() => setIsChannelMembersModalOpen(false)}
        channel={activeChannel}
        channelMembers={members}
        allBots={bots}
        onAddBotToChannel={async (botUserId) => {
          await addMemberToChannelMutation.mutateAsync(botUserId);
        }}
        onRemoveBotFromChannel={async (botUserId) => {
          await removeMemberFromChannelMutation.mutateAsync(botUserId);
        }}
        onOpenCreateBotModal={() => setIsCreateBotModalOpen(true)}
      />

      {/* 8. Modal: Bot Profile / Face & Details (Grok / Bricksbot Style) */}
      <BotProfileModal
        isOpen={!!selectedBotForProfile}
        onClose={() => setSelectedBotForProfile(null)}
        bot={selectedBotForProfile}
        channels={channels}
        onToggleChannel={async (botUserId, channelId, isCurrentlyIn) => {
          if (isCurrentlyIn) {
            await removeMemberFromChannelMutation.mutateAsync(botUserId);
          } else {
            await addMemberToChannelMutation.mutateAsync(botUserId);
          }
          // Update selectedBotForProfile channelIds locally
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
