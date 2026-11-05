import React from "react";
import {
  Hash,
  Lock,
  ChevronDown,
  Plus,
  Search,
  Bot,
  User as UserIcon,
} from "lucide-react";
import type { ChannelItem, MemberItem, WorkspaceItem } from "../api";

interface SidebarProps {
  workspace: WorkspaceItem | null;
  channels: ChannelItem[];
  members: MemberItem[];
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
  currentUser: MemberItem | null;
  onSwitchUser: (user: MemberItem) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  workspace,
  channels,
  members,
  activeChannelId,
  onSelectChannel,
  currentUser,
  onSwitchUser,
}) => {
  return (
    <div className="w-64 bg-[#3F0E40] text-[#BCABB4] flex flex-col flex-shrink-0 border-r border-[#522653] select-none h-full">
      {/* Workspace Header */}
      <div className="h-13 px-4 flex items-center justify-between border-b border-[#522653] hover:bg-[#350d36] cursor-pointer transition-colors">
        <div className="flex items-center gap-2 font-bold text-white text-[15px] truncate">
          <span>{workspace?.name || "Conclave"}</span>
          <ChevronDown size={14} className="text-white/70" />
        </div>
      </div>

      {/* Quick Search */}
      <div className="px-3 pt-3 pb-2">
        <button className="w-full flex items-center gap-2 px-3 py-1.5 bg-black/20 hover:bg-black/30 text-white/70 rounded-md text-xs transition-colors border border-white/10">
          <Search size={13} />
          <span className="flex-1 text-left">Jump to...</span>
          <kbd className="text-[10px] bg-white/10 px-1 py-0.5 rounded text-white/60">⌘K</kbd>
        </button>
      </div>

      {/* Channel & DM Scroll Area */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4 text-[14px]">
        {/* Channels Section */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wider text-white/50">
            <span>Channels</span>
            <button className="hover:text-white transition-colors" title="Add Channel">
              <Plus size={14} />
            </button>
          </div>
          <div className="mt-1 space-y-0.5">
            {channels.map((ch) => {
              const isActive = ch.id === activeChannelId;
              const Icon = ch.type === "private" ? Lock : Hash;

              return (
                <button
                  key={ch.id}
                  onClick={() => onSelectChannel(ch.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1 rounded-md text-left transition-colors ${
                    isActive
                      ? "bg-[#1164A3] text-white font-medium"
                      : "hover:bg-[#350d36] text-[#BCABB4] hover:text-white"
                  }`}
                >
                  <Icon size={15} className="opacity-70 flex-shrink-0" />
                  <span className="truncate">{ch.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Direct Messages & Agents Section */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wider text-white/50">
            <span>Direct Messages</span>
            <button className="hover:text-white transition-colors" title="New Message">
              <Plus size={14} />
            </button>
          </div>
          <div className="mt-1 space-y-0.5">
            {members.map((m) => {
              const isAgent = m.userType === "agent";
              const isSelf = m.id === currentUser?.id;

              return (
                <div
                  key={m.id}
                  className="w-full flex items-center justify-between px-2.5 py-1 rounded-md hover:bg-[#350d36] text-[#BCABB4] hover:text-white group cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="relative flex-shrink-0">
                      {isAgent ? (
                        <div className="w-4 h-4 rounded bg-purple-500/30 text-purple-300 flex items-center justify-center">
                          <Bot size={12} />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded bg-white/20 text-white flex items-center justify-center text-[10px] font-bold">
                          {m.displayName.slice(0, 1)}
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-[#3F0E40]" />
                    </div>
                    <span className="truncate text-[13px]">{m.displayName}</span>
                    {isSelf && <span className="text-[10px] opacity-50">(you)</span>}
                    {isAgent && (
                      <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded font-mono uppercase">
                        AI
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current User Quick-Switcher Footer */}
      <div className="p-2 border-t border-[#522653] bg-[#350d36]/50">
        <div className="text-[10px] text-white/50 px-2 pb-1 font-semibold uppercase">
          Acting as (Dev Switcher):
        </div>
        <div className="flex gap-1">
          {members.map((m) => {
            const isSelected = m.id === currentUser?.id;
            return (
              <button
                key={m.id}
                onClick={() => onSwitchUser(m)}
                className={`flex-1 py-1 px-1.5 rounded text-[11px] truncate transition-colors ${
                  isSelected
                    ? "bg-[#1164A3] text-white font-semibold"
                    : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                }`}
                title={`Switch to ${m.displayName}`}
              >
                {m.displayName.split(" ")[0]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
