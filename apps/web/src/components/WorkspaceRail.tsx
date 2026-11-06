import React from "react";
import { Plus } from "lucide-react";
import type { WorkspaceItem } from "../api";

interface WorkspaceRailProps {
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
}

export const WorkspaceRail: React.FC<WorkspaceRailProps> = ({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
}) => {
  return (
    <div className="w-[66px] bg-[#141416] flex flex-col items-center py-3 gap-3 flex-shrink-0 z-20 border-r border-zinc-800 select-none">
      {/* macOS Window Controls */}
      <div className="flex items-center gap-1.5 pt-1 pb-2">
        <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] opacity-90 hover:opacity-100 transition-opacity" />
        <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] opacity-90 hover:opacity-100 transition-opacity" />
        <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] opacity-90 hover:opacity-100 transition-opacity" />
      </div>

      <div className="w-7 h-[1px] bg-zinc-800 my-0.5" />

      {/* Workspace List */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        {workspaces.map((ws) => {
          const isActive = ws.id === activeWorkspaceId;
          const initial = ws.name.slice(0, 2).toUpperCase();

          return (
            <div key={ws.id} className="relative group flex items-center justify-center w-full">
              {/* Active Pill Indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r" />
              )}
              <button
                onClick={() => onSelectWorkspace(ws.id)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-medium text-xs tracking-wide transition-all duration-150 ${
                  isActive
                    ? "bg-zinc-100 text-zinc-900 shadow-sm ring-2 ring-zinc-700 font-semibold"
                    : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-750 hover:text-white"
                }`}
                title={ws.name}
              >
                {initial}
              </button>
            </div>
          );
        })}

        <button
          className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-all duration-150 border border-zinc-800 hover:border-zinc-700"
          title="Create Workspace"
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
};

