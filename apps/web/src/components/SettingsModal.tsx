import React, { useState } from "react";
import {
  X,
  Settings,
  Bot,
  BookOpen,
  Shield,
  Cpu,
  Terminal,
  Users,
  Sparkles,
  Check,
  Plus,
} from "lucide-react";
import type {
  WorkspaceItem,
  MemberItem,
  BotItem,
  VaultSecretItem,
  VaultAuditLogItem,
  WikiPageItem,
  MachineItem,
} from "../api";
import { WikiView } from "./WikiView";
import { VaultView } from "./VaultView";
import { MachinesView } from "./MachinesView";
import { BotFace } from "./BotFace";

export type SettingsTab =
  | "general"
  | "agents"
  | "memory"
  | "vault"
  | "machines";

interface SettingsModalProps {
  isOpen: boolean;
  initialTab?: SettingsTab;
  workspace: WorkspaceItem | null;
  members: MemberItem[];
  currentUser: MemberItem | null;
  bots: BotItem[];
  wikiPages: WikiPageItem[];
  vaultData: { secrets: VaultSecretItem[]; logs: VaultAuditLogItem[] };
  machines: MachineItem[];
  autoExpandAgentSteps: boolean;
  onToggleAutoExpandAgentSteps: (val: boolean) => void;
  onClose: () => void;
  onSwitchUser: (user: MemberItem) => void;
  onOpenCreateBotModal: () => void;
  onOpenConnectCliModal: () => void;
  onOpenBotProfile: (bot: BotItem) => void;
  onSaveWikiPage: (data: { path: string; title: string; content: string }) => Promise<void>;
  onCreateVaultSecret: (data: {
    name: string;
    provider: string;
    accessLevel: "auto" | "checked" | "ask" | "human_only";
    secretValue: string;
    description?: string;
  }) => Promise<void>;
  onUpdateVaultLevel: (
    secretId: string,
    accessLevel: "auto" | "checked" | "ask" | "human_only"
  ) => Promise<void>;
  onSimulateVaultProxy: (
    secretId: string,
    body: { actorName: string; reason: string; targetEndpoint: string }
  ) => Promise<void>;
  onUpdateMachineHandoff: (
    machineId: string,
    action: "complete_handoff" | "request_handoff",
    reason?: string
  ) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  initialTab = "general",
  workspace,
  members,
  currentUser,
  bots,
  wikiPages,
  vaultData,
  machines,
  autoExpandAgentSteps,
  onToggleAutoExpandAgentSteps,
  onClose,
  onSwitchUser,
  onOpenCreateBotModal,
  onOpenConnectCliModal,
  onOpenBotProfile,
  onSaveWikiPage,
  onCreateVaultSecret,
  onUpdateVaultLevel,
  onSimulateVaultProxy,
  onUpdateMachineHandoff,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  if (!isOpen) return null;

  const humanMembers = members.filter((m) => m.userType === "human");
  const handoffCount = machines.filter((m) => m.handoffRequested).length;

  const navItems: Array<{
    id: SettingsTab;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
  }> = [
    { id: "general", label: "Preferences & Persona", icon: <Settings size={15} /> },
    { id: "agents", label: "Agents & CLI Bridge", icon: <Bot size={15} />, badge: bots.length },
    { id: "memory", label: "Memory (OptMem) & Wiki", icon: <BookOpen size={15} /> },
    { id: "vault", label: "Vault & Access Proxy", icon: <Shield size={15} />, badge: vaultData.secrets.length },
    {
      id: "machines",
      label: "Machines & Browser",
      icon: <Cpu size={15} />,
      badge: handoffCount > 0 ? "2FA" : machines.length,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-6xl h-[85vh] flex overflow-hidden animate-laze-message"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Slack-Style Settings Sidebar */}
        <div className="w-60 bg-zinc-50 border-r border-zinc-200/80 flex flex-col justify-between p-3 select-none flex-shrink-0">
          <div className="space-y-4">
            <div className="px-2.5 pt-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Workspace Settings
              </div>
              <div className="font-bold text-zinc-900 text-sm truncate mt-0.5">
                {workspace?.name || "ACME Logistics"}
              </div>
            </div>

            <nav className="space-y-0.5">
              {navItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                      active
                        ? "bg-[#3f0e40] text-white font-semibold shadow-2xs"
                        : "text-zinc-700 hover:bg-zinc-200/70"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className={active ? "text-white" : "text-zinc-500"}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                          active
                            ? "bg-white/20 text-white"
                            : item.badge === "2FA"
                            ? "bg-amber-100 text-amber-800 font-bold"
                            : "bg-zinc-200/80 text-zinc-600"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-100 border border-zinc-200/70 text-[11px] text-zinc-500 leading-relaxed">
            Tip: Press <kbd className="px-1 py-0.5 bg-white rounded border text-[10px] font-mono">⌘K</kbd> anywhere to jump between channels, apps, wiki pages, or settings.
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
          {/* Top Modal Bar */}
          <div className="h-12 px-6 border-b border-zinc-200/80 flex items-center justify-between flex-shrink-0">
            <span className="font-bold text-sm text-zinc-900">
              {navItems.find((i) => i.id === activeTab)?.label}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tab Views */}
          {activeTab === "general" && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl space-y-6">
                {/* Active Multiplayer Persona Switcher */}
                <div className="p-5 rounded-xl border border-zinc-200/90 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                        <Users size={15} className="text-[#3f0e40]" />
                        <span>Active Teammate Persona (Multiplayer Demo)</span>
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Switch which teammate you are acting as when posting messages or approving agent cards.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {humanMembers.map((m) => {
                      const isSelected = m.id === currentUser?.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => onSwitchUser(m)}
                          className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "border-[#3f0e40] bg-[#3f0e40]/5 ring-1 ring-[#3f0e40]"
                              : "border-zinc-200 hover:bg-zinc-50"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {m.avatarUrl ? (
                              <img
                                src={m.avatarUrl}
                                alt={m.displayName}
                                className="w-8 h-8 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-zinc-200 flex items-center justify-center font-bold text-xs">
                                {m.displayName.slice(0, 1)}
                              </div>
                            )}
                            <div className="truncate">
                              <div className="text-xs font-bold text-zinc-900 truncate">
                                {m.displayName}
                              </div>
                              <div className="text-[11px] text-zinc-500 capitalize">
                                {m.role}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-[#3f0e40] text-white flex items-center justify-center flex-shrink-0">
                              <Check size={12} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Progressive Disclosure Preferences */}
                <div className="p-5 rounded-xl border border-zinc-200/90 bg-white space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                      <Sparkles size={15} className="text-[#3f0e40]" />
                      <span>Progressive Disclosure & Chat Ergonomics</span>
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Keep chat clean like Slack by collapsing low-level agent execution telemetry until you click to inspect.
                    </p>
                  </div>

                  <label className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-200/70 cursor-pointer">
                    <div>
                      <div className="text-xs font-semibold text-zinc-900">
                        Always expand agent subprocess & OptMem steps in chat
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        When off (recommended), completed agent turns show a subtle 1-line summary that expands on click.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoExpandAgentSteps}
                      onChange={(e) => onToggleAutoExpandAgentSteps(e.target.checked)}
                      className="w-4 h-4 accent-[#3f0e40]"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === "agents" && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">
                      Workspace Agents ({bots.length})
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Each main agent wakes with permanent OptMem memory and delegates execution to isolated subprocesses.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onClose();
                        onOpenConnectCliModal();
                      }}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-800 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Terminal size={13} />
                      <span>Connect Local CLI</span>
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenCreateBotModal();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#3f0e40] hover:bg-[#350d36] text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Plus size={13} />
                      <span>New Agent</span>
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-zinc-200/80 border border-zinc-200/90 rounded-xl bg-white overflow-hidden">
                  {bots.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => {
                        onClose();
                        onOpenBotProfile(b);
                      }}
                      className="p-4 hover:bg-zinc-50 flex items-center justify-between gap-4 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          <BotFace look={b.avatarLabel || "1.7.0.0"} size={36} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-zinc-900">
                              {b.name}
                            </span>
                            <code className="text-[11px] font-mono text-zinc-500 bg-zinc-100 px-1.5 py-0.2 rounded">
                              @{b.handle}
                            </code>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-purple-50 text-[#3f0e40] border border-purple-200">
                              {b.connectionMode === "cli" ? "Local CLI" : b.engine}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 truncate mt-0.5">
                            {b.description || "Main workspace agent orchestrator"}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[#3f0e40] flex-shrink-0">
                        Configure →
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "memory" && (
            <div className="flex-1 flex min-h-0 overflow-hidden">
              <WikiView pages={wikiPages} onSavePage={onSaveWikiPage} />
            </div>
          )}

          {activeTab === "vault" && (
            <div className="flex-1 flex min-h-0 overflow-hidden">
              <VaultView
                secrets={vaultData.secrets}
                logs={vaultData.logs}
                onCreateSecret={onCreateVaultSecret}
                onUpdateLevel={onUpdateVaultLevel}
                onSimulateProxy={onSimulateVaultProxy}
              />
            </div>
          )}

          {activeTab === "machines" && (
            <div className="flex-1 flex min-h-0 overflow-hidden">
              <MachinesView
                machines={machines}
                onUpdateHandoff={onUpdateMachineHandoff}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
