import React, { useState } from "react";
import {
  Inbox,
  ShieldAlert,
  Send,
  CheckCircle2,
  XCircle,
  Undo2,
  Hash,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { FeedItem, ChannelItem } from "../api";

interface FeedViewProps {
  items: FeedItem[];
  channels: ChannelItem[];
  currentUserName?: string;
  onResolveItem: (
    feedId: string,
    payload: {
      status: "allowed" | "denied" | "sent" | "dismissed" | "pending";
      note?: string;
      draftBody?: string;
    }
  ) => void;
  onJumpToChannel: (channelId: string) => void;
}

export const FeedView: React.FC<FeedViewProps> = ({
  items,
  channels,
  currentUserName = "Mara Jensen",
  onResolveItem,
  onJumpToChannel,
}) => {
  const [filterPrompt, setFilterPrompt] = useState(
    "Rank cold-chain SLA alerts (> 5°C) and enterprise renewal drafts above €100k ARR as Urgent."
  );
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({});
  const [expandedCmds, setExpandedCmds] = useState<Record<string, boolean>>({});

  const pendingItems = items.filter((i) => i.status === "pending");
  const handledItems = items.filter((i) => i.status !== "pending");

  const getChannelName = (channelId?: string | null) => {
    if (!channelId) return "workspace";
    return channels.find((c) => c.id === channelId)?.name || "channel";
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto">
      {/* Header */}
      <div className="h-12 px-6 border-b border-zinc-200/80 flex items-center justify-between flex-shrink-0 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-[#efebfe] text-[#5b40d6] flex items-center justify-center">
            <Inbox size={14} />
          </div>
          <h2 className="font-bold text-zinc-900 text-[14px] tracking-tight">
            Personal Triage Feed
          </h2>
          <span className="text-xs text-zinc-400">
            · Approvals, External Communication Drafts & Decisions
          </span>
        </div>

        <button
          onClick={() => setIsEditingPrompt(!isEditingPrompt)}
          className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200/70 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
        >
          <Sparkles size={12} className="text-[#5b40d6]" />
          <span>Manage my feed</span>
        </button>
      </div>

      <div className="max-w-3xl w-full mx-auto px-6 py-6 space-y-6">
        {/* Chief-of-Staff Feed Filter Prompt */}
        {isEditingPrompt && (
          <div className="p-4 rounded-xl border border-[#5b40d6]/25 bg-[#efebfe]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#5b40d6]" />
                <span>Personal Chief-of-Staff Ranking Prompt</span>
              </span>
              <button
                onClick={() => setIsEditingPrompt(false)}
                className="text-xs font-semibold text-[#5b40d6] hover:underline"
              >
                Save rules
              </button>
            </div>
            <textarea
              rows={2}
              value={filterPrompt}
              onChange={(e) => setFilterPrompt(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-800 outline-none focus:border-[#5b40d6]"
            />
          </div>
        )}

        {/* Active Triage Queue */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Needs Your Decision ({pendingItems.length})
            </h3>
            <span className="text-[11px] text-zinc-400">
              External emails & Vault actions never run without your approval
            </span>
          </div>

          {pendingItems.length === 0 ? (
            <div className="p-8 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 text-center space-y-1">
              <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-1" />
              <div className="font-semibold text-sm text-zinc-800">
                You're all caught up!
              </div>
              <p className="text-xs text-zinc-500">
                No pending agent approvals or external communication drafts.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingItems.map((item) => {
                const isDraft = item.kind === "draft" || !!item.draftBody;
                const currentDraft =
                  draftEdits[item.id] !== undefined
                    ? draftEdits[item.id]
                    : item.draftBody || "";

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs hover:border-zinc-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.priority === "urgent"
                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                              : item.priority === "high"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {item.priority}
                        </span>
                        <span className="font-bold text-zinc-900 text-[13.5px]">
                          {item.title}
                        </span>
                      </div>

                      {item.channelId && (
                        <button
                          onClick={() => onJumpToChannel(item.channelId!)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-[11px] font-medium transition-colors flex-shrink-0"
                        >
                          <Hash size={11} />
                          <span>{getChannelName(item.channelId)}</span>
                        </button>
                      )}
                    </div>

                    {item.summary && (
                      <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
                        {item.summary}
                      </p>
                    )}

                    {item.commandLine && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCmds((p) => ({ ...p, [item.id]: !p[item.id] }))
                          }
                          className="text-[11px] text-zinc-500 hover:text-zinc-800 font-medium inline-flex items-center gap-1"
                        >
                          {expandedCmds[item.id] ? (
                            <ChevronDown size={12} />
                          ) : (
                            <ChevronRight size={12} />
                          )}
                          <span>Inspect Vault command</span>
                        </button>
                        {expandedCmds[item.id] && (
                          <pre className="mt-1.5 p-2.5 rounded-lg bg-[#18181b] text-zinc-200 font-mono text-[11px] overflow-x-auto">
                            {item.commandLine}
                          </pre>
                        )}
                      </div>
                    )}

                    {isDraft && (
                      <div className="mt-3 space-y-2">
                        {item.draftHeader && (
                          <pre className="px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200/80 text-zinc-600 font-mono text-[11px] whitespace-pre-wrap">
                            {item.draftHeader}
                          </pre>
                        )}
                        <textarea
                          rows={4}
                          value={currentDraft}
                          onChange={(e) =>
                            setDraftEdits((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          className="w-full p-2.5 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-800 leading-relaxed outline-none focus:border-[#5b40d6]"
                        />
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isDraft ? (
                          <button
                            onClick={() =>
                              onResolveItem(item.id, {
                                status: "sent",
                                draftBody: currentDraft,
                                note: `Approved & sent by ${currentUserName}`,
                              })
                            }
                            className="px-3 py-1.5 rounded-lg bg-[#5b40d6] hover:bg-[#4b30c2] text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                          >
                            <Send size={11} />
                            <span>Send it</span>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                onResolveItem(item.id, {
                                  status: "allowed",
                                  note: `Allowed once by ${currentUserName}`,
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-[#5b40d6] hover:bg-[#4b30c2] text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                            >
                              <ShieldAlert size={12} />
                              <span>Allow</span>
                            </button>
                            <button
                              onClick={() =>
                                onResolveItem(item.id, {
                                  status: "allowed",
                                  note: `2-day lease granted by ${currentUserName}`,
                                })
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 font-medium text-xs transition-colors"
                            >
                              Allow for 2 days
                            </button>
                          </>
                        )}

                        <button
                          onClick={() =>
                            onResolveItem(item.id, {
                              status: isDraft ? "dismissed" : "denied",
                              note: `Declined by ${currentUserName}`,
                            })
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 text-zinc-600 hover:text-rose-600 font-medium text-xs transition-colors"
                        >
                          {isDraft ? "Hold draft" : "Deny"}
                        </button>
                      </div>

                      <span className="text-[11px] text-zinc-400">
                        Guardrail verified
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Handled Today Section with Undo */}
        {handledItems.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
              Handled Today ({handledItems.length})
            </h3>
            <div className="space-y-2">
              {handledItems.map((item) => {
                const isOk = item.status === "allowed" || item.status === "sent";
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-zinc-200/70 bg-zinc-50/70 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isOk ? (
                        <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                      ) : (
                        <XCircle size={14} className="text-rose-500 flex-shrink-0" />
                      )}
                      <span className="font-semibold text-zinc-800 truncate">
                        {item.title}
                      </span>
                      <span className="text-zinc-400 capitalize">({item.status})</span>
                    </div>
                    <button
                      onClick={() => onResolveItem(item.id, { status: "pending" })}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 px-2 py-0.5 rounded hover:bg-zinc-200/60"
                    >
                      <Undo2 size={11} />
                      <span>Undo</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
