import React, { useState } from "react";
import {
  Hash,
  Lock,
  ChevronDown,
  Plus,
  Search,
  Inbox,
  MessageSquare,
  LayoutGrid,
  Cpu,
  Shield,
  BookOpen,
  Terminal,
  Sparkles,
} from "lucide-react";
import type {
  ChannelItem,
  MemberItem,
  WorkspaceItem,
  BotItem,
  WorkspaceAppItem,
} from "../api";
import { BotFace } from "./BotFace";

export type NavView = "chat" | "feed" | "threads" | "apps" | "machines" | "vault" | "wiki";

interface SidebarProps {
  workspace: WorkspaceItem | null;
  channels: ChannelItem[];
  members: MemberItem[];
  bots?: BotItem[];
  apps?: WorkspaceAppItem[];
  activeView: NavView;
  activeChannelId: string | null;
  pendingFeedCount: number;
  activeThreadsCount: number;
  handoffMachinesCount: number;
  onSelectView: (view: NavView) => void;
  onSelectChannel: (id: string) => void;
  onOpenAppPreview?: (app: WorkspaceAppItem) => void;
  currentUser: MemberItem | null;
  onSwitchUser: (user: MemberItem) => void;
  onOpenCreateBotModal?: () => void;
  onOpenConnectCliModal?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenBotProfile?: (bot: BotItem) => void;
  onCreateChannel?: (name: string, topic?: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  workspace,
  channels,
  members,
  bots = [],
  apps = [],
  activeView,
  activeChannelId,
  pendingFeedCount,
  activeThreadsCount,
  handoffMachinesCount,
  onSelectView,
  onSelectChannel,
  onOpenAppPreview,
  currentUser,
  onSwitchUser,
  onOpenCreateBotModal,
  onOpenConnectCliModal,
  onOpenCommandPalette,
  onOpenBotProfile,
  onCreateChannel,
}) => {
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const humanMembers = members.filter((m) => m.userType === "human");

  const handleCreateChannelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    onCreateChannel?.(newChannelName.trim());
    setNewChannelName("");
    setIsCreatingChannel(false);
  };

  return (
    <div className="w-64 laze-sidebar-gradient text-zinc-300 flex flex-col flex-shrink-0 border-r border-white/[0.07] select-none h-full">
      {/* Workspace Header */}
      <div className="h-12 px-3.5 flex items-center justify-between border-b border-white/[0.07]">
        <div
          onClick={() => onSelectView("chat")}
          className="flex items-center gap-2 font-semibold text-white text-[13.5px] tracking-tight truncate cursor-pointer"
        >
          <span className="truncate">{workspace?.name || "ACME Logistics"}</span>
          <ChevronDown size={13} className="text-zinc-400 flex-shrink-0" />
        </div>
        <button
          onClick={onOpenConnectCliModal}
          className="px-2 py-0.5 rounded-md bg-[#5b40d6]/30 hover:bg-[#5b40d6]/50 border border-[#ab98ff]/30 text-[#d4c8ff] text-[10.5px] font-medium flex items-center gap-1 transition-colors"
          title="Connect your Claude Code or agy CLI agent"
        >
          <Terminal size={11} />
          <span>Connect CLI</span>
        </button>
      </div>

      {/* Quick Search / Command Palette Trigger */}
      <div className="px-2.5 pt-2.5 pb-1.5">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 bg-black/25 hover:bg-black/40 text-zinc-300 rounded-lg text-xs transition-colors border border-white/[0.07]"
        >
          <Search size={12} className="text-zinc-400" />
          <span className="flex-1 text-left text-[11.5px] font-normal text-zinc-400">
            Search or jump to...
          </span>
          <kbd className="text-[10px] bg-white/[0.06] px-1.5 py-0.2 rounded text-zinc-300 border border-white/[0.08] font-mono">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Scrollable Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-4 text-[13px]">
        {/* Primary Laze Triage Views: Feed, Threads, Apps, Machines, Vault, Wiki */}
        <div className="space-y-0.5">
          <button
            onClick={() => onSelectView("feed")}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors text-[12.5px] ${
              activeView === "feed"
                ? "bg-[#5b40d6] text-white font-semibold shadow-xs"
                : "hover:bg-white/[0.06] text-zinc-300 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <Inbox size={14} className="opacity-80" />
              <span>Feed</span>
            </div>
            {pendingFeedCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-bold ${
                  activeView === "feed"
                    ? "bg-white text-[#5b40d6]"
                    : "bg-[#f08a3c] text-white"
                }`}
              >
                {pendingFeedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectView("threads")}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors text-[12.5px] ${
              activeView === "threads"
                ? "bg-[#5b40d6] text-white font-semibold shadow-xs"
                : "hover:bg-white/[0.06] text-zinc-300 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="opacity-80" />
              <span>Threads</span>
            </div>
            {activeThreadsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-white/[0.1] text-zinc-200">
                {activeThreadsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectView("apps")}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors text-[12.5px] ${
              activeView === "apps"
                ? "bg-[#5b40d6] text-white font-semibold shadow-xs"
                : "hover:bg-white/[0.06] text-zinc-300 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <LayoutGrid size={14} className="opacity-80" />
              <span>Internal Apps</span>
            </div>
            <span className="text-[10.5px] text-zinc-400 font-mono">{apps.length}</span>
          </button>

          <button
            onClick={() => onSelectView("machines")}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors text-[12.5px] ${
              activeView === "machines"
                ? "bg-[#5b40d6] text-white font-semibold shadow-xs"
                : "hover:bg-white/[0.06] text-zinc-300 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <Cpu size={14} className="opacity-80" />
              <span>Machines & Browser</span>
            </div>
            {handoffMachinesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Handoff
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectView("vault")}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors text-[12.5px] ${
              activeView === "vault"
                ? "bg-[#5b40d6] text-white font-semibold shadow-xs"
                : "hover:bg-white/[0.06] text-zinc-300 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield size={14} className="opacity-80" />
              <span>Vault & Access</span>
            </div>
          </button>

          <button
            onClick={() => onSelectView("wiki")}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors text-[12.5px] ${
              activeView === "wiki"
                ? "bg-[#5b40d6] text-white font-semibold shadow-xs"
                : "hover:bg-white/[0.06] text-zinc-300 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="opacity-80" />
              <span>Memory & Wiki</span>
            </div>
          </button>
        </div>

        {/* Channels Section */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-[10.5px] font-semibold tracking-wider uppercase text-zinc-400/80">
            <span>Channels</span>
            <button
              onClick={() => setIsCreatingChannel(!isCreatingChannel)}
              className="hover:text-white transition-colors"
              title="Add Channel"
            >
              <Plus size={13} />
            </button>
          </div>

          {isCreatingChannel && (
            <form onSubmit={handleCreateChannelSubmit} className="px-2 py-1.5">
              <input
                type="text"
                autoFocus
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="new-channel-name"
                className="w-full px-2 py-1 rounded bg-black/40 border border-white/15 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-[#ab98ff]"
              />
            </form>
          )}

          <div className="mt-0.5 space-y-0.5">
            {channels.map((ch) => {
              const isActive = activeView === "chat" && ch.id === activeChannelId;
              const Icon = ch.type === "private" ? Lock : Hash;
              const pinnedChannelApp = apps.find((a) => a.channelId === ch.id && a.isPinned);

              return (
                <div
                  key={ch.id}
                  onClick={() => {
                    onSelectChannel(ch.id);
                    onSelectView("chat");
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-[12.5px] ${
                    isActive
                      ? "bg-white/[0.12] text-white font-semibold shadow-2xs"
                      : "hover:bg-white/[0.06] text-zinc-300 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon size={13.5} className="opacity-65 flex-shrink-0" />
                    <span className="truncate">{ch.name}</span>
                  </div>
                  {pinnedChannelApp && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectChannel(ch.id);
                        onSelectView("chat");
                        onOpenAppPreview?.(pinnedChannelApp);
                      }}
                      className="text-[10px] px-1.5 py-0.2 rounded bg-[#5b40d6]/30 text-[#d4c8ff] border border-[#ab98ff]/25 truncate max-w-[85px] hover:bg-[#5b40d6]/50"
                      title={`Open pinned app: ${pinnedChannelApp.title}`}
                    >
                      {pinnedChannelApp.title}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Workspace Agents Section */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-[10.5px] font-semibold tracking-wider uppercase text-zinc-400/80">
            <span>Agents</span>
            <div className="flex items-center gap-1">
              {onOpenCreateBotModal && (
                <button
                  onClick={onOpenCreateBotModal}
                  className="hover:text-white transition-colors"
                  title="Create Hosted or Connected Agent"
                >
                  <Plus size={13} />
                </button>
              )}
            </div>
          </div>
          <div className="mt-0.5 space-y-0.5">
            {bots.map((b) => {
              const isCurrentActiveInChannel =
                activeChannelId && b.channelIds.includes(activeChannelId);
              const listenMode =
                (activeChannelId && b.listenModes?.[activeChannelId]) || "mention";

              return (
                <div
                  key={b.id}
                  onClick={() => onOpenBotProfile?.(b)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-300 hover:text-white group cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="relative flex-shrink-0">
                      <div className="w-5 h-5 rounded-md bg-black/30 text-zinc-200 flex items-center justify-center border border-white/10 overflow-hidden">
                        <BotFace look={b.avatarLabel || "1.7.0.0"} size={20} />
                      </div>
                      {isCurrentActiveInChannel && (
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-[#1d1626] ${
                            listenMode === "all" ? "bg-emerald-400" : "bg-[#ab98ff]"
                          }`}
                          title={
                            listenMode === "all"
                              ? "Listening to every message in this channel"
                              : "Responds when @mentioned in this channel"
                          }
                        />
                      )}
                    </div>
                    <span className="truncate text-[12.5px]">{b.name}</span>
                  </div>
                  <span className="text-[9px] bg-white/[0.07] text-zinc-300 px-1.5 py-0.2 rounded font-mono border border-white/[0.08] uppercase">
                    {b.connectionMode === "cli" ? "CLI" : b.engine}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Members Section */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-[10.5px] font-semibold tracking-wider uppercase text-zinc-400/80">
            <span>Teammates ({humanMembers.length})</span>
          </div>
          <div className="mt-0.5 space-y-0.5">
            {humanMembers.map((m) => {
              const isSelf = m.id === currentUser?.id;
              return (
                <div
                  key={m.id}
                  onClick={() => onSwitchUser(m)}
                  className="w-full flex items-center justify-between px-2.5 py-1 rounded-lg hover:bg-white/[0.06] text-zinc-300 hover:text-white group cursor-pointer transition-colors"
                  title={`Click to act as ${m.displayName}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="relative flex-shrink-0">
                      {m.avatarUrl ? (
                        <img
                          src={m.avatarUrl}
                          alt={m.displayName}
                          className="w-4 h-4 rounded bg-black/30 object-cover"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded bg-white/10 text-white flex items-center justify-center text-[10px] font-medium">
                          {m.displayName.slice(0, 1)}
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-[#1d1626]" />
                    </div>
                    <span className="truncate text-[12px]">{m.displayName}</span>
                    {isSelf && (
                      <span className="text-[10px] text-[#ab98ff] font-medium">(you)</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active User Multiplayer Switcher Footer */}
      <div className="p-2.5 border-t border-white/[0.07] bg-black/20">
        <div className="flex items-center justify-between text-[10px] text-zinc-400 px-1 pb-1.5 font-medium uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Sparkles size={10} className="text-[#f08a3c]" />
            <span>Multiplayer Persona</span>
          </span>
          <span className="text-zinc-500">{currentUser?.role}</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {humanMembers.map((m) => {
            const isSelected = m.id === currentUser?.id;
            return (
              <button
                key={m.id}
                onClick={() => onSwitchUser(m)}
                className={`py-1 px-1 rounded-md text-[11px] truncate transition-colors ${
                  isSelected
                    ? "bg-[#5b40d6] text-white font-semibold shadow-2xs"
                    : "bg-white/[0.05] text-zinc-400 hover:bg-white/[0.1] hover:text-white"
                }`}
                title={`Switch active user to ${m.displayName}`}
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
