import React, { useState } from "react";
import {
  LayoutGrid,
  PanelRight,
  ExternalLink,
  History,
  Database,
  Globe,
  Lock,
  Users,
  Pin,
  Code2,
} from "lucide-react";
import type { WorkspaceAppItem, ChannelItem } from "../api";

interface AppsViewProps {
  apps: WorkspaceAppItem[];
  channels: ChannelItem[];
  onOpenAppSideBySide: (app: WorkspaceAppItem) => void;
  onRevertAppVersion: (appId: string, version: number) => void;
  onTogglePin: (app: WorkspaceAppItem) => void;
}

export const AppsView: React.FC<AppsViewProps> = ({
  apps,
  channels,
  onOpenAppSideBySide,
  onRevertAppVersion,
  onTogglePin,
}) => {
  const [showSdkDocs, setShowSdkDocs] = useState(false);

  const getChannelName = (channelId?: string | null) => {
    if (!channelId) return "workspace";
    return channels.find((c) => c.id === channelId)?.name || "channel";
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto">
      {/* Header */}
      <div className="h-12 px-6 border-b border-zinc-200/80 flex items-center justify-between flex-shrink-0 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-[#efebfe] text-[#5b40d6] flex items-center justify-center">
            <LayoutGrid size={14} />
          </div>
          <h2 className="font-bold text-zinc-900 text-[14px] tracking-tight">
            Internal Apps
          </h2>
          <span className="text-xs text-zinc-400">
            · Built in chat, backed by reactive EU databases & version snapshots
          </span>
        </div>

        <button
          onClick={() => setShowSdkDocs(!showSdkDocs)}
          className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200/70 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
        >
          <Code2 size={13} className="text-[#5b40d6]" />
          <span>{showSdkDocs ? "Hide App Kit SDK" : "App Kit SDK (/_conclave/*)"}</span>
        </button>
      </div>

      <div className="max-w-5xl w-full mx-auto px-6 py-6 space-y-6">
        {/* 4-Step Visual Pipeline Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            {
              step: "1",
              title: "Ask in a channel",
              desc: 'Tag @ops-agent or @sales-agent: "Track trucks booked for each dock this week."',
            },
            {
              step: "2",
              title: "The agent builds it",
              desc: "Writes the UI with /_conclave/kit.css, provisions Conclave.records(), and populates rows.",
            },
            {
              step: "3",
              title: "Try it in Draft",
              desc: "Test schema or layout changes against isolated Draft records without touching live data.",
            },
            {
              step: "4",
              title: "Publish & Revert",
              desc: "Pins beside the chat. Every push creates an immutable snapshot you can revert in 1 click.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="p-3.5 rounded-xl border border-zinc-200/90 bg-zinc-50/50 space-y-1"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#5b40d6] text-white text-[11px] font-bold flex items-center justify-center">
                  {item.step}
                </span>
                <span className="font-bold text-xs text-zinc-900">{item.title}</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Optional Platform App Kit SDK Reference */}
        {showSdkDocs && (
          <div className="p-4 rounded-2xl border border-[#5b40d6]/25 bg-[#18181b] text-zinc-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-mono">
                Platform App Kit • /_conclave/theme.css · /_conclave/kit.css · /_conclave/conclave.js
              </span>
              <span className="text-[10.5px] text-emerald-400 font-mono">
                Zero-dependency Reactive Store
              </span>
            </div>
            <pre className="text-[11.5px] font-mono text-zinc-300 overflow-x-auto leading-relaxed">
{`<link rel="stylesheet" href="/_conclave/theme.css" />
<link rel="stylesheet" href="/_conclave/kit.css" />
<script src="/_conclave/conclave.js"></script>
<script>
  const deals = Conclave.records("deals"); // Also aliased as Laze.records("deals")
  const rows = await deals.list();
  await deals.create({ account: "Brightline", valueEur: 148000, status: "On Track" });
  deals.subscribe((updatedRows) => renderTable(updatedRows));
</script>`}
            </pre>
          </div>
        )}

        {/* Apps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {apps.map((app) => (
            <div
              key={app.id}
              className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-zinc-900 text-sm">{app.title}</h3>
                      <span className="px-2 py-0.2 rounded-full text-[10.5px] font-mono font-semibold bg-[#efebfe] text-[#5b40d6]">
                        v{app.currentVersion}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Live
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                      <span>Pinned in #{getChannelName(app.channelId)}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 capitalize">
                        {app.accessLevel === "restricted" ? (
                          <Lock size={10} />
                        ) : app.accessLevel === "public" ? (
                          <Globe size={10} />
                        ) : (
                          <Users size={10} />
                        )}
                        {app.accessLevel} access
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onTogglePin(app)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      app.isPinned
                        ? "bg-[#efebfe] border-[#5b40d6]/30 text-[#5b40d6]"
                        : "bg-white border-zinc-200 text-zinc-400 hover:text-zinc-700"
                    }`}
                    title={app.isPinned ? "Pinned to channel header" : "Pin to channel header"}
                  >
                    <Pin size={13} className="rotate-45" />
                  </button>
                </div>

                {app.description && (
                  <p className="text-xs text-zinc-600 mt-2.5 leading-relaxed">
                    {app.description}
                  </p>
                )}

                {/* Version History Strip */}
                {app.versions && app.versions.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-zinc-100 space-y-1.5">
                    <div className="flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
                      <span className="flex items-center gap-1">
                        <History size={11} />
                        <span>Version History</span>
                      </span>
                      <span className="flex items-center gap-1 text-emerald-600">
                        <Database size={10} />
                        <span>Revert never deletes records</span>
                      </span>
                    </div>
                    <div className="space-y-1">
                      {app.versions.map((v) => {
                        const isCurrent = v.version === app.currentVersion;
                        return (
                          <div
                            key={v.id}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-zinc-50/80"
                          >
                            <div className="truncate pr-2">
                              <span className="font-mono font-semibold text-zinc-800 mr-1.5">
                                v{v.version}
                              </span>
                              <span className="text-zinc-600 text-[11.5px]">{v.summary}</span>
                            </div>
                            {isCurrent ? (
                              <span className="text-[10px] font-semibold text-[#5b40d6] flex-shrink-0">
                                Current
                              </span>
                            ) : (
                              <button
                                onClick={() => onRevertAppVersion(app.id, v.version)}
                                className="text-[11px] font-semibold text-[#5b40d6] hover:underline flex-shrink-0"
                              >
                                Revert to v{v.version}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center gap-2">
                <button
                  onClick={() => onOpenAppSideBySide(app)}
                  className="px-3 py-1.5 rounded-lg bg-[#5b40d6] hover:bg-[#4b30c2] text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <PanelRight size={13} />
                  <span>Open in Split Pane</span>
                </button>
                <a
                  href={app.appUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 font-medium text-xs flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink size={12} />
                  <span>Open Standalone</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
