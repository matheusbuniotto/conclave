import React, { useState } from "react";
import {
  Cpu,
  Globe,
  Terminal,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Hand,
  Play,
} from "lucide-react";
import type { MachineItem } from "../api";

interface MachinesViewProps {
  machines: MachineItem[];
  onUpdateHandoff: (
    machineId: string,
    action: "complete_handoff" | "request_handoff",
    reason?: string
  ) => Promise<void>;
}

export const MachinesView: React.FC<MachinesViewProps> = ({
  machines,
  onUpdateHandoff,
}) => {
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(
    machines.find((m) => m.handoffRequested)?.id || machines[0]?.id || null
  );
  const [simulated2faCode, setSimulated2faCode] = useState("492817");

  const activeMachine =
    machines.find((m) => m.id === selectedMachineId) || machines[0] || null;

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto">
      {/* Header */}
      <div className="h-12 px-6 border-b border-zinc-200/80 flex items-center justify-between flex-shrink-0 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-[#efebfe] text-[#5b40d6] flex items-center justify-center">
            <Cpu size={14} />
          </div>
          <h2 className="font-bold text-zinc-900 text-[14px] tracking-tight">
            Agent Computers & Browser Machines
          </h2>
          <span className="text-xs text-zinc-400">
            · 24/7 Cloud MicroVMs, Residential Browser Machines & Local CLI Bridges
          </span>
        </div>
      </div>

      <div className="max-w-5xl w-full mx-auto px-6 py-6 space-y-6">
        {/* Machine Cards Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {machines.map((m) => {
            const isSelected = activeMachine?.id === m.id;
            const isHandoff = m.handoffRequested || m.status === "handoff";

            return (
              <div
                key={m.id}
                onClick={() => setSelectedMachineId(m.id)}
                className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                  isSelected
                    ? "border-[#5b40d6] bg-[#efebfe]/25 ring-2 ring-[#5b40d6]/15"
                    : "border-zinc-200/90 bg-white hover:border-zinc-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {m.kind === "browser_machine" ? (
                      <Globe size={15} className="text-[#5b40d6]" />
                    ) : m.kind === "local_host" ? (
                      <Terminal size={15} className="text-emerald-600" />
                    ) : (
                      <Cpu size={15} className="text-zinc-700" />
                    )}
                    <span className="font-bold text-xs text-zinc-900 font-mono">
                      {m.name}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      isHandoff
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {isHandoff ? "Sign-In Handoff" : m.status}
                  </span>
                </div>

                <div className="text-[11px] text-zinc-500 mt-2">{m.region}</div>
                <div className="text-[11px] font-mono text-zinc-600 mt-0.5">
                  {m.specs}
                </div>
                <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">IP: {m.ipAddress}</span>
                  {m.activeAgentName && (
                    <span className="font-semibold text-[#5b40d6]">
                      {m.activeAgentName}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Remote Screen / Sign-In Handoff Simulator (Inspired by laze.so/machines) */}
        {activeMachine && (
          <div className="rounded-2xl border border-zinc-200/90 overflow-hidden shadow-md bg-[#18181b] text-zinc-100">
            {/* Remote Window Chrome Bar */}
            <div
              className={`px-4 py-2.5 flex items-center justify-between border-b ${
                activeMachine.handoffRequested
                  ? "bg-amber-500/20 border-amber-500/30"
                  : "bg-emerald-500/15 border-emerald-500/30"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {activeMachine.handoffRequested ? (
                  <AlertTriangle size={15} className="text-amber-400" />
                ) : (
                  <CheckCircle2 size={15} className="text-emerald-400" />
                )}
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>
                      {activeMachine.handoffRequested
                        ? `Human Handoff Active — ${activeMachine.activeAgentName || "Agent"} is locked out while your screen is open`
                        : `${activeMachine.activeAgentName || "Agent"} is driving (${activeMachine.name})`}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-300">
                    {activeMachine.handoffRequested
                      ? activeMachine.handoffReason
                      : `Target URL: ${activeMachine.currentUrl} • Fixed IP ${activeMachine.ipAddress}`}
                  </div>
                </div>
              </div>

              <div>
                {activeMachine.handoffRequested ? (
                  <button
                    onClick={() => onUpdateHandoff(activeMachine.id, "complete_handoff")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Play size={12} />
                    <span>Done · Hand back to {activeMachine.activeAgentName || "Agent"}</span>
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      onUpdateHandoff(
                        activeMachine.id,
                        "request_handoff",
                        "Human took over remote browser screen for manual sign-in / 2FA."
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Hand size={12} />
                    <span>Take Over Screen (Lock Out Agent)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Simulated Remote Viewport */}
            <div className="p-6 bg-[#121214] min-h-[280px] flex flex-col items-center justify-center">
              {activeMachine.handoffRequested ? (
                <div className="max-w-md w-full rounded-xl bg-white text-zinc-900 p-5 shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Lock size={14} className="text-emerald-600" />
                      <span className="font-mono text-xs text-zinc-600">
                        {activeMachine.currentUrl || "https://www.linkedin.com/checkpoint/challenge"}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                      Agent Blinded
                    </span>
                  </div>

                  <div className="text-xs font-bold text-zinc-900">
                    Sign in directly on the remote browser machine
                  </div>
                  <p className="text-[11.5px] text-zinc-500 leading-relaxed">
                    Your password and 2FA code go straight to the site on{" "}
                    <code className="font-mono">{activeMachine.ipAddress}</code>. The agent cannot see your screen or keystrokes while you sign in.
                  </p>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                      2FA Verification Code
                    </label>
                    <input
                      type="text"
                      value={simulated2faCode}
                      onChange={(e) => setSimulated2faCode(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 font-mono text-xs text-zinc-900"
                    />
                  </div>

                  <button
                    onClick={() => onUpdateHandoff(activeMachine.id, "complete_handoff")}
                    className="w-full py-2 rounded-lg bg-[#5b40d6] hover:bg-[#4b30c2] text-white font-semibold text-xs transition-colors"
                  >
                    Verify & Hand Session Back to {activeMachine.activeAgentName || "Agent"}
                  </button>
                </div>
              ) : (
                <div className="max-w-xl w-full rounded-xl border border-zinc-800 bg-[#18181b] p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                    <span>SESSION: {activeMachine.name}</span>
                    <span className="text-emerald-400">● CDP / Sandbox Active</span>
                  </div>
                  <pre className="text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto">
{`$ conclave machine status ${activeMachine.name}
Machine:  ${activeMachine.name} (${activeMachine.region})
Specs:    ${activeMachine.specs}
IP:       ${activeMachine.ipAddress}
Driver:   ${activeMachine.activeAgentName || "Idle"}
Target:   ${activeMachine.currentUrl || "/workspace"}
Status:   Authenticated session persisted on disk.`}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
