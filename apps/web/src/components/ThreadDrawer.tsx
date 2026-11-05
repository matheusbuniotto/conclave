import React from "react";
import { X, CornerDownRight, Bot } from "lucide-react";
import type { MessageItem } from "../api";
import { MessageComposer } from "./MessageComposer";

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
    <div className="w-96 border-l border-gray-200 bg-white flex flex-col flex-shrink-0 z-20 h-full">
      {/* Header */}
      <div className="h-13 border-b border-gray-200 px-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Thread</h3>
          <span className="text-xs text-gray-500">#{channelName}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100 transition-colors"
          title="Close thread"
        >
          <X size={18} />
        </button>
      </div>

      {/* Thread Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Parent Message */}
        <div className="flex gap-3 pb-3 border-b border-gray-100">
          <div className="w-8 h-8 rounded-md bg-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-600">
            {parentMessage.sender.avatarUrl ? (
              <img src={parentMessage.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              parentMessage.sender.displayName.slice(0, 1)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-xs text-gray-900">{parentMessage.sender.displayName}</span>
              <span className="text-[10px] text-gray-400">
                {new Date(parentMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="text-[13px] text-gray-800 mt-0.5 leading-relaxed break-words">
              {parentMessage.content}
            </div>
          </div>
        </div>

        {/* Replies Header */}
        <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">
          <CornerDownRight size={13} />
          <span>{replies.length} {replies.length === 1 ? "reply" : "replies"}</span>
        </div>

        {/* Replies List */}
        <div className="space-y-3">
          {replies.map((reply) => {
            const isAgent = reply.sender.userType === "agent";
            return (
              <div key={reply.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-md bg-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-600">
                  {reply.sender.avatarUrl ? (
                    <img src={reply.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    reply.sender.displayName.slice(0, 1)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-bold text-xs text-gray-900">{reply.sender.displayName}</span>
                    {isAgent && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] bg-purple-100 text-purple-700 font-semibold px-1 rounded">
                        <Bot size={9} />
                        AI
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">
                      {new Date(reply.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="text-[13px] text-gray-800 mt-0.5 leading-relaxed break-words">
                    {reply.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reply Composer */}
      <div className="border-t border-gray-200 pt-2 bg-gray-50/50">
        <MessageComposer
          placeholder="Reply in thread..."
          onSendMessage={onSendReply}
        />
      </div>
    </div>
  );
};
