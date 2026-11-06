import React from "react";
import {
  Hash,
  Lock,
  ChevronDown,
  Plus,
  Search,
  Sparkles,
  Bot,
} from "lucide-react";
import type { ChannelItem, MemberItem, WorkspaceItem, BotItem } from "../api";

interface SidebarProps {
  workspace: WorkspaceItem | null;
  channels: ChannelItem[];
  members: MemberItem[];
  bots?: BotItem[];
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
  currentUser: MemberItem | null;
  onSwitchUser: (user: MemberItem) => void;
  onOpenCreateBotModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  workspace,
  channels,
  members,
  bots = [],
  activeChannelId,
  onSelectChannel,
  currentUser,
  onSwitchUser,
  onOpenCreateBotModal,
}) => {
  const humanMembers = members.filter((m) => m.userType === "human");

  return (
    <div className="w-60 bg-[#18181b] text-zinc-400 flex flex-col flex-shrink-0 border-r border-zinc-800/80 select-none h-full">
      {/* Workspace Header */}
      <div className="h-12 px-3.5 flex items-center justify-between border-b border-zinc-800/80 hover:bg-zinc-800/40 cursor-pointer transition-colors">
        <div className="flex items-center gap-2 font-medium text-zinc-100 text-[13px] tracking-tight truncate">
          <span>{workspace?.name || "Conclave"}</span>
          <ChevronDown size={12} className="text-zinc-500" />
        </div>
      </div>

      {/* Quick Search */}
      <div className="px-2.5 pt-2.5 pb-1.5">
        <button className="w-full flex items-center gap-2 px-2.5 py-1 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 rounded-md text-xs transition-colors border border-zinc-800/70">
          <Search size={12} className="text-zinc-500" />
          <span className="flex-1 text-left text-[11px] font-normal">Jump to...</span>
          <kbd className="text-[10px] bg-zinc-800 px-1.5 py-0.2 rounded text-zinc-400 border border-zinc-700/50">⌘K</kbd>
        </button>
      </div>

      {/* Channel & DM Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-4 text-[13px]">
        {/* Channels Section */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-medium tracking-wide uppercase text-zinc-500">
            <span>Channels</span>
            <button className="hover:text-zinc-300 transition-colors" title="Add Channel">
              <Plus size={13} />
            </button>
          </div>
          <div className="mt-0.5 space-y-0.5">
            {channels.map((ch) => {
              const isActive = ch.id === activeChannelId;
              const Icon = ch.type === "private" ? Lock : Hash;

              return (
                <button
                  key={ch.id}
                  onClick={() => onSelectChannel(ch.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1 rounded-md text-left transition-colors text-[13px] ${
                    isActive
                      ? "bg-zinc-800 text-zinc-100 font-medium shadow-2xs"
                      : "hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Icon size={14} className="opacity-60 flex-shrink-0" />
                  <span className="truncate">{ch.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Workspace Bots & Agents Section */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-medium tracking-wide uppercase text-zinc-500">
            <span>Bots & Apps</span>
            {onOpenCreateBotModal && (
              <button
                onClick={onOpenCreateBotModal}
                className="hover:text-zinc-300 transition-colors flex items-center gap-0.5 text-[10px] lowercase"
                title="Create New Bot"
              >
                <Plus size={13} />
              </button>
            )}
          </div>
          <div className="mt-0.5 space-y-0.5">
            {bots.length === 0 ? (
              <div className="px-2 py-1 text-[11px] text-zinc-500 italic">No bots created</div>
            ) : (
              bots.map((b) => {
                const isCurrentActiveInChannel = activeChannelId && b.channelIds.includes(activeChannelId);

                return (
                  <div
                    key={b.id}
                    className="w-full flex items-center justify-between px-2.5 py-1 rounded-md hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 group cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="relative flex-shrink-0">
                        <div className="w-4 h-4 rounded bg-zinc-800 text-zinc-300 flex items-center justify-center border border-zinc-700">
                          <Bot size={11} className="text-zinc-300" />
                        </div>
                        {isCurrentActiveInChannel && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-zinc-900" title="Active in current channel" />
                        )}
                      </div>
                      <span className="truncate text-[12.5px]">{b.name}</span>
                      <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1 py-0.2 rounded font-mono border border-zinc-700/60 uppercase">
                        {b.engine}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Human Direct Messages Section */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-medium tracking-wide uppercase text-zinc-500">
            <span>Direct Messages</span>
            <button className="hover:text-zinc-300 transition-colors" title="New Message">
              <Plus size={13} />
            </button>
          </div>
          <div className="mt-0.5 space-y-0.5">
            {humanMembers.map((m) => {
              const isSelf = m.id === currentUser?.id;

              return (
                <div
                  key={m.id}
                  className="w-full flex items-center justify-between px-2.5 py-1 rounded-md hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 group cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="relative flex-shrink-0">
                      <div className="w-4 h-4 rounded bg-zinc-800 text-zinc-300 flex items-center justify-center text-[10px] font-medium border border-zinc-700">
                        {m.displayName.slice(0, 1)}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-zinc-900" />
                    </div>
                    <span className="truncate text-[12.5px]">{m.displayName}</span>
                    {isSelf && <span className="text-[10px] text-zinc-500 font-normal">(you)</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current User Switcher Footer */}
      <div className="p-2 border-t border-zinc-800/80 bg-zinc-900/40">
        <div className="text-[10px] text-zinc-500 px-1.5 pb-1 font-medium tracking-wide uppercase">
          Dev Switcher:
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
                    ? "bg-zinc-800 text-zinc-100 font-medium border border-zinc-700/80"
                    : "bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-transparent"
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

