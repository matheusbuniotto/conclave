import React, { useState } from "react";
import { MessageSquare, Smile, Bot, CornerDownRight, ExternalLink, ChevronDown, ChevronUp, Play } from "lucide-react";
import type { MessageItem } from "../api";

interface MessageListProps {
  messages: MessageItem[];
  currentUserId?: string;
  onOpenThread: (message: MessageItem) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onOpenThread,
  onToggleReaction,
}) => {
  const quickEmojis = ["👍", "❤️", "🚀", "🎉", "👀"];
  const [expandedApps, setExpandedApps] = useState<Record<string, boolean>>({});

  const toggleAppExpand = (msgId: string) => {
    setExpandedApps((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // Helper to format content with basic markdown (bold, code blocks)
  const renderFormattedContent = (content: string) => {
    // If it contains triple backtick code blocks
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

          // Check if message includes generated interactive app
          const appMeta = msg.metadata?.type === "interactive_app" ? msg.metadata : null;
          const isExpanded = !!expandedApps[msg.id];

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
                    <span className="inline-flex items-center gap-0.5 text-[10px] bg-purple-100 text-purple-700 font-semibold px-1.5 py-0.2 rounded">
                      <Bot size={10} />
                      AI BOT
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400">{formattedTime}</span>
                </div>

                <div className="text-[14px] text-gray-800 leading-relaxed mt-0.5 break-words">
                  {renderFormattedContent(msg.content)}
                </div>

                {/* In-Chat Interactive App Card (Laze-style micro-app) */}
                {appMeta && (
                  <div className="mt-3 max-w-xl rounded-xl border border-blue-200 bg-blue-50/40 p-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center">
                          <Play size={12} fill="currentColor" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-gray-900 leading-tight">
                            {appMeta.appTitle as string}
                          </h4>
                          <span className="text-[11px] text-emerald-600 font-medium">
                            ● Running in Isolated Sandbox
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={appMeta.appUrl as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-2.5 py-1 rounded-md transition-colors"
                        >
                          <ExternalLink size={12} />
                          <span>Open Window</span>
                        </a>
                        <button
                          onClick={() => toggleAppExpand(msg.id)}
                          className="inline-flex items-center gap-1 text-xs text-gray-700 hover:text-gray-900 bg-white border border-gray-200 px-2.5 py-1 rounded-md transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp size={12} />
                              <span>Hide Preview</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown size={12} />
                              <span>Live Preview</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Sandboxed App Frame */}
                    {isExpanded && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-gray-300 bg-white shadow-inner">
                        <div className="bg-gray-100 px-3 py-1 text-[11px] font-mono text-gray-500 border-b flex justify-between items-center">
                          <span>{appMeta.appUrl as string}</span>
                          <span className="text-emerald-600 font-semibold">Local Docker Sandbox</span>
                        </div>
                        <iframe
                          src={appMeta.appUrl as string}
                          title={appMeta.appTitle as string}
                          className="w-full h-80 border-0"
                          sandbox="allow-scripts allow-forms allow-same-origin"
                        />
                      </div>
                    )}
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
                    <CornerDownRight size={13} className="text-blue-500" />
                    <span>
                      {msg.replyCount} {msg.replyCount === 1 ? "reply" : "replies"}
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
