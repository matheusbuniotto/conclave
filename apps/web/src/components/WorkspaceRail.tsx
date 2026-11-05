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
    <div className="w-[68px] bg-[#2C0D2E] flex flex-col items-center py-3 gap-3 flex-shrink-0 z-20 border-r border-[#3a123d]">
      {workspaces.map((ws) => {
        const isActive = ws.id === activeWorkspaceId;
        const initial = ws.name.slice(0, 2).toUpperCase();

        return (
          <div key={ws.id} className="relative group">
            {isActive && (
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-white rounded-r-md" />
            )}
            <button
              onClick={() => onSelectWorkspace(ws.id)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-all duration-150 ${
                isActive
                  ? "bg-white text-[#2C0D2E] shadow-lg ring-2 ring-white/50"
                  : "bg-white/10 text-white hover:bg-white/20 hover:rounded-xl"
              }`}
              title={ws.name}
            >
              {initial}
            </button>
          </div>
        );
      })}

      <button
        className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-all duration-150 border border-dashed border-white/20"
        title="Create a Workspace"
      >
        <Plus size={18} />
      </button>
    </div>
  );
};
