import React, { useState, useRef } from "react";
import { Bold, Italic, Code, Link2, ArrowUp, Paperclip } from "lucide-react";

interface MessageComposerProps {
  placeholder?: string;
  onSendMessage: (content: string) => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  placeholder = "Send a message...",
  onSendMessage,
}) => {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    <div className="px-6 pb-5 pt-1">
      <div className="border border-zinc-200/90 rounded-xl bg-white shadow-2xs focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-100 transition-all overflow-hidden">
        {/* Formatting Toolbar */}
        <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-zinc-100 bg-zinc-50/50 text-zinc-400">
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
            title="Code"
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
        </div>

        {/* Text Input Area */}
        <div className="px-3.5 pt-2 pb-1.5">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none border-0 p-0 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 max-h-48 leading-relaxed"
          />
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-white">
          <div className="flex items-center gap-1 text-zinc-400">
            <button
              type="button"
              className="p-1 hover:bg-zinc-100 rounded hover:text-zinc-600 transition-colors"
              title="Attach File"
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
                ? "bg-zinc-900 text-white hover:bg-zinc-800 shadow-2xs"
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

