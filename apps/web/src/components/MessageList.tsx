import React from "react";
import { MessageSquare, ExternalLink, PanelRight, CheckCircle2 } from "lucide-react";
import type { MessageItem } from "../api";
import type { ActiveAppArtifact } from "./ArtifactPanel";

interface MessageListProps {
  messages: MessageItem[];
  currentUserId?: string;
  onOpenThread: (message: MessageItem) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onOpenAppPreview?: (artifact: ActiveAppArtifact) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onOpenThread,
  onToggleReaction,
  onOpenAppPreview,
}) => {
  const quickEmojis = ["👍", "❤️", "🚀", "🎉", "👀"];

  // Render markdown code blocks if present
  const renderFormattedContent = (content: string) => {
    if (content.includes("```")) {
      const parts = content.split(/(```[\s\S]*?```)/g);
      return parts.map((part, index) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const lines = part.slice(3, -3).trim().split("\n");
          const firstLine = lines[0].trim();
          const hasLang = !firstLine.includes(" ") && firstLine.length > 0;
          const code = hasLang ? lines.slice(1).join("\n") : lines.join("\n");

          return (
            <pre
              key={index}
              className="my-2 p-3 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono overflow-x-auto border border-gray-800"
            >
              <code>{code}</code>
            </pre>
          );
        }
        return <span key={index} className="whitespace-pre-wrap">{part}</span>;
      });
    }

    return <span className="whitespace-pre-wrap">{content}</span>;
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
          <MessageSquare size={36} className="opacity-30" />
          <p className="text-sm">No messages here yet. Say hello!</p>
        </div>
      ) : (
        messages.map((msg) => {
          const isAgent = msg.sender.userType === "agent";
          const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          // Check if message is an interactive app artifact
          const appMeta = msg.metadata?.type === "interactive_app" ? (msg.metadata as unknown as ActiveAppArtifact) : null;

          // Group reactions by emoji code
          const reactionCounts = msg.reactions.reduce<Record<string, { count: number; users: string[] }>>(
            (acc, r) => {
              if (!acc[r.emoji]) acc[r.emoji] = { count: 0, users: [] };
              acc[r.emoji].count += 1;
              acc[r.emoji].users.push(r.userId);
              return acc;
            },
            {}
          );

          return (
            <div
              key={msg.id}
              className="group relative flex gap-3 -mx-5 px-5 py-1.5 hover:bg-gray-50/80 transition-colors"
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-md overflow-hidden bg-gray-200 flex-shrink-0 flex items-center justify-center text-sm font-bold text-gray-600">
                {msg.sender.avatarUrl ? (
                  <img src={msg.sender.avatarUrl} alt={msg.sender.displayName} className="w-full h-full object-cover" />
                ) : (
                  msg.sender.displayName.slice(0, 1)
                )}
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[14px] text-gray-900">{msg.sender.displayName}</span>
                  {isAgent && (
                    <span className="bg-gray-200 text-gray-700 text-[10px] font-semibold px-1 py-0.5 rounded leading-none uppercase">
                      APP
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400">{formattedTime}</span>
                </div>

                <div className="text-[14px] text-gray-800 leading-relaxed mt-0.5 break-words">
                  {msg.metadata?.status === "thinking" ? (
                    <div className="flex items-center gap-2 text-gray-500 py-1 font-medium text-xs">
                      <span className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
                      </span>
                      <span>{msg.content}</span>
                    </div>
                  ) : (
                    renderFormattedContent(msg.content)
                  )}
                </div>

                {/* Slack-style Clean Bot Attachment Card */}
                {appMeta && (
                  <div className="mt-2.5 max-w-lg border-l-4 border-[#007A5A] pl-3 py-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">{appMeta.appTitle}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        Running
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 mt-0.5">
                      Isolated Micro-Environment • Port {appMeta.containerPort || 3000}
                    </div>

                    {/* Slack-like action buttons */}
                    <div className="flex items-center gap-2 mt-2">
                      {onOpenAppPreview && (
                        <button
                          onClick={() => onOpenAppPreview(appMeta)}
                          className="px-3 py-1 bg-white hover:bg-gray-50 border border-gray-300 rounded font-semibold text-xs text-gray-800 shadow-xs flex items-center gap-1.5 transition-colors"
                        >
                          <PanelRight size={13} className="text-gray-600" />
                          <span>Preview in Split Pane</span>
                        </button>
                      )}

                      <a
                        href={appMeta.appUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-white hover:bg-gray-50 border border-gray-300 rounded text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors"
                        title="Open in new window"
                      >
                        <ExternalLink size={12} />
                        <span>Open Window</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Reactions */}
                {Object.keys(reactionCounts).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {Object.entries(reactionCounts).map(([emoji, data]) => {
                      const hasReacted = currentUserId && data.users.includes(currentUserId);
                      return (
                        <button
                          key={emoji}
                          onClick={() => onToggleReaction(msg.id, emoji)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                            hasReacted
                              ? "bg-blue-50 border-blue-300 text-blue-700"
                              : "bg-gray-100/80 border-gray-200 hover:bg-gray-200/80 text-gray-700"
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="text-[11px] font-semibold">{data.count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Thread replies footer */}
                {msg.replyCount > 0 && (
                  <button
                    onClick={() => onOpenThread(msg)}
                    className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline group/thread"
                  >
                    <span>
                      ↳ {msg.replyCount} {msg.replyCount === 1 ? "reply" : "replies"}
                    </span>
                    <span className="text-[11px] text-gray-400 font-normal group-hover/thread:text-gray-500">
                      View thread
                    </span>
                  </button>
                )}
              </div>

              {/* Floating Action Bar on Hover */}
              <div className="absolute right-4 -top-3 hidden group-hover:flex items-center bg-white border border-gray-200 rounded-lg shadow-sm px-1 py-0.5 gap-0.5 z-10">
                {quickEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => onToggleReaction(msg.id, emoji)}
                    className="p-1 hover:bg-gray-100 rounded text-sm transition-transform hover:scale-115"
                    title={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}

                <div className="w-[1px] h-4 bg-gray-200 mx-1" />

                <button
                  onClick={() => onOpenThread(msg)}
                  className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
                  title="Reply in thread"
                >
                  <MessageSquare size={14} />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
