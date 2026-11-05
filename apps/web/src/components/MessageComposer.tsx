import React, { useState, useRef } from "react";
import { Bold, Italic, Code, Link2, Smile, Send } from "lucide-react";

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
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 4));
    }, 0);
  };

  return (
    <div className="px-5 pb-5 pt-1">
      <div className="border border-gray-300 rounded-lg bg-white shadow-sm focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-400 transition-all overflow-hidden">
        {/* Formatting Toolbar */}
        <div className="flex items-center gap-0.5 px-2.5 py-1.5 border-b border-gray-100 bg-gray-50/70 text-gray-500">
          <button
            type="button"
            onClick={() => formatSelection("**")}
            className="p-1 hover:bg-gray-200/70 rounded hover:text-gray-800 transition-colors"
            title="Bold (Ctrl+B)"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            onClick={() => formatSelection("*")}
            className="p-1 hover:bg-gray-200/70 rounded hover:text-gray-800 transition-colors"
            title="Italic (Ctrl+I)"
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            onClick={() => formatSelection("`")}
            className="p-1 hover:bg-gray-200/70 rounded hover:text-gray-800 transition-colors"
            title="Code snippet"
          >
            <Code size={14} />
          </button>
          <button
            type="button"
            onClick={() => formatSelection("[", "](url)")}
            className="p-1 hover:bg-gray-200/70 rounded hover:text-gray-800 transition-colors"
            title="Link"
          >
            <Link2 size={14} />
          </button>
        </div>

        {/* Text Input Area */}
        <div className="px-3 pt-2 pb-1.5">
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
            className="w-full resize-none border-0 p-0 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 max-h-48"
          />
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-white">
          <div className="flex items-center gap-1 text-gray-400">
            <button
              type="button"
              onClick={() => setText((prev) => prev + " 😊")}
              className="p-1 hover:bg-gray-100 rounded hover:text-gray-600 transition-colors"
              title="Add emoji"
            >
              <Smile size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim()}
            className={`p-1.5 rounded-md transition-colors ${
              text.trim()
                ? "bg-[#007A5A] text-white hover:bg-[#148567]"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
            title="Send (Enter)"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
