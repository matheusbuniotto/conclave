import React from "react";
import { Plus, Shield, Cpu, BookOpen, LayoutGrid } from "lucide-react";
import type { WorkspaceItem } from "../api";
import type { NavView } from "./Sidebar";

interface WorkspaceRailProps {
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string | null;
  activeView: NavView;
  onSelectWorkspace: (id: string) => void;
  onSelectView: (view: NavView) => void;
}

export const WorkspaceRail: React.FC<WorkspaceRailProps> = ({
  workspaces,
  activeWorkspaceId,
  activeView,
  onSelectWorkspace,
  onSelectView,
}) => {
  return (
    <div className="w-[62px] bg-[#181220] flex flex-col items-center py-3 gap-2.5 flex-shrink-0 z-20 border-r border-white/[0.06] select-none">
      {/* macOS Traffic Lights */}
      <div className="flex items-center gap-1.5 pt-1 pb-2">
        <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] opacity-90 hover:opacity-100 transition-opacity" />
        <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] opacity-90 hover:opacity-100 transition-opacity" />
        <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] opacity-90 hover:opacity-100 transition-opacity" />
      </div>

      <div className="w-7 h-[1px] bg-white/[0.08] my-0.5" />

      {/* Workspace List */}
      <div className="flex flex-col items-center gap-2.5 w-full flex-1">
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
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#ab98ff] rounded-r" />
              )}
              <button
                onClick={() => {
                  onSelectWorkspace(ws.id);
                  onSelectView("chat");
                }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs tracking-wide transition-all duration-150 ${
                  isActive
                    ? "bg-gradient-to-br from-[#5b40d6] to-[#f08a3c] text-white shadow-md ring-2 ring-white/20"
                    : "bg-white/[0.06] text-zinc-300 hover:bg-white/[0.12] hover:text-white"
                }`}
                title={ws.name}
              >
                {initial}
              </button>
            </div>
          );
        })}

        <button
          className="w-10 h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-all duration-150 border border-white/[0.07]"
          title="Add Workspace"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Bottom Quick Platform Switchers (Apps, Vault, Machines, Wiki) */}
      <div className="flex flex-col items-center gap-1.5 pb-1">
        <button
          onClick={() => onSelectView("apps")}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            activeView === "apps"
              ? "bg-[#5b40d6] text-white shadow-xs"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.07]"
          }`}
          title="Internal Apps Directory"
        >
          <LayoutGrid size={15} />
        </button>
        <button
          onClick={() => onSelectView("machines")}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            activeView === "machines"
              ? "bg-[#5b40d6] text-white shadow-xs"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.07]"
          }`}
          title="Agent Computers & Browser Machines"
        >
          <Cpu size={15} />
        </button>
        <button
          onClick={() => onSelectView("vault")}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            activeView === "vault"
              ? "bg-[#5b40d6] text-white shadow-xs"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.07]"
          }`}
          title="Vault & Egress Proxy Security"
        >
          <Shield size={15} />
        </button>
        <button
          onClick={() => onSelectView("wiki")}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            activeView === "wiki"
              ? "bg-[#5b40d6] text-white shadow-xs"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.07]"
          }`}
          title="Memory (SOUL.md / AGENTS.md) & Workspace Wiki"
        >
          <BookOpen size={15} />
        </button>
      </div>
    </div>
  );
};
