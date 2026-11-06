import React, { useState } from "react";
import {
  MessageSquare,
  ExternalLink,
  PanelRight,
  Smile,
  Copy,
  Check,
  UserPlus,
} from "lucide-react";
import type { MessageItem } from "../api";
import type { ActiveAppArtifact } from "./ArtifactPanel";
import { SlackMarkdown } from "./SlackMarkdown";
import { BotFace } from "./BotFace";

interface MessageListProps {
  messages: MessageItem[];
  currentUserId?: string;
  onOpenThread: (message: MessageItem) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onOpenAppPreview?: (artifact: ActiveAppArtifact) => void;
  onAcceptBotInvite?: (messageId: string, botUserId: string) => void;
  onDismissBotInvite?: (messageId: string) => void;
  onOpenBotProfile?: (botUserId: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onOpenThread,
  onToggleReaction,
  onOpenAppPreview,
  onAcceptBotInvite,
  onDismissBotInvite,
  onOpenBotProfile,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-1.5 select-none">
          <p className="text-xs font-normal">No messages in this channel yet.</p>
        </div>
      ) : (
        messages.map((msg) => {
          const isAgent = msg.sender.userType === "agent";
          const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          // Check if message is a system notification (e.g. user added bot to channel)
          if (msg.metadata?.system) {
            return (
              <div key={msg.id} className="py-1 text-xs text-zinc-500 flex items-center gap-2 select-none">
                <span className="text-zinc-400">↳</span>
                <span className="font-semibold text-zinc-800">{msg.sender.displayName}</span>
                <span>{msg.content}</span>
                <span className="text-[10px] text-zinc-400">{formattedTime}</span>
              </div>
            );
          }

          // Check if message is an interactive app artifact
          const appMeta =
            msg.metadata?.type === "interactive_app"
              ? (msg.metadata as unknown as ActiveAppArtifact)
              : null;

          // Check if message has a pending Slack bot invitation
          const pendingInvite = msg.metadata?.pendingBotInvite as
            | {
                botId: string;
                userId: string;
                name: string;
                handle: string;
                avatarLabel?: string;
              }
            | undefined;

          // Group reactions by emoji code
          const reactionCounts = msg.reactions.reduce<
            Record<string, { count: number; users: string[] }>
          >((acc, r) => {
            if (!acc[r.emoji]) acc[r.emoji] = { count: 0, users: [] };
            acc[r.emoji].count += 1;
            acc[r.emoji].users.push(r.userId);
            return acc;
          }, {});

          return (
            <div
              key={msg.id}
              className="group relative flex gap-3 -mx-6 px-6 py-2 hover:bg-zinc-50/70 transition-colors"
            >
              {/* Avatar (macOS Squircle or Grok/Bricksbot BotFace) */}
              <div
                onClick={() => isAgent && onOpenBotProfile?.(msg.sender.id)}
                className={`w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center select-none ${
                  isAgent
                    ? "bg-zinc-50 border border-zinc-200 cursor-pointer hover:border-zinc-300"
                    : "bg-zinc-100 border border-zinc-200/70 text-xs font-medium text-zinc-600"
                }`}
              >
                {isAgent ? (
                  <BotFace look={msg.sender.avatarUrl || "1.7.0.0"} size={32} />
                ) : msg.sender.avatarUrl ? (
                  <img
                    src={msg.sender.avatarUrl}
                    alt={msg.sender.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  msg.sender.displayName.slice(0, 1)
                )}
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <span
                    onClick={() => isAgent && onOpenBotProfile?.(msg.sender.id)}
                    className={`font-semibold text-[13px] text-zinc-900 tracking-tight ${
                      isAgent ? "hover:underline cursor-pointer" : ""
                    }`}
                  >
                    {msg.sender.displayName}
                  </span>
                  {isAgent && (
                    <span className="text-[9.5px] font-medium tracking-wide uppercase px-1.5 py-0.2 bg-zinc-100 text-zinc-600 rounded border border-zinc-200/80 leading-none">
                      Agent
                    </span>
                  )}
                  <span className="text-[11px] text-zinc-400 font-normal">
                    {formattedTime}
                  </span>
                </div>

                <div className="text-[13px] text-zinc-800 leading-relaxed mt-0.5 break-words">
                  {msg.metadata?.status === "thinking" ? (
                    <div className="flex items-center gap-2 text-zinc-500 py-1 font-normal text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
                      <span>{msg.content}</span>
                    </div>
                  ) : (
                    <SlackMarkdown content={msg.content} />
                  )}
                </div>

                {/* Slack First Mention Poping Invite Card */}
                {pendingInvite && (
                  <div className="mt-2.5 p-3 rounded-xl border border-zinc-200/90 bg-zinc-50/80 max-w-md shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white border border-zinc-200 flex items-center justify-center flex-shrink-0">
                        <BotFace look={pendingInvite.avatarLabel || "1.7.0.0"} size={26} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-zinc-900 text-xs">
                          @{pendingInvite.name} is not in this channel
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Would you like to add them so they can respond and build here?
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2.5 ml-9">
                      <button
                        onClick={() => onAcceptBotInvite?.(msg.id, pendingInvite.userId)}
                        className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs flex items-center gap-1.5"
                      >
                        <UserPlus size={12} />
                        <span>Add to Channel</span>
                      </button>

                      <button
                        onClick={() => onDismissBotInvite?.(msg.id)}
                        className="px-2.5 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-600 transition-colors"
                      >
                        Do Nothing
                      </button>
                    </div>
                  </div>
                )}

                {/* Refined macOS App Card */}
                {appMeta && (
                  <div className="mt-2.5 max-w-lg rounded-xl border border-zinc-200/90 bg-zinc-50/60 p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[13px] text-zinc-900 tracking-tight">
                          {appMeta.appTitle}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Running
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        Port {appMeta.containerPort || 3000}
                      </span>
                    </div>

                    <div className="text-[11.5px] text-zinc-500 mt-1">
                      Isolated compute sandbox container
                    </div>

                    {/* macOS Action Buttons */}
                    <div className="flex items-center gap-2 mt-3">
                      {onOpenAppPreview && (
                        <button
                          onClick={() => onOpenAppPreview(appMeta)}
                          className="px-2.5 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200/90 rounded-lg font-medium text-xs text-zinc-800 shadow-2xs flex items-center gap-1.5 transition-colors"
                        >
                          <PanelRight size={13} className="text-zinc-500" />
                          <span>Preview in Split Pane</span>
                        </button>
                      )}

                      <a
                        href={appMeta.appUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200/90 rounded-lg text-xs text-zinc-600 hover:text-zinc-900 flex items-center gap-1 transition-colors shadow-2xs"
                        title="Open in new window"
                      >
                        <ExternalLink size={12} className="text-zinc-400" />
                        <span>Open Window</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Reactions (Subtle Pills) */}
                {Object.keys(reactionCounts).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {Object.entries(reactionCounts).map(([emoji, data]) => {
                      const hasReacted =
                        currentUserId && data.users.includes(currentUserId);
                      return (
                        <button
                          key={emoji}
                          onClick={() => onToggleReaction(msg.id, emoji)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
                            hasReacted
                              ? "bg-zinc-200/70 border-zinc-300 text-zinc-900"
                              : "bg-zinc-50 border-zinc-200/80 hover:bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px] text-zinc-500">{data.count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Thread replies */}
                {msg.replyCount > 0 && (
                  <button
                    onClick={() => onOpenThread(msg)}
                    className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 group/thread"
                  >
                    <span>
                      {msg.replyCount} {msg.replyCount === 1 ? "reply" : "replies"}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-normal group-hover/thread:text-zinc-500">
                      • View thread
                    </span>
                  </button>
                )}
              </div>

              {/* Floating Action Bar (Refined macOS Toolbar) */}
              <div className="absolute right-4 -top-3 hidden group-hover:flex items-center bg-white border border-zinc-200/90 rounded-lg shadow-sm px-1 py-0.5 gap-0.5 z-10 backdrop-blur-xs">
                <button
                  onClick={() => onToggleReaction(msg.id, "👍")}
                  className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-800 transition-colors"
                  title="React"
                >
                  <Smile size={13} />
                </button>

                <button
                  onClick={() => handleCopy(msg.id, msg.content)}
                  className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-800 transition-colors"
                  title="Copy message"
                >
                  {copiedId === msg.id ? (
                    <Check size={13} className="text-emerald-600" />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>

                <div className="w-[1px] h-3.5 bg-zinc-200 mx-0.5" />

                <button
                  onClick={() => onOpenThread(msg)}
                  className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-800 transition-colors"
                  title="Reply in thread"
                >
                  <MessageSquare size={13} />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
