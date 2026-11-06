import React from "react";
import {
  Hash,
  Lock,
  Users,
  Bot,
  Plus,
  Sparkles,
  AppWindow,
  Pin,
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
}) => {
  const Icon = channel?.type === "private" ? Lock : Hash;

  return (
    <div className="border-b border-zinc-200/80 bg-white/95 backdrop-blur-sm z-10 select-none flex-shrink-0">
      {/* Main Header Row */}
      <div className="h-12 px-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 truncate min-w-0">
          <Icon size={16} className="text-zinc-400 flex-shrink-0" />
          <span className="font-bold text-zinc-900 text-[14px] tracking-tight flex-shrink-0">
            {channel?.name || "Select Channel"}
          </span>
          {channel?.topic && (
            <>
              <span className="text-zinc-300 text-xs">/</span>
              <span className="text-[12px] text-zinc-500 truncate font-normal">
                {channel.topic}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* AI Catch Up Summary Button (Laze Catch-Up) */}
          {onRequestCatchUp && (
            <button
              onClick={onRequestCatchUp}
              disabled={isCatchingUp}
              className="flex items-center gap-1.5 text-[11.5px] text-[#5b40d6] bg-[#efebfe]/70 hover:bg-[#efebfe] px-2.5 py-1 rounded-lg cursor-pointer transition-colors border border-[#5b40d6]/20 font-semibold"
              title="Summarize recent conversation activity"
            >
              <Sparkles size={12} className={isCatchingUp ? "animate-spin" : ""} />
              <span>{isCatchingUp ? "Summarizing…" : "Catch up"}</span>
            </button>
          )}

          {/* Manage Bots in Channel */}
          <button
            onClick={onOpenMembersModal}
            className="flex items-center gap-1.5 text-[11.5px] text-zinc-700 bg-white hover:bg-zinc-50 px-2.5 py-1 rounded-lg cursor-pointer transition-colors border border-zinc-200/90 font-medium shadow-2xs"
            title="Manage Agents & Listen Mode in Channel"
          >
            <Bot size={13} className="text-[#5b40d6]" />
            <span>
              {botCount} {botCount === 1 ? "Agent" : "Agents"}
            </span>
          </button>

          {/* Member Counter */}
          <button
            onClick={onOpenMembersModal}
            className="flex items-center gap-1.5 text-[11.5px] text-zinc-600 bg-zinc-100/80 hover:bg-zinc-200/70 px-2.5 py-1 rounded-lg cursor-pointer transition-colors border border-zinc-200/60 font-medium"
            title="Channel Members"
          >
            <Users size={12} className="text-zinc-500" />
            <span>{memberCount}</span>
          </button>

          {onOpenCreateBotModal && (
            <button
              onClick={onOpenCreateBotModal}
              className="flex items-center gap-1 text-[11.5px] text-white bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 rounded-lg transition-colors font-medium shadow-2xs"
              title="Add or Connect Agent"
            >
              <Plus size={12} />
              <span>Add Agent</span>
            </button>
          )}
        </div>
      </div>

      {/* Laze App Pin Strip (When channel has pinned apps) */}
      {pinnedApps.length > 0 && (
        <div className="px-5 py-1.5 bg-zinc-50/80 border-t border-zinc-100 flex items-center gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400 mr-1">
            <Pin size={11} className="rotate-45" />
            <span>Pinned Apps</span>
          </div>
          {pinnedApps.map((app) => {
            const isSelected = activeAppSlug === app.slug;
            return (
              <button
                key={app.id}
                onClick={() => onSelectPinnedApp?.(app)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                  isSelected
                    ? "bg-[#5b40d6] text-white border-[#5b40d6] shadow-2xs"
                    : "bg-white hover:bg-zinc-100/80 text-zinc-700 border-zinc-200/90"
                }`}
              >
                <AppWindow size={12} className={isSelected ? "text-white" : "text-[#5b40d6]"} />
                <span>{app.title}</span>
                <span
                  className={`text-[10px] font-mono px-1 rounded ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  v{app.currentVersion}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
