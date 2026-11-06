import React, { useState, useRef, useMemo } from "react";
import {
  Bold,
  Italic,
  Code,
  Link2,
  ArrowUp,
  Paperclip,
  Terminal,
  AtSign,
  BookOpen,
  Square,
  Sparkles,
} from "lucide-react";
import type { BotItem, MemberItem, WikiPageItem } from "../api";
import { BotFace } from "./BotFace";

interface MessageComposerProps {
  placeholder?: string;
  bots?: BotItem[];
  members?: MemberItem[];
  wikiPages?: WikiPageItem[];
  onSendMessage: (content: string) => void;
  onStopTurn?: () => void;
}

interface AutocompleteItem {
  id: string;
  kind: "mention-bot" | "mention-human" | "slash" | "wiki";
  label: string;
  sublabel: string;
  badge?: string;
  avatarLabel?: string;
  insertText: string;
  immediateStop?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  placeholder = "Send a message...",
  bots = [],
  members = [],
  wikiPages = [],
  onSendMessage,
  onStopTurn,
}) => {
  const [text, setText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Detect active trigger token before end of text (@, /, or [[)
  const triggerInfo = useMemo(() => {
    const wikiMatch = text.match(/\[\[([^\]]*)$/);
    if (wikiMatch) {
      return { type: "wiki" as const, query: wikiMatch[1].toLowerCase(), fullMatch: wikiMatch[0] };
    }
    const slashMatch = text.match(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/);
    if (slashMatch) {
      return {
        type: "slash" as const,
        query: slashMatch[1].toLowerCase(),
        fullMatch: `/${slashMatch[1]}`,
      };
    }
    const mentionMatch = text.match(/(?:^|\s)@([a-zA-Z0-9_-]*)$/);
    if (mentionMatch) {
      return {
        type: "mention" as const,
        query: mentionMatch[1].toLowerCase(),
        fullMatch: `@${mentionMatch[1]}`,
      };
    }
    return null;
  }, [text]);

  const suggestions: AutocompleteItem[] = useMemo(() => {
    if (!triggerInfo) return [];
    const q = triggerInfo.query;

    if (triggerInfo.type === "mention") {
      const botItems: AutocompleteItem[] = bots
        .filter((b) => b.handle.toLowerCase().includes(q) || b.name.toLowerCase().includes(q))
        .map((b) => ({
          id: `bot-${b.id}`,
          kind: "mention-bot",
          label: `@${b.handle}`,
          sublabel: `${b.name} — ${b.description || "AI Agent"}`,
          badge: b.connectionMode === "cli" ? "CLI Agent" : b.engine.toUpperCase(),
          avatarLabel: b.avatarLabel,
          insertText: `@${b.handle} `,
        }));

      const humanItems: AutocompleteItem[] = members
        .filter(
          (m) =>
            m.userType === "human" &&
            m.displayName.toLowerCase().includes(q)
        )
        .map((m) => ({
          id: `user-${m.id}`,
          kind: "mention-human",
          label: `@${m.displayName.split(" ")[0].toLowerCase()}`,
          sublabel: `${m.displayName} (${m.role})`,
          badge: "Teammate",
          insertText: `@${m.displayName.split(" ")[0]} `,
        }));

      return [...botItems, ...humanItems].slice(0, 7);
    }

    if (triggerInfo.type === "slash") {
      const items: AutocompleteItem[] = [
        {
          id: "slash-stop",
          kind: "slash",
          label: "/stop",
          sublabel: "Stop the active agent turn in this channel immediately",
          badge: "System",
          insertText: "/stop",
          immediateStop: true,
        },
        {
          id: "slash-build",
          kind: "slash",
          label: "/build-app",
          sublabel: "Ask channel agent to build a side-by-side interactive micro-app with DB",
          badge: "App Kit",
          insertText: "Build an interactive tracker app for ",
        },
        {
          id: "slash-draft",
          kind: "slash",
          label: "/draft-email",
          sublabel: "Prepare an external email draft card for human approval in Feed",
          badge: "Guardrail",
          insertText: "Draft an external follow-up email for ",
        },
      ];

      for (const b of bots) {
        for (const sk of b.skills || []) {
          items.push({
            id: `skill-${b.id}-${sk.name}`,
            kind: "slash",
            label: `/${sk.name}`,
            sublabel: sk.description,
            badge: b.name,
            avatarLabel: b.avatarLabel,
            insertText: sk.prompt || `@${b.handle} /${sk.name} `,
          });
        }
      }

      return items
        .filter(
          (it) =>
            it.label.toLowerCase().includes(q) ||
            it.sublabel.toLowerCase().includes(q) ||
            (it.badge && it.badge.toLowerCase().includes(q))
        )
        .slice(0, 8);
    }

    if (triggerInfo.type === "wiki") {
      return wikiPages
        .filter(
          (w) =>
            w.path.toLowerCase().includes(q) || w.title.toLowerCase().includes(q)
        )
        .map((w): AutocompleteItem => ({
          id: `wiki-${w.id}`,
          kind: "wiki",
          label: `[[${w.path}]]`,
          sublabel: w.title,
          badge: `v${w.version}`,
          insertText: `[[${w.path}|${w.title}]] `,
        }))
        .slice(0, 6);
    }

    return [];
  }, [triggerInfo, bots, members, wikiPages]);

  const applySuggestion = (item: AutocompleteItem) => {
    if (!triggerInfo) return;
    if (item.immediateStop) {
      setText("");
      if (onStopTurn) onStopTurn();
      else onSendMessage("/stop");
      return;
    }

    const idx = text.lastIndexOf(triggerInfo.fullMatch);
    if (idx !== -1) {
      const updated = text.slice(0, idx) + item.insertText;
      setText(updated);
      setSelectedIndex(0);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        applySuggestion(suggestions[selectedIndex] || suggestions[0]);
        return;
      }
      if (e.key === "Escape") {
        setText((t) => t + " ");
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const formatSelection = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;

    const selectedText = current.substring(start, end);
    const replacement = `${prefix}${selectedText || "text"}${suffix}`;

    setText(current.substring(0, start) + replacement + current.substring(end));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selectedText.length || 4)
      );
    }, 0);
  };

  return (
    <div className="px-6 pb-4 pt-1 relative">
      {/* Laze Autocomplete Popover (@mentions, /skills, [[wiki]]) */}
      {suggestions.length > 0 && (
        <div className="absolute bottom-full left-6 right-6 mb-2 max-w-lg bg-white rounded-xl border border-zinc-200/90 shadow-xl overflow-hidden z-30 select-none">
          <div className="px-3 py-1.5 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
            <span>
              {triggerInfo?.type === "mention"
                ? "Mention Agent or Teammate"
                : triggerInfo?.type === "slash"
                ? "Slash Commands & Agent Skills"
                : "Link Workspace Memory & Wiki"}
            </span>
            <span className="font-mono text-[10px]">↑↓ Tab / Enter</span>
          </div>
          <div className="divide-y divide-zinc-100 max-h-60 overflow-y-auto">
            {suggestions.map((item, idx) => {
              const active = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applySuggestion(item)}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between gap-3 transition-colors ${
                    active ? "bg-[#efebfe]/65" : "hover:bg-zinc-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.avatarLabel ? (
                      <div className="w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center flex-shrink-0">
                        <BotFace look={item.avatarLabel} size={22} />
                      </div>
                    ) : item.immediateStop ? (
                      <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center flex-shrink-0">
                        <Square size={11} className="fill-current" />
                      </div>
                    ) : item.kind === "wiki" ? (
                      <div className="w-6 h-6 rounded-md bg-[#efebfe] text-[#5b40d6] flex items-center justify-center flex-shrink-0">
                        <BookOpen size={12} />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-md bg-zinc-100 text-zinc-600 flex items-center justify-center flex-shrink-0">
                        <Terminal size={12} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-zinc-900 font-mono">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate">
                        {item.sublabel}
                      </div>
                    </div>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200/80 flex-shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="border border-zinc-200/90 rounded-xl bg-white shadow-2xs focus-within:border-[#5b40d6] focus-within:ring-2 focus-within:ring-[#efebfe] transition-all overflow-hidden">
        {/* Formatting & Quick Ergonomics Toolbar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-100 bg-zinc-50/60 text-zinc-400">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => formatSelection("**")}
              className="p-1 hover:bg-zinc-200/60 rounded hover:text-zinc-700 transition-colors"
              title="Bold (⌘B)"
            >
              <Bold size={13} />
            </button>
            <button
              type="button"
              onClick={() => formatSelection("*")}
              className="p-1 hover:bg-zinc-200/60 rounded hover:text-zinc-700 transition-colors"
              title="Italic (⌘I)"
            >
              <Italic size={13} />
            </button>
            <button
              type="button"
              onClick={() => formatSelection("`")}
              className="p-1 hover:bg-zinc-200/60 rounded hover:text-zinc-700 transition-colors"
              title="Inline Code"
            >
              <Code size={13} />
            </button>
            <button
              type="button"
              onClick={() => formatSelection("[", "](url)")}
              className="p-1 hover:bg-zinc-200/60 rounded hover:text-zinc-700 transition-colors"
              title="Link"
            >
              <Link2 size={13} />
            </button>

            <div className="w-[1px] h-3.5 bg-zinc-200 mx-1" />

            {/* Quick Triggers for @agent, /skill, [[wiki]] */}
            <button
              type="button"
              onClick={() => {
                setText((prev) => (prev.endsWith(" ") || !prev ? `${prev}@` : `${prev} @`));
                textareaRef.current?.focus();
              }}
              className="px-1.5 py-0.5 hover:bg-zinc-200/60 rounded text-[11px] font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1 transition-colors"
              title="Mention an agent or teammate (@)"
            >
              <AtSign size={11} />
              <span>Mention</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setText((prev) => (prev.endsWith(" ") || !prev ? `${prev}/` : `${prev} /`));
                textareaRef.current?.focus();
              }}
              className="px-1.5 py-0.5 hover:bg-zinc-200/60 rounded text-[11px] font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1 transition-colors"
              title="Run agent skill or /stop command (/)"
            >
              <Sparkles size={11} className="text-[#5b40d6]" />
              <span>Skills</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setText((prev) => (prev.endsWith(" ") || !prev ? `${prev}[[` : `${prev} [[`));
                textareaRef.current?.focus();
              }}
              className="px-1.5 py-0.5 hover:bg-zinc-200/60 rounded text-[11px] font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1 transition-colors"
              title="Link Memory or Wiki page ([[)"
            >
              <BookOpen size={11} />
              <span>[[Wiki]]</span>
            </button>
          </div>

          <span className="text-[10.5px] text-zinc-400 hidden sm:inline">
            Type <code className="text-zinc-600 font-mono">@</code> for agents,{" "}
            <code className="text-zinc-600 font-mono">/</code> for skills,{" "}
            <code className="text-zinc-600 font-mono">[[</code> for wiki
          </span>
        </div>

        {/* Text Input Area */}
        <div className="px-3.5 pt-2.5 pb-1.5">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSelectedIndex(0);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none border-0 p-0 text-[13.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 max-h-48 leading-relaxed"
          />
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-white">
          <div className="flex items-center gap-1 text-zinc-400">
            <button
              type="button"
              className="p-1 hover:bg-zinc-100 rounded hover:text-zinc-600 transition-colors"
              title="Attach File or Screenshot"
            >
              <Paperclip size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim()}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              text.trim()
                ? "bg-[#5b40d6] text-white hover:bg-[#4b30c2] shadow-2xs"
                : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
            }`}
            title="Send (Return)"
          >
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
