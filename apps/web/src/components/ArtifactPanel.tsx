import React, { useRef, useState, useEffect } from "react";
import {
  X,
  ExternalLink,
  RotateCw,
  AppWindow,
  History,
  Check,
  Database,
  Globe,
  Lock,
  Users,
} from "lucide-react";
import type { AppVersionItem } from "../api";

export interface ActiveAppArtifact {
  appId?: string;
  appSlug?: string;
  appTitle: string;
  appUrl: string;
  sandboxId?: string;
  containerPort?: number;
  version?: number;
  versions?: AppVersionItem[];
  accessLevel?: "restricted" | "workspace" | "public";
}

interface ArtifactPanelProps {
  artifact: ActiveAppArtifact | null;
  onClose: () => void;
  onRevertVersion?: (appId: string, version: number) => Promise<void>;
  onUpdateAccessLevel?: (appId: string, accessLevel: "restricted" | "workspace" | "public") => Promise<void>;
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({
  artifact,
  onClose,
  onRevertVersion,
  onUpdateAccessLevel,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [envMode, setEnvMode] = useState<"live" | "draft">("live");
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [showVersionsDropdown, setShowVersionsDropdown] = useState(false);
  const [showShareDropdown, setShowShareDropdown] = useState(false);

  useEffect(() => {
    setSelectedVersion(null);
  }, [artifact?.version]);

  if (!artifact) return null;

  const activeVer = selectedVersion || artifact.version || 1;
  const separator = artifact.appUrl.includes("?") ? "&" : "?";
  const computedSrc = `${artifact.appUrl}${separator}env=${envMode}&version=${activeVer}`;

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (iframeRef.current) {
      iframeRef.current.src = computedSrc;
    }
    setTimeout(() => setIsRefreshing(false), 450);
  };

  const handleRevert = async (ver: number) => {
    setSelectedVersion(ver);
    setShowVersionsDropdown(false);
    if (artifact.appId && onRevertVersion) {
      await onRevertVersion(artifact.appId, ver);
    }
  };

  return (
    <div className="w-[500px] lg:w-[592px] border-l border-zinc-200/90 bg-white flex flex-col flex-shrink-0 z-20 h-full shadow-xl animate-laze-panel">
      {/* Split Pane Header */}
      <div className="h-12 border-b border-zinc-200/90 px-4 flex items-center justify-between flex-shrink-0 bg-zinc-50/80 select-none">
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-6 h-6 rounded-lg bg-[#efebfe] border border-[#5b40d6]/20 flex items-center justify-center text-[#5b40d6] flex-shrink-0">
            <AppWindow size={13} />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-zinc-900 text-[13px] truncate leading-tight tracking-tight">
                {artifact.appTitle}
              </h3>
              <span className="text-[10px] font-mono bg-zinc-200/70 text-zinc-700 px-1.5 py-0.2 rounded">
                v{activeVer}
              </span>
            </div>
            <span className="text-[10.5px] text-zinc-500 font-normal flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  envMode === "live" ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              {envMode === "live"
                ? "Published EU Database • Multiplayer Sync"
                : "Isolated Draft Sandbox • Safe Testing"}
            </span>
          </div>
        </div>

        {/* Right Controls: Live/Draft Toggle, Version History, Share, Reload, Close */}
        <div className="flex items-center gap-1.5">
          {/* Live vs Draft DB Switcher */}
          <div className="flex items-center bg-zinc-200/70 p-0.5 rounded-lg text-[11px] font-medium">
            <button
              onClick={() => setEnvMode("live")}
              className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                envMode === "live"
                  ? "bg-white text-zinc-900 shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
              title="Use Live Published Team Database"
            >
              <Database size={10} className="text-emerald-600" />
              <span>Live</span>
            </button>
            <button
              onClick={() => setEnvMode("draft")}
              className={`px-2 py-0.5 rounded-md transition-all ${
                envMode === "draft"
                  ? "bg-white text-amber-700 shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
              title="Test in Isolated Draft Database"
            >
              Draft
            </button>
          </div>

          {/* Version History Popover */}
          {artifact.versions && artifact.versions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowVersionsDropdown(!showVersionsDropdown);
                  setShowShareDropdown(false);
                }}
                className="px-2 py-1 text-[11px] font-medium text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200/90 rounded-lg flex items-center gap-1 transition-colors"
                title="Version History & 1-Click Revert"
              >
                <History size={12} className="text-zinc-500" />
                <span>Versions</span>
              </button>

              {showVersionsDropdown && (
                <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl border border-zinc-200 shadow-xl p-2 z-30 text-xs">
                  <div className="px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 mb-1">
                    App Version History (Revertible)
                  </div>
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {artifact.versions.map((v) => {
                      const isCurrent = v.version === activeVer;
                      return (
                        <div
                          key={v.id}
                          onClick={() => handleRevert(v.version)}
                          className={`p-2 rounded-lg cursor-pointer transition-colors flex items-start justify-between gap-2 ${
                            isCurrent
                              ? "bg-[#efebfe]/60 border border-[#5b40d6]/25"
                              : "hover:bg-zinc-50"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                              <span className="font-mono text-[11px] bg-zinc-100 px-1 rounded">
                                v{v.version}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] text-[#5b40d6] font-semibold">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-600 mt-0.5 leading-snug">
                              {v.summary}
                            </p>
                          </div>
                          {isCurrent ? (
                            <Check size={13} className="text-[#5b40d6] flex-shrink-0 mt-1" />
                          ) : (
                            <span className="text-[10px] font-medium text-[#5b40d6] hover:underline flex-shrink-0 mt-1">
                              Use v{v.version}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Access / Sharing Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setShowShareDropdown(!showShareDropdown);
                setShowVersionsDropdown(false);
              }}
              className="px-2 py-1 text-[11px] font-medium text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200/90 rounded-lg flex items-center gap-1 transition-colors"
              title="General Access & Customer Portal Sharing"
            >
              <Globe size={12} className="text-zinc-500" />
              <span>Share</span>
            </button>

            {showShareDropdown && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl border border-zinc-200 shadow-xl p-2.5 z-30 text-xs space-y-1.5">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400 px-1">
                  General Access
                </div>
                {(
                  [
                    {
                      id: "restricted",
                      label: "Restricted",
                      desc: "Only channel members & invited people",
                      icon: Lock,
                    },
                    {
                      id: "workspace",
                      label: "Everyone in workspace",
                      desc: "Every signed-in ACME teammate",
                      icon: Users,
                    },
                    {
                      id: "public",
                      label: "Anyone with the link",
                      desc: "External customer portal ready",
                      icon: Globe,
                    },
                  ] as const
                ).map((opt) => {
                  const Icon = opt.icon;
                  const active = (artifact.accessLevel || "workspace") === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        if (artifact.appId && onUpdateAccessLevel) {
                          onUpdateAccessLevel(artifact.appId, opt.id);
                        }
                        setShowShareDropdown(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg flex items-start gap-2 transition-colors ${
                        active ? "bg-[#efebfe]/60 text-[#5b40d6]" : "hover:bg-zinc-50 text-zinc-700"
                      }`}
                    >
                      <Icon size={13} className="mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[11.5px]">{opt.label}</div>
                        <div className="text-[10.5px] text-zinc-500">{opt.desc}</div>
                      </div>
                      {active && <Check size={12} className="mt-1" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={handleRefresh}
            className={`p-1.5 text-zinc-500 hover:text-zinc-800 rounded-md hover:bg-zinc-200/60 transition-colors ${
              isRefreshing ? "animate-spin text-zinc-800" : ""
            }`}
            title="Reload Preview"
          >
            <RotateCw size={13} />
          </button>

          <a
            href={computedSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-zinc-500 hover:text-zinc-800 rounded-md hover:bg-zinc-200/60 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink size={13} />
          </a>

          <div className="w-[1px] h-3.5 bg-zinc-200 mx-0.5" />

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-md hover:bg-zinc-200/60 transition-colors"
            title="Close Panel"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 w-full h-full bg-zinc-100 relative">
        <iframe
          ref={iframeRef}
          src={computedSrc}
          title={artifact.appTitle}
          className="w-full h-full border-0 bg-white"
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"
        />
      </div>
    </div>
  );
};
