import React from "react";
import { X, CornerDownRight, Sparkles } from "lucide-react";
import type { MessageItem } from "../api";
import { MessageComposer } from "./MessageComposer";
import { SlackMarkdown } from "./SlackMarkdown";

interface ThreadDrawerProps {
  parentMessage: MessageItem | null;
  replies: MessageItem[];
  channelName: string;
  onClose: () => void;
  onSendReply: (content: string) => void;
}

export const ThreadDrawer: React.FC<ThreadDrawerProps> = ({
  parentMessage,
  replies,
  channelName,
  onClose,
  onSendReply,
}) => {
  if (!parentMessage) return null;

  return (
    <div className="w-96 border-l border-zinc-200/90 bg-white flex flex-col flex-shrink-0 z-20 h-full shadow-lg">
      {/* Header */}
      <div className="h-12 border-b border-zinc-200/90 px-4 flex items-center justify-between flex-shrink-0 select-none">
        <div>
          <h3 className="font-semibold text-zinc-900 text-[13px] tracking-tight">Thread</h3>
          <span className="text-[11px] text-zinc-400">#{channelName}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-md hover:bg-zinc-100 transition-colors"
          title="Close thread"
        >
          <X size={15} />
        </button>
      </div>

      {/* Thread Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Parent Message */}
        <div className="flex gap-3 pb-3 border-b border-zinc-100">
          <div className="w-7 h-7 rounded-lg bg-zinc-100 border border-zinc-200/70 overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-medium text-zinc-600">
            {parentMessage.sender.avatarUrl ? (
              <img src={parentMessage.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              parentMessage.sender.displayName.slice(0, 1)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-zinc-900 tracking-tight">
                {parentMessage.sender.displayName}
              </span>
              <span className="text-[10px] text-zinc-400 font-normal">
                {new Date(parentMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="text-[12.5px] text-zinc-800 mt-1 leading-relaxed break-words">
              <SlackMarkdown content={parentMessage.content} />
            </div>
          </div>
        </div>

        {/* Replies Header */}
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium tracking-wide uppercase">
          <CornerDownRight size={12} />
          <span>{replies.length} {replies.length === 1 ? "reply" : "replies"}</span>
        </div>

        {/* Replies List */}
        <div className="space-y-3">
          {replies.map((reply) => {
            const isAgent = reply.sender.userType === "agent";
            return (
              <div key={reply.id} className="flex gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-zinc-100 border border-zinc-200/70 overflow-hidden flex-shrink-0 flex items-center justify-center text-[10px] font-medium text-zinc-600">
                  {reply.sender.avatarUrl ? (
                    <img src={reply.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    reply.sender.displayName.slice(0, 1)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-zinc-900 tracking-tight">
                      {reply.sender.displayName}
                    </span>
                    {isAgent && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] bg-zinc-100 text-zinc-600 font-medium px-1 rounded border border-zinc-200/80">
                        <Sparkles size={8} />
                        Agent
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-400 font-normal">
                      {new Date(reply.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="text-[12.5px] text-zinc-800 mt-0.5 leading-relaxed break-words">
                    <SlackMarkdown content={reply.content} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reply Composer */}
      <div className="border-t border-zinc-200/90 pt-1.5 bg-zinc-50/50">
        <MessageComposer
          placeholder="Reply in thread..."
          onSendMessage={onSendReply}
        />
      </div>
    </div>
  );
};
