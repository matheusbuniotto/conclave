import React, { useState } from "react";
import {
  Shield,
  Lock,
  CheckCircle2,
  ArrowRight,
  Plus,
  Fingerprint,
  Activity,
  Play,
} from "lucide-react";
import type { VaultSecretItem, VaultAuditLogItem } from "../api";

interface VaultViewProps {
  secrets: VaultSecretItem[];
  logs: VaultAuditLogItem[];
  onCreateSecret: (data: {
    name: string;
    provider: string;
    accessLevel: "auto" | "checked" | "ask" | "human_only";
    secretValue: string;
    description: string;
  }) => Promise<void>;
  onUpdateLevel: (
    secretId: string,
    accessLevel: "auto" | "checked" | "ask" | "human_only"
  ) => Promise<void>;
  onSimulateProxy: (
    secretId: string,
    body: { actorName: string; reason: string; targetEndpoint: string }
  ) => Promise<void>;
}

const ACCESS_LEVELS = [
  {
    id: "auto" as const,
    label: "Auto",
    desc: "Injected automatically by Egress Proxy",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    id: "checked" as const,
    label: "Checked",
    desc: "AI policy judge checks reason before release",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    id: "ask" as const,
    label: "Ask",
    desc: "Posts approval card in chat & Feed for each use",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    id: "human_only" as const,
    label: "Human only",
    desc: "Touch ID / Secure Enclave sealed key on device",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
];

export const VaultView: React.FC<VaultViewProps> = ({
  secrets,
  logs,
  onCreateSecret,
  onUpdateLevel,
  onSimulateProxy,
}) => {
  const [selectedSecretId, setSelectedSecretId] = useState<string | null>(
    secrets[0]?.id || null
  );
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newProvider, setNewProvider] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newLevel, setNewLevel] = useState<"auto" | "checked" | "ask" | "human_only">("ask");

  const activeSecret =
    secrets.find((s) => s.id === selectedSecretId) || secrets[0] || null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newValue.trim()) return;
    await onCreateSecret({
      name: newName.trim(),
      provider: newProvider.trim() || "Custom API",
      accessLevel: newLevel,
      secretValue: newValue.trim(),
      description: newDesc.trim(),
    });
    setNewName("");
    setNewProvider("");
    setNewValue("");
    setNewDesc("");
    setIsAdding(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto">
      {/* Header */}
      <div className="h-12 px-6 border-b border-zinc-200/80 flex items-center justify-between flex-shrink-0 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-[#efebfe] text-[#5b40d6] flex items-center justify-center">
            <Shield size={14} />
          </div>
          <h2 className="font-bold text-zinc-900 text-[14px] tracking-tight">
            Vault & Egress Proxy Security
          </h2>
          <span className="text-xs text-zinc-400">
            · Agents never see raw credentials; secrets are injected in flight
          </span>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-3 py-1 rounded-lg bg-[#5b40d6] hover:bg-[#4b30c2] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          <Plus size={13} />
          <span>Add Secret</span>
        </button>
      </div>

      <div className="max-w-5xl w-full mx-auto px-6 py-6 space-y-6">
        {/* Add Secret Form */}
        {isAdding && (
          <form
            onSubmit={handleAddSubmit}
            className="p-4 rounded-2xl border border-[#5b40d6]/30 bg-[#efebfe]/25 grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                Key Name
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="github-org-token"
                className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                Service / Provider
              </label>
              <input
                type="text"
                value={newProvider}
                onChange={(e) => setNewProvider(e.target.value)}
                placeholder="GitHub"
                className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                Raw Secret (Sealed)
              </label>
              <input
                type="password"
                required
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="ghp_••••••••••••"
                className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                Access Level
              </label>
              <select
                value={newLevel}
                onChange={(e) => setNewLevel(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs outline-none"
              >
                {ACCESS_LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label} — {l.desc}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-[#5b40d6] hover:bg-[#4b30c2] text-white font-semibold text-xs"
            >
              Seal in Vault
            </button>
          </form>
        )}

        {/* Interactive 3-Stage Egress Proxy Inspector (Inspired by laze.so/vault) */}
        {activeSecret && (
          <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/60 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#5b40d6]">
                  Live 3-Stage Egress Proxy Inspector
                </div>
                <h3 className="text-sm font-bold text-zinc-900 mt-0.5">
                  Inspecting: <span className="font-mono">{activeSecret.name}</span> (
                  {activeSecret.provider})
                </h3>
              </div>

              <button
                onClick={() =>
                  onSimulateProxy(activeSecret.id, {
                    actorName: "Ops Agent",
                    reason: `Verify ${activeSecret.provider} status via Egress Proxy`,
                    targetEndpoint: `https://api.${activeSecret.provider
                      .toLowerCase()
                      .replace(/\s+/g, "")}.com/v1/status`,
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Play size={11} />
                <span>Simulate Agent Egress Call</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Stage 1 */}
              <div className="p-3.5 rounded-xl bg-white border border-zinc-200/90 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-900">
                  <span>1. On Agent Computer</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 font-mono">
                    Placeholder Only
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  The agent sandbox only ever holds a symbolic token. Prompt injection cannot leak the real key.
                </p>
                <pre className="p-2 rounded bg-[#18181b] text-amber-300 font-mono text-[10.5px] overflow-x-auto">
{`Authorization: Bearer ${activeSecret.maskedValue}`}
                </pre>
              </div>

              {/* Stage 2 */}
              <div className="p-3.5 rounded-xl bg-white border border-zinc-200/90 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-900">
                  <span>2. At Conclave Egress Proxy</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#efebfe] text-[#5b40d6] font-mono uppercase">
                    Policy: {activeSecret.accessLevel}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  {activeSecret.accessLevel === "auto"
                    ? "Proxy swaps in the real secret in flight and redacts stdout."
                    : activeSecret.accessLevel === "checked"
                    ? "AI Policy Judge verifies the agent's stated reason matches channel scope."
                    : activeSecret.accessLevel === "ask"
                    ? "Held at proxy until a human clicks Allow on the chat Approval Card."
                    : "Requires hardware Touch ID / Secure Enclave unlock on owner's Mac."}
                </p>
                <pre className="p-2 rounded bg-[#18181b] text-emerald-300 font-mono text-[10.5px] overflow-x-auto">
{activeSecret.accessLevel === "human_only"
  ? "🔒 Touch ID Biometry Required"
  : "✓ Swapped in-flight TLS header"}
                </pre>
              </div>

              {/* Stage 3 */}
              <div className="p-3.5 rounded-xl bg-white border border-zinc-200/90 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-900">
                  <span>3. Immutable Audit Log</span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {activeSecret.usageCount} uses
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Every call records the agent, human approver, reason, and target URL.
                </p>
                <div className="p-2 rounded bg-zinc-50 border border-zinc-200/70 text-[11px] font-mono text-zinc-700 truncate">
                  conclave vault run {activeSecret.name} --reason "..."
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vault Connections Table */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
            Workspace Vault Connections ({secrets.length})
          </h3>
          <div className="rounded-2xl border border-zinc-200/90 bg-white overflow-hidden shadow-xs divide-y divide-zinc-100">
            {secrets.map((sec) => {
              const isSelected = activeSecret?.id === sec.id;
              return (
                <div
                  key={sec.id}
                  onClick={() => setSelectedSecretId(sec.id)}
                  className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected ? "bg-[#efebfe]/25" : "hover:bg-zinc-50/70"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {sec.accessLevel === "human_only" ? (
                        <Fingerprint size={14} className="text-rose-600" />
                      ) : (
                        <Lock size={13} className="text-[#5b40d6]" />
                      )}
                      <span className="font-bold text-xs text-zinc-900 font-mono">
                        {sec.name}
                      </span>
                      <span className="text-[11px] px-2 py-0.2 rounded bg-zinc-100 text-zinc-600 font-medium">
                        {sec.provider}
                      </span>
                      <code className="text-[11px] text-zinc-400 font-mono">
                        {sec.maskedValue}
                      </code>
                    </div>
                    {sec.description && (
                      <p className="text-xs text-zinc-500">{sec.description}</p>
                    )}
                  </div>

                  {/* 4-Level Access Switcher Pills */}
                  <div
                    className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl self-start md:self-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {ACCESS_LEVELS.map((lvl) => {
                      const active = sec.accessLevel === lvl.id;
                      return (
                        <button
                          key={lvl.id}
                          onClick={() => onUpdateLevel(sec.id, lvl.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                            active
                              ? "bg-white text-zinc-900 shadow-2xs"
                              : "text-zinc-500 hover:text-zinc-800"
                          }`}
                          title={lvl.desc}
                        >
                          {lvl.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Audit Log */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
            <Activity size={13} />
            <span>Vault Usage & Egress Audit Log</span>
          </h3>
          <div className="rounded-2xl border border-zinc-200/90 bg-white overflow-hidden shadow-xs divide-y divide-zinc-100 text-xs">
            {logs.map((log) => (
              <div
                key={log.id}
                className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-zinc-50/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900">{log.actorName}</span>
                    <ArrowRight size={11} className="text-zinc-400" />
                    <code className="text-[11px] font-mono text-[#5b40d6] bg-[#efebfe]/60 px-1.5 py-0.2 rounded">
                      {log.action}
                    </code>
                    {log.targetEndpoint && (
                      <span className="text-[11px] font-mono text-zinc-400 truncate">
                        {log.targetEndpoint}
                      </span>
                    )}
                  </div>
                  <div className="text-[11.5px] text-zinc-600 mt-0.5">
                    Reason: “{log.reason}”
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      log.status === "allowed"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {log.status}
                  </span>
                  <span className="text-[10.5px] text-zinc-400">
                    {new Date(log.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
