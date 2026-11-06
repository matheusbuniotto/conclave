import React, { useState } from "react";
import { Plus, Settings, Check } from "lucide-react";
import type { WorkspaceItem, MemberItem } from "../api";
import type { NavView } from "./Sidebar";
import type { SettingsTab } from "./SettingsModal";

interface WorkspaceRailProps {
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string | null;
  activeView: NavView;
  members?: MemberItem[];
  currentUser?: MemberItem | null;
  onSelectWorkspace: (id: string) => void;
  onSelectView: (view: NavView) => void;
  onSwitchUser?: (user: MemberItem) => void;
  onOpenSettings?: (tab?: SettingsTab) => void;
}

export const WorkspaceRail: React.FC<WorkspaceRailProps> = ({
  workspaces,
  activeWorkspaceId,
  members = [],
  currentUser,
  onSelectWorkspace,
  onSelectView,
  onSwitchUser,
  onOpenSettings,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const humanMembers = members.filter((m) => m.userType === "human");

  return (
    <div className="w-[64px] bg-[#2c092d] flex flex-col items-center py-3 gap-2.5 flex-shrink-0 z-30 border-r border-white/[0.08] select-none relative">
      {/* macOS Traffic Lights */}
      <div className="flex items-center gap-1.5 pt-1 pb-2">
        <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] opacity-90 hover:opacity-100 transition-opacity" />
        <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] opacity-90 hover:opacity-100 transition-opacity" />
        <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] opacity-90 hover:opacity-100 transition-opacity" />
      </div>

      {/* Workspace Switcher Icons */}
      <div className="flex flex-col items-center gap-3 w-full flex-1 pt-1">
        {workspaces.map((ws) => {
          const isActive = ws.id === activeWorkspaceId;
          const initial = ws.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <div key={ws.id} className="relative group flex items-center justify-center w-full">
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r" />
              )}
              <button
                onClick={() => {
                  onSelectWorkspace(ws.id);
                  onSelectView("chat");
                }}
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs tracking-wide transition-all duration-150 ${
                  isActive
                    ? "bg-white text-[#3f0e40] shadow-sm ring-2 ring-white/30"
                    : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                }`}
                title={ws.name}
              >
                {initial}
              </button>
            </div>
          );
        })}

        <button
          className="w-9 h-9 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] text-white/70 hover:text-white flex items-center justify-center transition-all duration-150"
          title="Add Workspace"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Bottom Slack Rail Controls: Settings + Current User Avatar */}
      <div className="flex flex-col items-center gap-3 pb-1">
        <button
          onClick={() => onOpenSettings?.("general")}
          className="w-9 h-9 rounded-lg text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
          title="Workspace Settings & Administration"
        >
          <Settings size={17} />
        </button>

        {/* User Avatar + Persona Switcher Popover */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="relative w-9 h-9 rounded-lg overflow-hidden border border-white/20 hover:ring-2 hover:ring-white/40 transition-all bg-white/10 flex items-center justify-center text-white text-xs font-bold"
            title={`${currentUser?.displayName || "User"} (Click to switch persona)`}
          >
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              (currentUser?.displayName || "U").slice(0, 1)
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#2bac76] ring-2 ring-[#2c092d]" />
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute left-12 bottom-0 z-50 w-56 rounded-xl bg-white shadow-xl border border-zinc-200 py-1.5 text-zinc-800 animate-laze-message">
                <div className="px-3 py-2 border-b border-zinc-100">
                  <div className="font-bold text-xs text-zinc-900 truncate">
                    {currentUser?.displayName}
                  </div>
                  <div className="text-[11px] text-emerald-600 flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#2bac76]" />
                    <span>Active · {currentUser?.role}</span>
                  </div>
                </div>

                <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Switch Teammate
                </div>
                {humanMembers.map((m) => {
                  const active = m.id === currentUser?.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        onSwitchUser?.(m);
                        setShowUserMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-zinc-100 flex items-center justify-between"
                    >
                      <span className={active ? "font-semibold text-zinc-900" : "text-zinc-700"}>
                        {m.displayName}
                      </span>
                      {active && <Check size={13} className="text-[#3f0e40]" />}
                    </button>
                  );
                })}

                <div className="border-t border-zinc-100 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenSettings?.("general");
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-100 flex items-center gap-2"
                  >
                    <Settings size={13} className="text-zinc-400" />
                    <span>Preferences & Settings…</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
