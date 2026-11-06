import React from "react";
import { Hash, Lock, Users, Sparkles } from "lucide-react";
import type { ChannelItem } from "../api";

interface ChatHeaderProps {
  channel: ChannelItem | null;
  memberCount: number;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ channel, memberCount }) => {
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
        <div className="flex items-center gap-1.5 text-[11.5px] text-zinc-600 bg-zinc-100 hover:bg-zinc-200/80 px-2.5 py-1 rounded-md cursor-pointer transition-colors border border-zinc-200/60 font-medium">
          <Users size={12} className="text-zinc-500" />
          <span>{memberCount}</span>
        </div>
      </div>
    </div>
  );
};

