import React from "react";
import { Hash, Lock, Users, Bot, Plus } from "lucide-react";
import type { ChannelItem } from "../api";

interface ChatHeaderProps {
  channel: ChannelItem | null;
  memberCount: number;
  botCount?: number;
  onOpenMembersModal?: () => void;
  onOpenCreateBotModal?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  channel,
  memberCount,
  botCount = 0,
  onOpenMembersModal,
  onOpenCreateBotModal,
}) => {
  const Icon = channel?.type === "private" ? Lock : Hash;

  return (
    <div className="h-12 border-b border-zinc-200/90 bg-white/95 backdrop-blur-sm px-5 flex items-center justify-between flex-shrink-0 z-10 select-none">
      <div className="flex items-center gap-2.5 truncate">
        <Icon size={16} className="text-zinc-400" />
        <span className="font-semibold text-zinc-900 text-[13.5px] tracking-tight">
          {channel?.name || "Select Channel"}
        </span>
        {channel?.topic && (
          <>
            <span className="text-zinc-300 text-xs">/</span>
            <span className="text-[12px] text-zinc-500 truncate max-w-md font-normal">
              {channel.topic}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Manage Bots in this Channel */}
        <button
          onClick={onOpenMembersModal}
          className="flex items-center gap-1.5 text-[11.5px] text-zinc-700 bg-white hover:bg-zinc-50 px-2.5 py-1 rounded-md cursor-pointer transition-colors border border-zinc-200/80 font-medium shadow-2xs"
          title="Manage Bots in Channel"
        >
          <Bot size={13} className="text-zinc-500" />
          <span>{botCount} {botCount === 1 ? "Bot" : "Bots"}</span>
        </button>

        {/* Member Counter Button */}
        <button
          onClick={onOpenMembersModal}
          className="flex items-center gap-1.5 text-[11.5px] text-zinc-600 bg-zinc-100 hover:bg-zinc-200/80 px-2.5 py-1 rounded-md cursor-pointer transition-colors border border-zinc-200/60 font-medium"
          title="Channel Members"
        >
          <Users size={12} className="text-zinc-500" />
          <span>{memberCount}</span>
        </button>

        {/* Quick Add Bot Button */}
        {onOpenCreateBotModal && (
          <button
            onClick={onOpenCreateBotModal}
            className="flex items-center gap-1 text-[11.5px] text-zinc-800 hover:text-black bg-zinc-100 hover:bg-zinc-200/80 px-2 py-1 rounded-md transition-colors border border-zinc-200/60 font-medium"
            title="Create New Bot"
          >
            <Plus size={12} />
            <span>New Bot</span>
          </button>
        )}
      </div>
    </div>
  );
};

