import React from "react";
import { Hash, Lock, Users, Search, Info } from "lucide-react";
import type { ChannelItem } from "../api";

interface ChatHeaderProps {
  channel: ChannelItem | null;
  memberCount: number;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ channel, memberCount }) => {
  const Icon = channel?.type === "private" ? Lock : Hash;

  return (
    <div className="h-13 border-b border-gray-200 bg-white px-5 flex items-center justify-between flex-shrink-0 z-10">
      <div className="flex items-center gap-2 truncate">
        <Icon size={18} className="text-gray-500" />
        <span className="font-bold text-gray-900 text-[15px]">{channel?.name || "Select Channel"}</span>
        {channel?.topic && (
          <>
            <span className="text-gray-300">|</span>
            <span className="text-xs text-gray-500 truncate max-w-md">{channel.topic}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-md cursor-pointer transition-colors">
          <Users size={13} />
          <span>{memberCount}</span>
        </div>

        <button className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors" title="Channel Details">
          <Info size={16} />
        </button>
      </div>
    </div>
  );
};
