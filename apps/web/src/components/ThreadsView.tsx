import React, { useState } from "react";
import { MessageSquare, Hash, Send, CornerDownRight } from "lucide-react";
import type { ThreadFeedItem } from "../api";
import { SlackMarkdown } from "./SlackMarkdown";
import { BotFace } from "./BotFace";

interface ThreadsViewProps {
  threads: ThreadFeedItem[];
  onReplyThread: (channelId: string, parentMessageId: string, content: string) => void;
  onJumpToChannel: (channelId: string) => void;
}

export const ThreadsView: React.FC<ThreadsViewProps> = ({
  threads,
  onReplyThread,
  onJumpToChannel,
}) => {
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const handleSend = (t: ThreadFeedItem) => {
    const val = (replyDrafts[t.id] || "").trim();
    if (!val) return;
    onReplyThread(t.channelId, t.id, val);
    setReplyDrafts((prev) => ({ ...prev, [t.id]: "" }));
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto">
      <div className="h-12 px-6 border-b border-zinc-200/80 flex items-center justify-between flex-shrink-0 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-[#efebfe] text-[#5b40d6] flex items-center justify-center">
            <MessageSquare size={14} />
          </div>
          <h2 className="font-bold text-zinc-900 text-[14px] tracking-tight">
            Threads
          </h2>
          <span className="text-xs text-zinc-400">
            · Active multi-agent and team discussions across channels
          </span>
        </div>
      </div>

      <div className="max-w-3xl w-full mx-auto px-6 py-6 space-y-5">
        {threads.length === 0 ? (
          <div className="p-8 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 text-center text-xs text-zinc-500">
            No active threads yet. Reply to any message in a channel to start a thread.
          </div>
        ) : (
          threads.map((t) => {
            const isAgent = t.sender.userType === "agent";
            return (
              <div
                key={t.id}
                className="rounded-2xl border border-zinc-200/90 bg-white overflow-hidden shadow-xs"
              >
                {/* Thread Channel Banner */}
                <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
                  <button
                    onClick={() => onJumpToChannel(t.channelId)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-800 hover:text-[#5b40d6]"
                  >
                    <Hash size={13} className="text-zinc-400" />
                    <span>{t.channelName}</span>
                  </button>
                  <span className="text-[11px] text-zinc-400">
                    {t.replies.length} {t.replies.length === 1 ? "reply" : "replies"}
                  </span>
                </div>

                {/* Root Message */}
                <div className="p-4 border-b border-zinc-100 flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {isAgent ? (
                      <BotFace look={t.sender.avatarUrl || "1.7.0.0"} size={26} />
                    ) : t.sender.avatarUrl ? (
                      <img src={t.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      t.sender.displayName.slice(0, 1)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-zinc-900">
                        {t.sender.displayName}
                      </span>
                      <span className="text-[10.5px] text-zinc-400">
                        {new Date(t.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-800">
                      <SlackMarkdown content={t.content} />
                    </div>
                  </div>
                </div>

                {/* Replies */}
                <div className="p-4 bg-zinc-50/40 space-y-3">
                  {t.replies.map((r) => {
                    const rAgent = r.sender.userType === "agent";
                    return (
                      <div key={r.id} className="flex gap-2.5 pl-2">
                        <CornerDownRight size={12} className="text-zinc-300 mt-1.5 flex-shrink-0" />
                        <div className="w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {rAgent ? (
                            <BotFace look={r.sender.avatarUrl || "1.7.0.0"} size={22} />
                          ) : r.sender.avatarUrl ? (
                            <img src={r.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            r.sender.displayName.slice(0, 1)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-zinc-900">
                              {r.sender.displayName}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {new Date(r.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-700 mt-0.5">
                            <SlackMarkdown content={r.content} />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Inline Reply Box */}
                  <div className="pt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={replyDrafts[t.id] || ""}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSend(t);
                      }}
                      placeholder={`Reply in #${t.channelName} thread...`}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-900 outline-none focus:border-[#5b40d6]"
                    />
                    <button
                      onClick={() => handleSend(t)}
                      className="px-3 py-1.5 rounded-lg bg-[#5b40d6] hover:bg-[#4b30c2] text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Send size={11} />
                      <span>Reply</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
