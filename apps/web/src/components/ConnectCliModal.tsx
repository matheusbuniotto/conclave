import React, { useState } from "react";
import { X, Copy, Check, Terminal, Sparkles, ArrowRight } from "lucide-react";
import type { ChannelItem, WorkspaceItem } from "../api";

interface ConnectCliModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: WorkspaceItem | null;
  activeChannel: ChannelItem | null;
  onQuickCreateConnectedBot: (data: {
    name: string;
    handle: string;
    engine: "claude" | "agy";
  }) => Promise<void>;
}

export const ConnectCliModal: React.FC<ConnectCliModalProps> = ({
  isOpen,
  onClose,
  workspace,
  activeChannel,
  onQuickCreateConnectedBot,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cliTool, setCliTool] = useState<"claude" | "agy">("claude");
  const [agentName, setAgentName] = useState("My Local Claude");
  const [copied, setCopied] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  if (!isOpen) return null;

  const channelName = activeChannel?.name || "ops";
  const wsSlug = workspace?.slug || "acme";
  const token = `lzl_${wsSlug}_${channelName}_9f4k2x`;
  const oneLinePrompt = `Join the ${
    workspace?.name || "ACME"
  } workspace on Conclave and listen in #${channelName}: https://conclave.local/j/${token}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(oneLinePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSimulateLink = async () => {
    setIsLinking(true);
    try {
      const handle = agentName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      await onQuickCreateConnectedBot({
        name: agentName,
        handle: handle || "local-agent",
        engine: cliTool,
      });
      setStep(3);
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#5b40d6] text-white flex items-center justify-center shadow-2xs">
              <Terminal size={14} />
            </div>
            <div>
              <h2 className="font-bold text-zinc-900 text-[14px] tracking-tight">
                Put your colleagues in a chat with your {cliTool === "claude" ? "Claude" : "agy"}
              </h2>
              <p className="text-[11px] text-zinc-500">
                Connect your local CLI session ($0 extra seat cost) so teammates can @mention it
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-md hover:bg-zinc-200/60"
          >
            <X size={15} />
          </button>
        </div>

        {/* 3-Step Tabs (Inspired by laze.so/agents ConnectStory) */}
        <div className="grid grid-cols-3 border-b border-zinc-100 bg-zinc-50/40 text-xs font-semibold">
          {[
            { n: 1 as const, label: "1. Copy Invite Prompt" },
            { n: 2 as const, label: "2. Paste in Terminal" },
            { n: 3 as const, label: "3. Team @Mentions It" },
          ].map((t) => (
            <button
              key={t.n}
              onClick={() => setStep(t.n)}
              className={`py-2.5 px-3 border-b-2 transition-colors ${
                step === t.n
                  ? "border-[#5b40d6] text-[#5b40d6] bg-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4 text-xs">
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCliTool("claude");
                    setAgentName("Ivo's Local Claude");
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    cliTool === "claude"
                      ? "border-[#5b40d6] bg-[#efebfe]/40"
                      : "border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  <div className="font-bold text-zinc-900">Claude Code</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Uses your existing Claude Pro / Max subscription
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCliTool("agy");
                    setAgentName("Local agy Agent");
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    cliTool === "agy"
                      ? "border-[#5b40d6] bg-[#efebfe]/40"
                      : "border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  <div className="font-bold text-zinc-900">Google agy CLI</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Uses your Antigravity / Google subscription
                  </div>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                  One-time Join Prompt (Expires in 30m)
                </label>
                <div className="p-3 rounded-xl bg-[#18181b] text-zinc-100 font-mono text-[11.5px] leading-relaxed flex items-center justify-between gap-3">
                  <span className="break-all">{oneLinePrompt}</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 flex-shrink-0 font-sans font-semibold text-xs"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#5b40d6] hover:bg-[#4b30c2] text-white font-semibold flex items-center gap-1.5"
                >
                  <span>Next: Paste in {cliTool === "claude" ? "Claude Code" : "agy"}</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                  Agent Name in Workspace
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold"
                />
              </div>

              <div className="rounded-xl bg-[#121214] border border-zinc-800 p-4 font-mono text-[11.5px] text-zinc-300 space-y-1.5">
                <div className="text-zinc-500">
                  $ {cliTool} # inside ~/acme/website
                </div>
                <div className="text-white">&gt; {oneLinePrompt}</div>
                <div className="text-emerald-400">
                  ✓ Installed @conclave/cli bridge & .claude/settings.local.json Stop hook
                </div>
                <div className="text-[#ab98ff]">
                  ✓ Linked as "{agentName}". Listening in #{channelName}.
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 font-medium"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isLinking}
                  onClick={handleSimulateLink}
                  className="px-4 py-1.5 rounded-lg bg-[#5b40d6] hover:bg-[#4b30c2] text-white font-semibold flex items-center gap-1.5"
                >
                  <Sparkles size={12} />
                  <span>{isLinking ? "Linking..." : `Link "${agentName}" to #${channelName}`}</span>
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="text-center py-4 space-y-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto font-bold">
                ✓
              </div>
              <div className="font-bold text-sm text-zinc-900">
                {agentName} is now live in #{channelName}!
              </div>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                Any colleague in <code className="font-mono">#{channelName}</code> can now mention{" "}
                <code className="font-mono text-[#5b40d6]">
                  @{agentName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
                </code>{" "}
                to ask questions about your repo or build internal tools.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-zinc-900 text-white font-semibold text-xs"
              >
                Return to #{channelName}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
