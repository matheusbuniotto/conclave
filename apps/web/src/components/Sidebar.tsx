import React, { useState } from "react";
import {
  Hash,
  Lock,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Inbox,
  MessageSquare,
  LayoutGrid,
  Cpu,
  Shield,
  BookOpen,
  Terminal,
  Settings,
  MoreHorizontal,
  Bot,
} from "lucide-react";
import type {
  ChannelItem,
  MemberItem,
  WorkspaceItem,
  BotItem,
  WorkspaceAppItem,
} from "../api";
import { BotFace } from "./BotFace";
import type { SettingsTab } from "./SettingsModal";

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
  onOpenSettings?: (tab?: SettingsTab) => void;
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
  currentUser,
  onSwitchUser,
  onOpenCreateBotModal,
  onOpenConnectCliModal,
  onOpenCommandPalette,
  onOpenBotProfile,
  onCreateChannel,
  onOpenSettings,
}) => {
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [showMoreNav, setShowMoreNav] = useState(false);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [agentsOpen, setAgentsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
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

  const isAdvancedViewActive =
    activeView === "apps" ||
    activeView === "wiki" ||
    activeView === "vault" ||
    activeView === "machines";

  return (
    <div className="w-60 bg-[#3f0e40] text-[#cfc3cf] flex flex-col flex-shrink-0 border-r border-white/[0.08] select-none h-full relative">
      {/* Slack Workspace Header with Dropdown Menu */}
      <div className="h-12 px-3.5 flex items-center justify-between border-b border-white/[0.1] relative">
        <button
          onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
          className="flex items-center gap-1.5 font-bold text-white text-[15px] tracking-tight truncate hover:bg-white/[0.08] px-1.5 py-1 -ml-1.5 rounded-lg transition-colors"
        >
          <span className="truncate">{workspace?.name || "ACME Logistics"}</span>
          <ChevronDown size={14} className="text-white/70 flex-shrink-0" />
        </button>

        <button
          onClick={onOpenCommandPalette}
          className="w-7 h-7 rounded-lg hover:bg-white/[0.1] text-white/80 hover:text-white flex items-center justify-center transition-colors"
          title="Search or jump to… (⌘K)"
        >
          <Search size={15} />
        </button>

        {/* Native Slack Workspace Menu Popover */}
        {isWorkspaceMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsWorkspaceMenuOpen(false)}
            />
            <div className="absolute left-3 top-11 z-50 w-64 rounded-xl bg-white shadow-2xl border border-zinc-200 py-1.5 text-zinc-800 animate-laze-message">
              <div className="px-3.5 py-2 border-b border-zinc-100">
                <div className="font-bold text-sm text-zinc-900">
                  {workspace?.name || "ACME Logistics"}
                </div>
                <div className="text-[11px] text-zinc-500">
                  acme-logistics.conclave.so
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setIsWorkspaceMenuOpen(false);
                    onOpenSettings?.("general");
                  }}
                  className="w-full px-3.5 py-1.5 text-left text-xs text-zinc-700 hover:bg-[#1164A3] hover:text-white flex items-center gap-2.5"
                >
                  <Settings size={14} />
                  <span>Preferences & Settings</span>
                </button>
                <button
                  onClick={() => {
                    setIsWorkspaceMenuOpen(false);
                    onOpenSettings?.("agents");
                  }}
                  className="w-full px-3.5 py-1.5 text-left text-xs text-zinc-700 hover:bg-[#1164A3] hover:text-white flex items-center gap-2.5"
                >
                  <Bot size={14} />
                  <span>Agents & Subprocesses</span>
                </button>
                <button
                  onClick={() => {
                    setIsWorkspaceMenuOpen(false);
                    onOpenSettings?.("memory");
                  }}
                  className="w-full px-3.5 py-1.5 text-left text-xs text-zinc-700 hover:bg-[#1164A3] hover:text-white flex items-center gap-2.5"
                >
                  <BookOpen size={14} />
                  <span>Memory (OptMem) & Wiki</span>
                </button>
                <button
                  onClick={() => {
                    setIsWorkspaceMenuOpen(false);
                    onOpenSettings?.("vault");
                  }}
                  className="w-full px-3.5 py-1.5 text-left text-xs text-zinc-700 hover:bg-[#1164A3] hover:text-white flex items-center gap-2.5"
                >
                  <Shield size={14} />
                  <span>Vault & Security Proxy</span>
                </button>
                <button
                  onClick={() => {
                    setIsWorkspaceMenuOpen(false);
                    onOpenSettings?.("machines");
                  }}
                  className="w-full px-3.5 py-1.5 text-left text-xs text-zinc-700 hover:bg-[#1164A3] hover:text-white flex items-center gap-2.5"
                >
                  <Cpu size={14} />
                  <span>Machines & Browser Handoff</span>
                </button>
              </div>

              <div className="border-t border-zinc-100 pt-1">
                <button
                  onClick={() => {
                    setIsWorkspaceMenuOpen(false);
                    onOpenConnectCliModal?.();
                  }}
                  className="w-full px-3.5 py-1.5 text-left text-xs text-zinc-700 hover:bg-[#1164A3] hover:text-white flex items-center gap-2.5"
                >
                  <Terminal size={14} />
                  <span>Connect Local CLI Agent…</span>
                </button>
                <button
                  onClick={() => {
                    setIsWorkspaceMenuOpen(false);
                    setIsCreatingChannel(true);
                  }}
                  className="w-full px-3.5 py-1.5 text-left text-xs text-zinc-700 hover:bg-[#1164A3] hover:text-white flex items-center gap-2.5"
                >
                  <Plus size={14} />
                  <span>Create a channel…</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Scrollable Slack Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-2.5 space-y-4 text-[13.5px]">
        {/* Top Slack Items: Threads, Activity, More */}
        <div className="space-y-0.5">
          <button
            onClick={() => onSelectView("threads")}
            className={`w-full flex items-center justify-between px-2.5 py-1 rounded-md text-left transition-colors text-[13.5px] ${
              activeView === "threads"
                ? "bg-[#1164A3] text-white font-medium"
                : "hover:bg-white/[0.07] text-[#cfc3cf] hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare size={15} className="opacity-85" />
              <span>Threads</span>
            </div>
            {activeThreadsCount > 0 && (
              <span className="text-[11px] opacity-75">{activeThreadsCount}</span>
            )}
          </button>

          <button
            onClick={() => onSelectView("feed")}
            className={`w-full flex items-center justify-between px-2.5 py-1 rounded-md text-left transition-colors text-[13.5px] ${
              activeView === "feed"
                ? "bg-[#1164A3] text-white font-medium"
                : "hover:bg-white/[0.07] text-[#cfc3cf] hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Inbox size={15} className="opacity-85" />
              <span>Activity</span>
            </div>
            {pendingFeedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10.5px] font-bold bg-[#e01e5a] text-white">
                {pendingFeedCount}
              </span>
            )}
          </button>

          {/* Progressive Disclosure "More" Toggle */}
          <button
            onClick={() => setShowMoreNav(!showMoreNav)}
            className={`w-full flex items-center justify-between px-2.5 py-1 rounded-md text-left transition-colors text-[13.5px] ${
              isAdvancedViewActive && !showMoreNav
                ? "bg-white/[0.1] text-white font-medium"
                : "hover:bg-white/[0.07] text-[#cfc3cf]/85 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MoreHorizontal size={15} className="opacity-85" />
              <span>More</span>
            </div>
            <span className="text-[11px] opacity-60">
              {showMoreNav ? "Hide" : "Apps, Wiki…"}
            </span>
          </button>

          {/* Progressively Disclosed Platform Views */}
          {(showMoreNav || isAdvancedViewActive) && (
            <div className="pl-3 pt-0.5 space-y-0.5 border-l border-white/[0.1] ml-3 mt-1">
              <button
                onClick={() => onSelectView("apps")}
                className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-left transition-colors text-[12.5px] ${
                  activeView === "apps"
                    ? "bg-[#1164A3] text-white font-medium"
                    : "hover:bg-white/[0.07] text-[#cfc3cf] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <LayoutGrid size={13.5} className="opacity-80" />
                  <span>Internal Apps</span>
                </div>
                <span className="text-[10.5px] opacity-60">{apps.length}</span>
              </button>

              <button
                onClick={() => onSelectView("wiki")}
                className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-left transition-colors text-[12.5px] ${
                  activeView === "wiki"
                    ? "bg-[#1164A3] text-white font-medium"
                    : "hover:bg-white/[0.07] text-[#cfc3cf] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen size={13.5} className="opacity-80" />
                  <span>Memory & Wiki</span>
                </div>
              </button>

              <button
                onClick={() => onSelectView("vault")}
                className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-left transition-colors text-[12.5px] ${
                  activeView === "vault"
                    ? "bg-[#1164A3] text-white font-medium"
                    : "hover:bg-white/[0.07] text-[#cfc3cf] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield size={13.5} className="opacity-80" />
                  <span>Vault & Access</span>
                </div>
              </button>

              <button
                onClick={() => onSelectView("machines")}
                className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-left transition-colors text-[12.5px] ${
                  activeView === "machines"
                    ? "bg-[#1164A3] text-white font-medium"
                    : "hover:bg-white/[0.07] text-[#cfc3cf] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Cpu size={13.5} className="opacity-80" />
                  <span>Machines</span>
                </div>
                {handoffMachinesCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400" title="2FA Handoff Pending" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Collapsible Channels Section */}
        <div>
          <div className="group flex items-center justify-between px-1.5 py-0.5 text-[12.5px] font-medium text-[#cfc3cf]/85 hover:text-white">
            <button
              onClick={() => setChannelsOpen(!channelsOpen)}
              className="flex items-center gap-1 flex-1 text-left"
            >
              {channelsOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <span>Channels</span>
            </button>
            <button
              onClick={() => setIsCreatingChannel(!isCreatingChannel)}
              className="opacity-0 group-hover:opacity-100 hover:bg-white/10 p-0.5 rounded transition-opacity"
              title="Add channel"
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
                className="w-full px-2 py-1 rounded bg-black/30 border border-white/20 text-xs text-white placeholder:text-white/40 outline-none"
              />
            </form>
          )}

          {channelsOpen && (
            <div className="mt-0.5 space-y-0.5">
              {channels.map((ch) => {
                const isActive = activeView === "chat" && ch.id === activeChannelId;
                const Icon = ch.type === "private" ? Lock : Hash;

                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      onSelectChannel(ch.id);
                      onSelectView("chat");
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1 rounded-md text-left transition-colors text-[13.5px] ${
                      isActive
                        ? "bg-[#1164A3] text-white font-semibold"
                        : "hover:bg-white/[0.07] text-[#cfc3cf] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon size={14} className="opacity-75 flex-shrink-0" />
                      <span className="truncate">{ch.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Collapsible Agents Section */}
        <div>
          <div className="group flex items-center justify-between px-1.5 py-0.5 text-[12.5px] font-medium text-[#cfc3cf]/85 hover:text-white">
            <button
              onClick={() => setAgentsOpen(!agentsOpen)}
              className="flex items-center gap-1 flex-1 text-left"
            >
              {agentsOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <span>Agents</span>
            </button>
            {onOpenCreateBotModal && (
              <button
                onClick={onOpenCreateBotModal}
                className="opacity-0 group-hover:opacity-100 hover:bg-white/10 p-0.5 rounded transition-opacity"
                title="Add Agent"
              >
                <Plus size={13} />
              </button>
            )}
          </div>

          {agentsOpen && (
            <div className="mt-0.5 space-y-0.5">
              {bots.map((b) => {
                const isCurrentActiveInChannel =
                  activeChannelId && b.channelIds.includes(activeChannelId);

                return (
                  <button
                    key={b.id}
                    onClick={() => onOpenBotProfile?.(b)}
                    className="w-full flex items-center justify-between px-2.5 py-1 rounded-md hover:bg-white/[0.07] text-[#cfc3cf] hover:text-white group transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="relative flex-shrink-0">
                        <div className="w-4 h-4 rounded bg-black/30 flex items-center justify-center overflow-hidden">
                          <BotFace look={b.avatarLabel || "1.7.0.0"} size={16} />
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-[#3f0e40] ${
                            isCurrentActiveInChannel ? "bg-[#2bac76]" : "bg-white/30"
                          }`}
                        />
                      </div>
                      <span className="truncate text-[13.5px]">{b.name}</span>
                    </div>
                    <span className="opacity-0 group-hover:opacity-80 text-[9.5px] font-mono uppercase text-white/70 transition-opacity">
                      @{b.handle}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Collapsible Direct Messages Section */}
        <div>
          <div className="flex items-center justify-between px-1.5 py-0.5 text-[12.5px] font-medium text-[#cfc3cf]/85 hover:text-white">
            <button
              onClick={() => setDmsOpen(!dmsOpen)}
              className="flex items-center gap-1 flex-1 text-left"
            >
              {dmsOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <span>Direct messages</span>
            </button>
          </div>

          {dmsOpen && (
            <div className="mt-0.5 space-y-0.5">
              {humanMembers.map((m) => {
                const isSelf = m.id === currentUser?.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => onSwitchUser(m)}
                    className="w-full flex items-center justify-between px-2.5 py-1 rounded-md hover:bg-white/[0.07] text-[#cfc3cf] hover:text-white transition-colors text-left"
                    title={`Click to act as ${m.displayName}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="relative flex-shrink-0">
                        {m.avatarUrl ? (
                          <img
                            src={m.avatarUrl}
                            alt={m.displayName}
                            className="w-4 h-4 rounded object-cover"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded bg-white/15 text-white flex items-center justify-center text-[10px] font-bold">
                            {m.displayName.slice(0, 1)}
                          </div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#2bac76] ring-1 ring-[#3f0e40]" />
                      </div>
                      <span className="truncate text-[13.5px]">{m.displayName}</span>
                      {isSelf && (
                        <span className="text-[11px] opacity-60">you</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
