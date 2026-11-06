import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type MemberItem, type MessageItem } from "./api";
import { WorkspaceRail } from "./components/WorkspaceRail";
import { Sidebar } from "./components/Sidebar";
import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MessageList";
import { MessageComposer } from "./components/MessageComposer";
import { ThreadDrawer } from "./components/ThreadDrawer";
import { ArtifactPanel, type ActiveAppArtifact } from "./components/ArtifactPanel";

export const App: React.FC = () => {
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);

  // Active navigation states
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeThreadMessage, setActiveThreadMessage] = useState<MessageItem | null>(null);
  const [activeArtifact, setActiveArtifact] = useState<ActiveAppArtifact | null>(null);
  const [currentUser, setCurrentUser] = useState<MemberItem | null>(null);

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
        activeChannelId={activeChannelId}
        onSelectChannel={(id) => {
          setActiveChannelId(id);
          setActiveThreadMessage(null);
        }}
        currentUser={currentUser}
        onSwitchUser={setCurrentUser}
      />

      {/* 3. Central Chat Column (True Slack Layout) */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <ChatHeader
          channel={activeChannel}
          memberCount={members.length}
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
    </div>
  );
};
