import React, { useState } from "react";
import {
  Hash,
  Lock,
  Users,
  Bot,
  Plus,
  Sparkles,
  AppWindow,
  GitMerge,
  MoreHorizontal,
  Settings,
} from "lucide-react";
import type { ChannelItem, WorkspaceAppItem } from "../api";

interface ChatHeaderProps {
  channel: ChannelItem | null;
  memberCount: number;
  botCount?: number;
  pinnedApps?: WorkspaceAppItem[];
  activeAppSlug?: string | null;
  isCatchingUp?: boolean;
  onOpenMembersModal?: () => void;
  onOpenCreateBotModal?: () => void;
  onSelectPinnedApp?: (app: WorkspaceAppItem) => void;
  onRequestCatchUp?: () => void;
  onRequestCompact?: () => void;
  onOpenSettings?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  channel,
  memberCount,
  botCount = 0,
  pinnedApps = [],
  activeAppSlug,
  isCatchingUp = false,
  onOpenMembersModal,
  onOpenCreateBotModal,
  onSelectPinnedApp,
  onRequestCatchUp,
  onRequestCompact,
  onOpenSettings,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const Icon = channel?.type === "private" ? Lock : Hash;

  return (
    <div className="h-12 px-5 border-b border-zinc-200/80 bg-white flex items-center justify-between gap-4 z-10 select-none flex-shrink-0">
      {/* Left: Channel Name + Topic */}
      <div className="flex items-center gap-2 truncate min-w-0">
        <button
          onClick={onOpenMembersModal}
          className="flex items-center gap-1 font-bold text-zinc-900 text-[15px] tracking-tight hover:bg-zinc-100 px-1.5 py-0.5 -ml-1.5 rounded-md transition-colors flex-shrink-0"
        >
          <Icon size={16} className="text-zinc-500 flex-shrink-0" />
          <span>{channel?.name || "general"}</span>
        </button>

        {channel?.topic && (
          <span className="text-[12.5px] text-zinc-500 truncate font-normal hidden sm:inline">
            {channel.topic}
          </span>
        )}
      </div>

      {/* Right: Pinned Canvas/App Tab + Unified Member/Agent Pill + Progressive Disclosure Menu */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Slack Canvas-style Pinned App Pill(s) */}
        {pinnedApps.map((app) => {
          const isSelected = activeAppSlug === app.slug;
          return (
            <button
              key={app.id}
              onClick={() => onSelectPinnedApp?.(app)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
                isSelected
                  ? "bg-[#3f0e40] text-white border-[#3f0e40]"
                  : "bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200/90"
              }`}
              title={`Open pinned app: ${app.title}`}
            >
              <AppWindow
                size={12.5}
                className={isSelected ? "text-white" : "text-[#3f0e40]"}
              />
              <span className="max-w-[120px] truncate">{app.title}</span>
            </button>
          );
        })}

        {/* Unified Slack Members & Agents Pill */}
        <button
          onClick={onOpenMembersModal}
          className="flex items-center gap-2 text-xs text-zinc-600 hover:bg-zinc-100 px-2.5 py-1 rounded-md transition-colors border border-zinc-200/80 font-medium"
          title="View members & agents in channel"
        >
          <span className="flex items-center gap-1">
            <Users size={12.5} className="text-zinc-500" />
            <span>{memberCount}</span>
          </span>
          {botCount > 0 && (
            <>
              <span className="text-zinc-300">|</span>
              <span className="flex items-center gap-1 text-[#3f0e40]">
                <Bot size={12.5} />
                <span>{botCount}</span>
              </span>
            </>
          )}
        </button>

        {/* Progressive Disclosure More Menu (⋯) */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-7 h-7 rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors"
            title="Channel actions & AI tools"
          >
            <MoreHorizontal size={16} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-8 z-50 w-56 rounded-xl bg-white shadow-xl border border-zinc-200 py-1.5 text-zinc-800 animate-laze-message">
                {onRequestCatchUp && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onRequestCatchUp();
                    }}
                    disabled={isCatchingUp}
                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-zinc-100 flex items-center gap-2.5 text-zinc-700"
                  >
                    <Sparkles size={13} className="text-[#3f0e40]" />
                    <span>
                      {isCatchingUp ? "Summarizing channel…" : "Catch up on channel"}
                    </span>
                  </button>
                )}

                {onRequestCompact && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onRequestCompact();
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-zinc-100 flex items-center gap-2.5 text-zinc-700"
                  >
                    <GitMerge size={13} className="text-[#3f0e40]" />
                    <span>Compact agent context (/compact)</span>
                  </button>
                )}

                {onOpenCreateBotModal && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenCreateBotModal();
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-zinc-100 flex items-center gap-2.5 text-zinc-700"
                  >
                    <Plus size={13} className="text-zinc-500" />
                    <span>Add or create agent…</span>
                  </button>
                )}

                {onOpenSettings && (
                  <div className="border-t border-zinc-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenSettings();
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-zinc-100 flex items-center gap-2.5 text-zinc-700"
                    >
                      <Settings size={13} className="text-zinc-500" />
                      <span>Workspace settings…</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
