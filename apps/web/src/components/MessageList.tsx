import React, { useState } from "react";
import {
  MessageSquare,
  ExternalLink,
  PanelRight,
  Smile,
  Copy,
  Check,
  UserPlus,
  ChevronDown,
  ChevronRight,
  Terminal,
  Cpu,
  ShieldAlert,
  Send,
  Square,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import type { MessageItem, AttentionCardPayload } from "../api";
import type { ActiveAppArtifact } from "./ArtifactPanel";
import { SlackMarkdown } from "./SlackMarkdown";
import { BotFace } from "./BotFace";

interface MessageListProps {
  messages: MessageItem[];
  currentUserId?: string;
  currentUserName?: string;
  catchUpSummary?: {
    channelName: string;
    messageCount: number;
    summary: string;
  } | null;
  onDismissCatchUp?: () => void;
  onOpenThread: (message: MessageItem) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onOpenAppPreview?: (artifact: ActiveAppArtifact) => void;
  onAcceptBotInvite?: (messageId: string, botUserId: string, listenMode: "mention" | "all") => void;
  onDismissBotInvite?: (messageId: string) => void;
  onOpenBotProfile?: (botUserId: string) => void;
  onStopTurn?: () => void;
  onResolveAttention?: (
    messageId: string,
    payload: {
      action: "allowed" | "denied" | "answered" | "sent" | "dismissed";
      note?: string;
      selectedOption?: string;
      editedDraft?: string;
    }
  ) => void;
  onOpenWikiPath?: (path: string) => void;
}

const InlineAttentionCard: React.FC<{
  messageId: string;
  attention: AttentionCardPayload;
  currentUserName?: string;
  onResolve?: (
    messageId: string,
    payload: {
      action: "allowed" | "denied" | "answered" | "sent" | "dismissed";
      note?: string;
      selectedOption?: string;
      editedDraft?: string;
    }
  ) => void;
}> = ({ messageId, attention, currentUserName = "Mara Jensen", onResolve }) => {
  const [showRawCommand, setShowRawCommand] = useState(false);
  const [note, setNote] = useState("");
  const [selectedOption, setSelectedOption] = useState<string>(
    attention.options?.[0]?.id || ""
  );
  const [editedDraft, setEditedDraft] = useState(attention.draftBody || "");

  // Settled state (after human decision)
  if (attention.status !== "pending") {
    const isPositive =
      attention.status === "allowed" ||
      attention.status === "sent" ||
      attention.status === "answered";

    return (
      <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200/90 bg-zinc-50/90 text-xs text-zinc-700">
        {isPositive ? (
          <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
        ) : (
          <XCircle size={14} className="text-rose-500 flex-shrink-0" />
        )}
        <span className="font-semibold capitalize">{attention.status}</span>
        <span>by {attention.decidedByName || currentUserName}</span>
        {attention.selectedOption && (
          <span className="px-1.5 py-0.2 rounded bg-[#efebfe] text-[#5b40d6] font-medium">
            {attention.selectedOption}
          </span>
        )}
        {attention.note && (
          <span className="text-zinc-500 italic">· “{attention.note}”</span>
        )}
      </div>
    );
  }

  // 1. Approval Card (Vault / Command Execution)
  if (attention.kind === "approval") {
    return (
      <div className="mt-3 max-w-xl rounded-xl border border-amber-200/90 bg-amber-50/40 p-3.5 shadow-2xs">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 flex items-center justify-center flex-shrink-0">
              <ShieldAlert size={13} />
            </div>
            <div>
              <div className="font-bold text-zinc-900 text-[12.5px]">
                {attention.title}
              </div>
              {attention.judgeLine && (
                <div className="text-[11px] text-amber-800/90 font-medium">
                  {attention.judgeLine}
                </div>
              )}
            </div>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            Vault Ask
          </span>
        </div>

        {attention.summary && (
          <p className="text-xs text-zinc-700 mt-2 leading-relaxed">
            {attention.summary}
          </p>
        )}

        {attention.commandLine && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowRawCommand(!showRawCommand)}
              className="text-[11px] text-zinc-500 hover:text-zinc-800 font-medium inline-flex items-center gap-1"
            >
              {showRawCommand ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span>{showRawCommand ? "Hide command" : "Show command"}</span>
            </button>
            {showRawCommand && (
              <pre className="mt-1.5 p-2.5 rounded-lg bg-[#18181b] text-zinc-200 font-mono text-[11px] overflow-x-auto">
                {attention.commandLine}
              </pre>
            )}
          </div>
        )}

        <div className="mt-2.5 flex items-center gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note for agent or audit log..."
            className="flex-1 px-2.5 py-1 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-800 outline-none focus:border-[#5b40d6]"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-amber-200/60">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                onResolve?.(messageId, { action: "allowed", note: note || undefined })
              }
              className="px-3 py-1.5 rounded-lg bg-[#5b40d6] hover:bg-[#4b30c2] text-white font-semibold text-xs transition-colors shadow-2xs"
            >
              Allow once
            </button>
            <button
              type="button"
              onClick={() =>
                onResolve?.(messageId, {
                  action: "allowed",
                  note: note ? `${note} (2-day lease)` : "2-day agent lease granted",
                })
              }
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200/90 font-medium text-xs transition-colors"
            >
              Allow for 2 days
            </button>
            <button
              type="button"
              onClick={() =>
                onResolve?.(messageId, { action: "denied", note: note || "Denied by reviewer" })
              }
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-zinc-200/90 hover:border-rose-200 font-medium text-xs transition-colors"
            >
              Deny
            </button>
          </div>
          {attention.deciders && (
            <span className="text-[10.5px] text-zinc-400">
              Deciders: {attention.deciders.join(", ")}
            </span>
          )}
        </div>
      </div>
    );
  }

  // 2. External Communication Draft Card (Laze Feed Guardrail)
  if (attention.kind === "draft") {
    return (
      <div className="mt-3 max-w-xl rounded-xl border border-zinc-200/90 bg-zinc-50/70 p-3.5 shadow-2xs">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-200/70">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#efebfe] text-[#5b40d6] flex items-center justify-center flex-shrink-0">
              <Send size={12} />
            </div>
            <div>
              <div className="font-bold text-zinc-900 text-[12.5px]">
                {attention.title}
              </div>
              {attention.summary && (
                <div className="text-[11px] text-zinc-500">{attention.summary}</div>
              )}
            </div>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#efebfe] text-[#5b40d6]">
            External Draft
          </span>
        </div>

        {attention.draftHeader && (
          <pre className="mt-2 px-2.5 py-1.5 rounded-lg bg-zinc-100 text-zinc-600 font-mono text-[11px] whitespace-pre-wrap border border-zinc-200/70">
            {attention.draftHeader}
          </pre>
        )}

        <textarea
          rows={5}
          value={editedDraft}
          onChange={(e) => setEditedDraft(e.target.value)}
          className="mt-2 w-full p-2.5 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-800 leading-relaxed focus:border-[#5b40d6] outline-none font-sans"
        />

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                onResolve?.(messageId, {
                  action: "sent",
                  editedDraft,
                  note: "Reviewed & sent",
                })
              }
              className="px-3 py-1.5 rounded-lg bg-[#5b40d6] hover:bg-[#4b30c2] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Send size={11} />
              <span>Send it</span>
            </button>
            <button
              type="button"
              onClick={() => onResolve?.(messageId, { action: "dismissed" })}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-600 font-medium text-xs transition-colors"
            >
              Hold draft
            </button>
          </div>
          <span className="text-[10.5px] text-zinc-400">
            Editable before sending • Guardrail active
          </span>
        </div>
      </div>
    );
  }

  // 3. Structured Multi-Option Question Card
  return (
    <div className="mt-3 max-w-xl rounded-xl border border-zinc-200/90 bg-zinc-50/70 p-3.5 shadow-2xs">
      <div className="font-bold text-zinc-900 text-[12.5px]">{attention.title}</div>
      {attention.summary && (
        <p className="text-[11.5px] text-zinc-500 mt-0.5">{attention.summary}</p>
      )}

      <div className="mt-2.5 space-y-1.5">
        {(attention.options || []).map((opt) => {
          const active = selectedOption === opt.id;
          return (
            <label
              key={opt.id}
              onClick={() => setSelectedOption(opt.id)}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                active
                  ? "border-[#5b40d6] bg-[#efebfe]/40"
                  : "border-zinc-200/90 bg-white hover:bg-zinc-50"
              }`}
            >
              <input
                type="radio"
                checked={active}
                onChange={() => setSelectedOption(opt.id)}
                className="mt-0.5 accent-[#5b40d6]"
              />
              <div className="min-w-0">
                <div className="font-semibold text-xs text-zinc-900">{opt.label}</div>
                {opt.description && (
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    {opt.description}
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const chosen = attention.options?.find((o) => o.id === selectedOption);
            onResolve?.(messageId, {
              action: "answered",
              selectedOption: chosen?.label || selectedOption,
            });
          }}
          className="px-3 py-1.5 rounded-lg bg-[#5b40d6] hover:bg-[#4b30c2] text-white font-semibold text-xs transition-colors shadow-2xs"
        >
          Send answer
        </button>
        <button
          type="button"
          onClick={() => onResolve?.(messageId, { action: "dismissed" })}
          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-600 font-medium text-xs transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  currentUserName,
  catchUpSummary,
  onDismissCatchUp,
  onOpenThread,
  onToggleReaction,
  onOpenAppPreview,
  onAcceptBotInvite,
  onDismissBotInvite,
  onOpenBotProfile,
  onStopTurn,
  onResolveAttention,
  onOpenWikiPath,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedStepsMsgIds, setExpandedStepsMsgIds] = useState<Record<string, boolean>>({});
  const [inviteModes, setInviteModes] = useState<Record<string, "mention" | "all">>({});

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const toggleSteps = (msgId: string) => {
    setExpandedStepsMsgIds((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1.5">
      {/* Collapsible AI Catch-Up Summary Banner */}
      {catchUpSummary && (
        <div className="mb-4 p-4 rounded-xl border border-[#5b40d6]/25 bg-gradient-to-r from-[#efebfe]/70 via-white to-[#fbe3cf]/40 shadow-xs animate-laze-message">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#5b40d6] text-white flex items-center justify-center">
                <Sparkles size={13} />
              </span>
              <div>
                <h4 className="text-xs font-bold text-zinc-900">
                  Catch-up Summary for #{catchUpSummary.channelName}
                </h4>
                <span className="text-[10.5px] text-zinc-500">
                  Synthesized from the last {catchUpSummary.messageCount} messages
                </span>
              </div>
            </div>
            <button
              onClick={onDismissCatchUp}
              className="text-xs text-zinc-500 hover:text-zinc-800 px-2 py-0.5 rounded hover:bg-black/5"
            >
              Dismiss
            </button>
          </div>
          <div className="text-xs text-zinc-800 leading-relaxed pl-8">
            <SlackMarkdown content={catchUpSummary.summary} onOpenWiki={onOpenWikiPath} />
          </div>
        </div>
      )}

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

          if (msg.metadata?.system) {
            return (
              <div
                key={msg.id}
                className="py-1 text-xs text-zinc-500 flex items-center gap-2 select-none"
              >
                <span className="text-zinc-400">↳</span>
                <span className="font-semibold text-zinc-800">{msg.sender.displayName}</span>
                <span>{msg.content}</span>
                <span className="text-[10px] text-zinc-400">{formattedTime}</span>
              </div>
            );
          }

          const appMeta =
            msg.metadata?.type === "interactive_app"
              ? (msg.metadata as unknown as ActiveAppArtifact)
              : null;

          const pendingInvite = msg.metadata?.pendingBotInvite;
          const steps = msg.metadata?.steps || [];
          const isThinking = msg.metadata?.status === "thinking";
          const isStepsOpen = expandedStepsMsgIds[msg.id] ?? isThinking;

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
              className="group relative flex gap-3 -mx-6 px-6 py-2.5 hover:bg-zinc-50/75 transition-colors animate-laze-message"
            >
              {/* Avatar */}
              <div
                onClick={() => isAgent && onOpenBotProfile?.(msg.sender.id)}
                className={`w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center select-none ${
                  isAgent
                    ? "bg-zinc-50 border border-zinc-200 cursor-pointer hover:border-[#5b40d6]/50"
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

              {/* Message Body */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <span
                    onClick={() => isAgent && onOpenBotProfile?.(msg.sender.id)}
                    className={`font-bold text-[13.5px] text-zinc-900 tracking-tight ${
                      isAgent ? "hover:text-[#5b40d6] cursor-pointer" : ""
                    }`}
                  >
                    {msg.sender.displayName}
                  </span>
                  {isAgent && (
                    <span className="text-[9.5px] font-semibold tracking-wide uppercase px-1.5 py-0.2 bg-[#efebfe] text-[#5b40d6] rounded border border-[#5b40d6]/20 leading-none">
                      Agent
                    </span>
                  )}
                  {msg.metadata?.duration && !isThinking && (
                    <span className="text-[10px] font-mono text-zinc-400">
                      · {msg.metadata.duration}
                    </span>
                  )}
                  <span className="text-[11px] text-zinc-400 font-normal">
                    {formattedTime}
                  </span>
                </div>

                {/* Live Steps & Subagents Disclosure Bar (Laze Live Steps) */}
                {(isThinking || steps.length > 0) && (
                  <div className="mt-1.5 mb-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSteps(msg.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100/90 hover:bg-zinc-200/70 border border-zinc-200/80 text-[11.5px] font-medium text-zinc-700 transition-colors"
                      >
                        {isThinking ? (
                          <Loader2 size={12} className="animate-spin text-[#5b40d6]" />
                        ) : isStepsOpen ? (
                          <ChevronDown size={12} className="text-zinc-500" />
                        ) : (
                          <ChevronRight size={12} className="text-zinc-500" />
                        )}
                        <span className={isThinking ? "laze-working-shimmer font-semibold" : ""}>
                          {isThinking
                            ? `${msg.sender.displayName} is working…`
                            : `${steps.length} ${steps.length === 1 ? "step" : "steps"} completed`}
                        </span>
                      </button>

                      {/* Stop Turn Button for any human in the channel */}
                      {isThinking && onStopTurn && (
                        <button
                          type="button"
                          onClick={onStopTurn}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[11px] font-semibold transition-colors"
                          title="Stop this agent turn (/stop)"
                        >
                          <Square size={10} className="fill-current" />
                          <span>Stop</span>
                        </button>
                      )}
                    </div>

                    {isStepsOpen && steps.length > 0 && (
                      <div className="mt-1.5 pl-2.5 border-l-2 border-zinc-200 space-y-1.5 py-1">
                        {steps.map((s, idx) => (
                          <div
                            key={s.id || idx}
                            className="flex items-start gap-2 text-[11.5px] text-zinc-600"
                          >
                            {s.kind === "subagent" ? (
                              <Cpu size={12} className="text-[#5b40d6] mt-0.5 flex-shrink-0" />
                            ) : (
                              <Terminal size={12} className="text-zinc-400 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-zinc-800">{s.label}</span>
                                {s.duration && (
                                  <span className="text-[10px] font-mono text-zinc-400">
                                    ({s.duration})
                                  </span>
                                )}
                                {s.status === "done" && (
                                  <Check size={11} className="text-emerald-600" />
                                )}
                              </div>
                              {(s.detail || s.task) && (
                                <div className="text-[10.5px] text-zinc-500 font-mono truncate">
                                  {s.task || s.detail}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Main Markdown Content */}
                {!isThinking && (
                  <div className="text-[14px] text-zinc-800 leading-[1.48] mt-0.5 break-words">
                    <SlackMarkdown content={msg.content} onOpenWiki={onOpenWikiPath} />
                  </div>
                )}

                {/* Pending Bot Mention Invite with Listen Mode Picker */}
                {pendingInvite && (
                  <div className="mt-2.5 p-3.5 rounded-xl border border-zinc-200/90 bg-zinc-50/80 max-w-md shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center flex-shrink-0">
                        <BotFace look={pendingInvite.avatarLabel || "1.7.0.0"} size={28} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-zinc-900 text-xs">
                          @{pendingInvite.name} is not in this channel
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Add them to this channel and choose when they should speak:
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 ml-10 flex items-center gap-2 text-[11px]">
                      <select
                        value={inviteModes[msg.id] || "mention"}
                        onChange={(e) =>
                          setInviteModes((prev) => ({
                            ...prev,
                            [msg.id]: e.target.value as "mention" | "all",
                          }))
                        }
                        className="px-2 py-1 rounded-lg border border-zinc-200 bg-white text-zinc-700 font-medium text-xs outline-none"
                      >
                        <option value="mention">When @mentioned</option>
                        <option value="all">Every message in channel</option>
                      </select>

                      <button
                        onClick={() =>
                          onAcceptBotInvite?.(
                            msg.id,
                            pendingInvite.userId,
                            inviteModes[msg.id] || "mention"
                          )
                        }
                        className="px-3 py-1 bg-[#5b40d6] hover:bg-[#4b30c2] text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1.5"
                      >
                        <UserPlus size={12} />
                        <span>Add Agent</span>
                      </button>

                      <button
                        onClick={() => onDismissBotInvite?.(msg.id)}
                        className="px-2.5 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-600 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Attention Card (Approvals, External Drafts, Questions) */}
                {msg.metadata?.attention && (
                  <InlineAttentionCard
                    messageId={msg.id}
                    attention={msg.metadata.attention}
                    currentUserName={currentUserName}
                    onResolve={onResolveAttention}
                  />
                )}

                {/* Interactive App Card */}
                {appMeta && (
                  <div className="mt-2.5 max-w-lg rounded-xl border border-[#5b40d6]/25 bg-gradient-to-br from-[#efebfe]/40 via-white to-zinc-50 p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[13px] text-zinc-900 tracking-tight">
                          {appMeta.appTitle}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10.5px] bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.2 rounded-full font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Live App {appMeta.version ? `v${appMeta.version}` : ""}
                        </span>
                      </div>
                      <span className="text-[10.5px] font-mono text-zinc-400">
                        EU DB • Reactive
                      </span>
                    </div>

                    <div className="text-[11.5px] text-zinc-600 mt-1">
                      Side-by-side internal application with isolated Draft & Live records
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      {onOpenAppPreview && (
                        <button
                          onClick={() => onOpenAppPreview(appMeta)}
                          className="px-3 py-1.5 bg-[#5b40d6] hover:bg-[#4b30c2] text-white rounded-lg font-semibold text-xs shadow-2xs flex items-center gap-1.5 transition-colors"
                        >
                          <PanelRight size={13} />
                          <span>Open Side-by-Side</span>
                        </button>
                      )}

                      <a
                        href={appMeta.appUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200/90 rounded-lg text-xs text-zinc-700 hover:text-zinc-900 flex items-center gap-1 transition-colors shadow-2xs font-medium"
                      >
                        <ExternalLink size={12} className="text-zinc-400" />
                        <span>New Tab</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Reactions */}
                {Object.keys(reactionCounts).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(reactionCounts).map(([emoji, data]) => {
                      const hasReacted =
                        currentUserId && data.users.includes(currentUserId);
                      return (
                        <button
                          key={emoji}
                          onClick={() => onToggleReaction(msg.id, emoji)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                            hasReacted
                              ? "bg-[#efebfe] border-[#5b40d6]/30 text-[#5b40d6]"
                              : "bg-zinc-50 border-zinc-200/80 hover:bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px]">{data.count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Thread Replies Link */}
                {msg.replyCount > 0 && (
                  <button
                    onClick={() => onOpenThread(msg)}
                    className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-[#5b40d6] hover:underline group/thread"
                  >
                    <MessageSquare size={12} />
                    <span>
                      {msg.replyCount} {msg.replyCount === 1 ? "reply" : "replies"}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-normal group-hover/thread:text-zinc-600">
                      • View thread
                    </span>
                  </button>
                )}
              </div>

              {/* Hover Action Toolbar */}
              <div className="absolute right-4 -top-3 hidden group-hover:flex items-center bg-white border border-zinc-200/90 rounded-lg shadow-sm px-1 py-0.5 gap-0.5 z-10">
                <button
                  onClick={() => onToggleReaction(msg.id, "👍")}
                  className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-800 transition-colors"
                  title="React 👍"
                >
                  <Smile size={13} />
                </button>
                <button
                  onClick={() => onToggleReaction(msg.id, "🚀")}
                  className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-800 transition-colors text-xs"
                  title="React 🚀"
                >
                  🚀
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
