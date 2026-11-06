import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  BookOpen,
  Sparkles,
  Save,
  Plus,
  History,
  Link2,
  FileText,
  GitMerge,
  Terminal,
  Search,
  Zap,
  ShieldCheck,
  ZoomIn,
  Layers,
  Send,
} from "lucide-react";
import { api, type WikiPageItem, type OptMemStoreSnapshot } from "../api";
import { SlackMarkdown } from "./SlackMarkdown";

interface WikiViewProps {
  pages: WikiPageItem[];
  initialPath?: string | null;
  onSavePage: (data: { path: string; title: string; content: string }) => Promise<void>;
}

const AGENT_HANDLES = [
  { handle: "ops", name: "Ops Agent", role: "#ops · Cold-Chain & Docks" },
  { handle: "sales", name: "Sales Agent", role: "#sales · Pipeline & Quotes" },
  { handle: "ivo-claude", name: "Ivo's Claude", role: "#website · Local CLI Bridge" },
  { handle: "finance", name: "Finance Agent", role: "#finance · Month Close" },
];

export const WikiView: React.FC<WikiViewProps> = ({
  pages,
  initialPath,
  onSavePage,
}) => {
  const [activeTab, setActiveTab] = useState<"optmem" | "wiki">(
    initialPath ? "wiki" : "optmem"
  );
  const [selectedPath, setSelectedPath] = useState<string>(
    initialPath || pages[0]?.path || "memory/AGENTS.md"
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPath, setNewPath] = useState("wiki/");

  // OptMem state
  const [selectedBotHandle, setSelectedBotHandle] = useState<string>("ops");
  const [optmemSnapshot, setOptmemSnapshot] = useState<OptMemStoreSnapshot | null>(null);
  const [isLoadingOptmem, setIsLoadingOptmem] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [recallRegex, setRecallRegex] = useState("");
  const [recallOutput, setRecallOutput] = useState<string | null>(null);
  const [zoomedBlock, setZoomedBlock] = useState<{ blockId: string; output: string } | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const loadOptMem = useCallback(async (handle: string) => {
    setIsLoadingOptmem(true);
    try {
      const snap = await api.getOptMemSnapshot(handle);
      setOptmemSnapshot(snap);
    } catch (err) {
      console.error("Failed to load OptMem snapshot", err);
    } finally {
      setIsLoadingOptmem(false);
    }
  }, []);

  useEffect(() => {
    loadOptMem(selectedBotHandle);
    setZoomedBlock(null);
    setRecallOutput(null);
  }, [selectedBotHandle, loadOptMem]);

  useEffect(() => {
    if (initialPath) {
      setSelectedPath(initialPath);
      setActiveTab("wiki");
    }
  }, [initialPath]);

  const handleRecordNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    try {
      const res = await api.recordOptMemNote(selectedBotHandle, newNoteText.trim());
      setOptmemSnapshot(res.snapshot);
      setNewNoteText("");
      const napText =
        res.settledNaps.length > 0
          ? ` + auto-compressed binary tree (${res.settledNaps.map((n) => `#${n.blockId}`).join(", ")})`
          : "";
      setStatusBanner(`Saved as #${res.noteId} in LOG.txt (320B fixed-width record)${napText}.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompactNow = async () => {
    try {
      const res = await api.compactOptMemContext(
        selectedBotHandle,
        "global",
        "Manual UI context + binary tree compaction"
      );
      setOptmemSnapshot(res.snapshot);
      setStatusBanner(
        `Context compacted (#${res.compaction.compactionRuns}) → ${res.compaction.estimatedContextTokens} tokens & settled binary merge tree via memo nap.`
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recallRegex.trim()) return;
    try {
      const res = await api.recallOptMem(selectedBotHandle, recallRegex.trim());
      setRecallOutput(res.output);
    } catch (err) {
      console.error(err);
    }
  };

  const handleZoomBlock = async (blockId: string) => {
    try {
      const res = await api.zoomOptMemBlock(selectedBotHandle, blockId);
      setZoomedBlock({ blockId, output: res.output });
    } catch (err) {
      console.error(err);
    }
  };

  const handleWakeLinesChange = async (lines: number) => {
    try {
      const snap = await api.updateOptMemConfig(selectedBotHandle, { WAKE_LINES: lines });
      setOptmemSnapshot(snap);
      setStatusBanner(`Updated WAKE_LINES=${lines} via memo config. Notice how wake dynamically tiles O(log N) blocks!`);
    } catch (err) {
      console.error(err);
    }
  };

  const activePage =
    pages.find((p) => p.path === selectedPath) || pages[0] || null;

  // Compute bidirectional backlinks ("Linked from")
  const backlinks = useMemo(() => {
    if (!activePage) return [];
    return pages.filter(
      (p) =>
        p.id !== activePage.id &&
        p.content.toLowerCase().includes(`[[${activePage.path.toLowerCase()}`)
    );
  }, [pages, activePage]);

  const startEdit = (page: WikiPageItem) => {
    setEditTitle(page.title);
    setEditContent(page.content);
    setIsEditing(true);
    setIsCreatingNew(false);
  };

  const startCreate = () => {
    setNewPath("wiki/new-note");
    setEditTitle("New Workspace Wiki Page");
    setEditContent(
      "# New Wiki Page\n\nLink to `[[memory/AGENTS.md]]` or write documentation here."
    );
    setIsCreatingNew(true);
    setIsEditing(true);
    setActiveTab("wiki");
  };

  const handleSave = async () => {
    const targetPath = isCreatingNew ? newPath.trim() : activePage?.path;
    if (!targetPath || !editTitle.trim()) return;
    await onSavePage({
      path: targetPath,
      title: editTitle.trim(),
      content: editContent,
    });
    setSelectedPath(targetPath);
    setIsEditing(false);
    setIsCreatingNew(false);
  };

  const memoryPages = pages.filter((p) => p.path.startsWith("memory/"));
  const wikiDocPages = pages.filter((p) => !p.path.startsWith("memory/"));

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="h-12 px-6 border-b border-zinc-200/80 flex items-center justify-between flex-shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-[#efebfe] text-[#5b40d6] flex items-center justify-center">
            <BookOpen size={14} />
          </div>
          <h2 className="font-bold text-zinc-900 text-[14px] tracking-tight">
            Agent Memory (OptMem) & Workspace Wiki
          </h2>

          {/* Mode Switcher */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200/70 ml-2">
            <button
              onClick={() => setActiveTab("optmem")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "optmem"
                  ? "bg-white text-[#5b40d6] shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <GitMerge size={12} />
              <span>OptMem Binary Tree & +Compact</span>
            </button>
            <button
              onClick={() => setActiveTab("wiki")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "wiki"
                  ? "bg-white text-[#5b40d6] shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <FileText size={12} />
              <span>Three-Tier Files & Wiki ({pages.length})</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "optmem" ? (
            <button
              onClick={handleCompactNow}
              className="px-3 py-1 rounded-lg bg-[#5b40d6] hover:bg-[#4b30c2] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Zap size={13} />
              <span>Compact Context + memo nap</span>
            </button>
          ) : (
            <button
              onClick={startCreate}
              className="px-3 py-1 rounded-lg bg-[#5b40d6] hover:bg-[#4b30c2] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Plus size={13} />
              <span>New Wiki Page</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === "optmem" ? (
        <div className="flex-1 flex min-h-0">
          {/* Left Agent Selector & Architecture Rules */}
          <div className="w-64 border-r border-zinc-200/80 bg-zinc-50/60 p-3 overflow-y-auto space-y-5 select-none">
            <div>
              <div className="px-2 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[#5b40d6] flex items-center gap-1">
                <GitMerge size={11} />
                <span>Main Agents (OptMem Stores)</span>
              </div>
              <div className="space-y-1">
                {AGENT_HANDLES.map((ag) => {
                  const active = selectedBotHandle === ag.handle;
                  return (
                    <button
                      key={ag.handle}
                      onClick={() => setSelectedBotHandle(ag.handle)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors ${
                        active
                          ? "bg-[#5b40d6] text-white font-semibold shadow-2xs"
                          : "hover:bg-zinc-200/60 text-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{ag.name}</span>
                        <span
                          className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                            active
                              ? "bg-white/20 text-white"
                              : "bg-zinc-200/70 text-zinc-600"
                          }`}
                        >
                          @{ag.handle}
                        </span>
                      </div>
                      <div
                        className={`text-[10.5px] truncate mt-0.5 ${
                          active ? "text-white/80" : "text-zinc-400"
                        }`}
                      >
                        {ag.role}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subagent Isolation Contract Box */}
            <div className="p-3 rounded-xl bg-[#efebfe]/60 border border-[#5b40d6]/20 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#5b40d6]">
                <ShieldCheck size={13} />
                <span>Clean Orchestrator Rule</span>
              </div>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                Main agents always wake with{" "}
                <code className="font-mono text-[#5b40d6]">memo wake</code> +
                compacted context, and delegate concrete tasks to isolated
                subprocesses.
              </p>
              <div className="p-2 rounded-lg bg-zinc-900 text-emerald-300 font-mono text-[10px] leading-snug">
                OPTMEM_SUBAGENT=1
                <br />
                &quot;You are a subagent. Don&apos;t run memo.&quot;
              </div>
            </div>

            {/* Quick Links to Three-Tier Markdown Files */}
            <div>
              <div className="px-2 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <Sparkles size={11} />
                <span>Three-Tier Markdown</span>
              </div>
              <div className="space-y-0.5">
                {memoryPages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPath(p.path);
                      setActiveTab("wiki");
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-zinc-600 hover:bg-zinc-200/60 font-mono truncate"
                  >
                    {p.path}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right OptMem Studio */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {statusBanner && (
              <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                <span>{statusBanner}</span>
                <button
                  onClick={() => setStatusBanner(null)}
                  className="text-emerald-700 hover:text-emerald-950 font-bold ml-4"
                >
                  ✕
                </button>
              </div>
            )}

            {isLoadingOptmem || !optmemSnapshot ? (
              <div className="text-xs text-zinc-400 py-12 text-center">
                Loading OptMem binary merge tree for @{selectedBotHandle}...
              </div>
            ) : (
              <div className="max-w-5xl mx-auto space-y-6">
                {/* Top Metrics & Context Compaction Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/40">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">
                      LOG.txt Raw Memories
                    </div>
                    <div className="text-xl font-bold text-zinc-900 mt-1">
                      {optmemSnapshot.totalMemories}{" "}
                      <span className="text-xs font-mono text-zinc-400 font-normal">
                        × 320B
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 font-mono truncate">
                      O(1) seek offset store
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/40">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">
                      TREE/ Binary Merge Nodes
                    </div>
                    <div className="text-xl font-bold text-[#5b40d6] mt-1">
                      {optmemSnapshot.treeNodes.length}{" "}
                      <span className="text-xs font-mono text-zinc-400 font-normal">
                        × 288B
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                      {optmemSnapshot.pendingCompressionsCount === 0
                        ? "✓ All power-of-2 blocks settled"
                        : `${optmemSnapshot.pendingCompressionsCount} pending nap`}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/40">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">
                      Main Context Window (+compact)
                    </div>
                    <div className="text-xl font-bold text-zinc-900 mt-1">
                      {optmemSnapshot.compaction.estimatedContextTokens.toLocaleString()}{" "}
                      <span className="text-xs font-normal text-zinc-400">
                        / {optmemSnapshot.compaction.maxContextTokens.toLocaleString()} tok
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      Compacted {optmemSnapshot.compaction.compactedMessagesCount} turns (Run #
                      {optmemSnapshot.compaction.compactionRuns})
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/40">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">
                      WAKE_LINES Budget
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {[4, 8, 16, 32, 96].map((val) => (
                        <button
                          key={val}
                          onClick={() => handleWakeLinesChange(val)}
                          className={`px-2 py-0.5 rounded text-xs font-mono font-semibold transition-colors ${
                            optmemSnapshot.config.WAKE_LINES === val
                              ? "bg-[#5b40d6] text-white"
                              : "bg-zinc-200/70 text-zinc-700 hover:bg-zinc-300"
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                    <div className="text-[10.5px] text-zinc-400 mt-1">
                      Try 4 to see O(log N) tree collapse!
                    </div>
                  </div>
                </div>

                {/* Rolling Compacted Context Summary Card */}
                <div className="p-4 rounded-xl border border-[#5b40d6]/20 bg-[#efebfe]/30 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-[#5b40d6] flex items-center gap-1.5">
                      <Layers size={13} />
                      <span>
                        Main Agent Rolling Compacted Context (@
                        {optmemSnapshot.botHandle})
                      </span>
                    </div>
                    <p className="text-xs text-zinc-700 leading-relaxed">
                      {optmemSnapshot.compaction.rollingSummary}
                    </p>
                  </div>
                  <button
                    onClick={handleCompactNow}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-50 border border-[#5b40d6]/30 text-[#5b40d6] text-xs font-semibold flex-shrink-0 shadow-2xs"
                  >
                    Run /compact
                  </button>
                </div>

                {/* Two-Column: Live `memo wake` Output & Record/Recall Controls */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Live `memo wake` output */}
                  <div className="rounded-2xl border border-zinc-200/80 overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col">
                    <div className="px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-200">
                        <Terminal size={13} className="text-[#f08a3c]" />
                        <span>
                          ~/.optmem/memo wake (WAKE_LINES=
                          {optmemSnapshot.config.WAKE_LINES})
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400">
                        {optmemSnapshot.wakeLinesCount} lines output
                      </span>
                    </div>
                    <pre className="p-4 text-[11.5px] font-mono leading-relaxed text-zinc-200 overflow-x-auto whitespace-pre-wrap flex-1">
                      {optmemSnapshot.wakeOutput}
                    </pre>
                  </div>

                  {/* Record `memo note` & Search `memo recall` */}
                  <div className="space-y-4">
                    <form
                      onSubmit={handleRecordNote}
                      className="p-4 rounded-2xl border border-zinc-200/80 bg-white space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                          <Send size={12} className="text-[#5b40d6]" />
                          <span>
                            Record Durable Memory (<code>memo note</code>)
                          </span>
                        </label>
                        <span className="text-[11px] font-mono text-zinc-400">
                          {newNoteText.length} / {optmemSnapshot.config.ENTRY_CHARS}B max
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={280}
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          placeholder={`One short line of lasting effect for @${selectedBotHandle}...`}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs outline-none focus:border-[#5b40d6]"
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 rounded-lg bg-[#5b40d6] hover:bg-[#4b30c2] text-white text-xs font-semibold flex-shrink-0"
                        >
                          memo note
                        </button>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Appends a 320-byte fixed-width record to{" "}
                        <code>LOG.txt</code> and automatically runs{" "}
                        <code>memo nap</code> when a power-of-two block completes.
                      </p>
                    </form>

                    <form
                      onSubmit={handleRecall}
                      className="p-4 rounded-2xl border border-zinc-200/80 bg-white space-y-3"
                    >
                      <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                        <Search size={12} className="text-[#5b40d6]" />
                        <span>
                          Regex Search All Memories (<code>memo recall &lt;regex&gt;</code>)
                        </span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={recallRegex}
                          onChange={(e) => setRecallRegex(e.target.value)}
                          placeholder="e.g. Bay 4|SLA|Invoice|subprocess"
                          className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-200 font-mono text-xs outline-none focus:border-[#5b40d6]"
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex-shrink-0"
                        >
                          Recall
                        </button>
                      </div>
                      {recallOutput && (
                        <pre className="p-3 rounded-xl bg-zinc-900 text-zinc-100 font-mono text-[11px] whitespace-pre-wrap overflow-x-auto">
                          {recallOutput}
                        </pre>
                      )}
                    </form>
                  </div>
                </div>

                {/* Binary Merge Tree Visualizer (`TREE/<size>`) */}
                <div className="p-5 rounded-2xl border border-zinc-200/80 bg-zinc-50/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                        <GitMerge size={15} className="text-[#5b40d6]" />
                        <span>
                          Binary Merge Tree Summaries (<code>TREE/2</code>,{" "}
                          <code>TREE/4</code>, <code>TREE/8</code>)
                        </span>
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Click any compressed block <code>#lo-hi</code> to execute{" "}
                        <code>memo zoom &lt;lo-hi&gt;</code> and inspect its two
                        child halves.
                      </p>
                    </div>
                  </div>

                  {zoomedBlock && (
                    <div className="p-3.5 rounded-xl bg-zinc-900 text-zinc-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono text-[#f08a3c]">
                        <span>$ memo zoom {zoomedBlock.blockId}</span>
                        <button
                          onClick={() => setZoomedBlock(null)}
                          className="text-zinc-400 hover:text-white"
                        >
                          Close
                        </button>
                      </div>
                      <pre className="text-[11.5px] font-mono whitespace-pre-wrap text-emerald-300">
                        {zoomedBlock.output}
                      </pre>
                    </div>
                  )}

                  <div className="space-y-2">
                    {optmemSnapshot.treeNodes.map((node) => (
                      <div
                        key={`${node.size}-${node.blockId}`}
                        onClick={() => handleZoomBlock(node.blockId)}
                        className="p-3 rounded-xl border border-zinc-200/90 bg-white hover:border-[#5b40d6] cursor-pointer transition-all flex items-start justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="px-2 py-0.5 rounded-md bg-[#efebfe] text-[#5b40d6] font-mono text-xs font-bold flex-shrink-0">
                            #{node.blockId}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-mono text-[10.5px] flex-shrink-0">
                            TREE/{node.size} (L{node.level})
                          </span>
                          <p className="text-xs text-zinc-800 font-medium leading-relaxed break-words">
                            {node.summary}
                          </p>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-400 group-hover:text-[#5b40d6] flex items-center gap-1 flex-shrink-0">
                          <ZoomIn size={12} />
                          <span>zoom</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Raw Fixed-Width Log (`LOG.txt`) */}
                <div className="p-5 rounded-2xl border border-zinc-200/80 bg-white space-y-3">
                  <h3 className="text-sm font-bold text-zinc-900">
                    Append-Only Raw Log (<code>LOG.txt</code> ·{" "}
                    {optmemSnapshot.logs.length} records)
                  </h3>
                  <div className="divide-y divide-zinc-100">
                    {optmemSnapshot.logs.map((entry) => (
                      <div
                        key={entry.id}
                        className="py-2 flex items-baseline gap-3 text-xs font-mono"
                      >
                        <span className="text-[#5b40d6] font-bold w-10 flex-shrink-0">
                          #{entry.id}
                        </span>
                        <span className="text-zinc-400 w-24 flex-shrink-0">
                          {entry.date}
                        </span>
                        <span className="text-zinc-800 font-sans">
                          {entry.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* Left Tree Sidebar */}
          <div className="w-64 border-r border-zinc-200/80 bg-zinc-50/60 p-3 overflow-y-auto space-y-5 select-none">
            <div>
              <div className="px-2 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[#5b40d6] flex items-center gap-1">
                <Sparkles size={11} />
                <span>Agent Memory Files</span>
              </div>
              <div className="space-y-0.5">
                {memoryPages.map((p) => {
                  const active = !isCreatingNew && activePage?.path === p.path;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPath(p.path);
                        setIsEditing(false);
                        setIsCreatingNew(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors ${
                        active
                          ? "bg-[#5b40d6] text-white font-semibold shadow-2xs"
                          : "hover:bg-zinc-200/60 text-zinc-700"
                      }`}
                    >
                      <div className="font-mono text-[11.5px] truncate">
                        {p.path}
                      </div>
                      <div
                        className={`text-[10.5px] truncate ${
                          active ? "text-white/80" : "text-zinc-400"
                        }`}
                      >
                        {p.title}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="px-2 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <FileText size={11} />
                <span>Workspace Wiki ([[...]])</span>
              </div>
              <div className="space-y-0.5">
                {wikiDocPages.map((p) => {
                  const active = !isCreatingNew && activePage?.path === p.path;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPath(p.path);
                        setIsEditing(false);
                        setIsCreatingNew(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors ${
                        active
                          ? "bg-[#5b40d6] text-white font-semibold shadow-2xs"
                          : "hover:bg-zinc-200/60 text-zinc-700"
                      }`}
                    >
                      <div className="font-mono text-[11.5px] truncate">
                        {p.path}
                      </div>
                      <div
                        className={`text-[10.5px] truncate ${
                          active ? "text-white/80" : "text-zinc-400"
                        }`}
                      >
                        {p.title}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Document Viewer / Editor */}
          <div className="flex-1 overflow-y-auto p-6">
            {isEditing ? (
              <div className="max-w-3xl mx-auto space-y-4">
                {isCreatingNew && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Page Path (for [[path]] links)
                    </label>
                    <input
                      type="text"
                      value={newPath}
                      onChange={(e) => setNewPath(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 font-mono text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Markdown Content
                  </label>
                  <textarea
                    rows={16}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-3 rounded-xl border border-zinc-200 font-mono text-xs leading-relaxed outline-none focus:border-[#5b40d6]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    className="px-4 py-1.5 rounded-lg bg-[#5b40d6] hover:bg-[#4b30c2] text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Save size={13} />
                    <span>Save Version</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setIsCreatingNew(false);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : activePage ? (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-start justify-between border-b border-zinc-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono px-2 py-0.5 rounded bg-[#efebfe] text-[#5b40d6] font-semibold">
                        [[{activePage.path}]]
                      </code>
                      <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                        <History size={11} />v{activePage.version}
                      </span>
                    </div>
                    <h1 className="text-lg font-bold text-zinc-900 mt-1.5">
                      {activePage.title}
                    </h1>
                  </div>

                  <button
                    onClick={() => startEdit(activePage)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 text-xs font-semibold transition-colors"
                  >
                    Edit Markdown
                  </button>
                </div>

                <div className="p-5 rounded-2xl border border-zinc-200/80 bg-zinc-50/30">
                  <SlackMarkdown
                    content={activePage.content}
                    onOpenWiki={(path) => setSelectedPath(path)}
                  />
                </div>

                {/* Bidirectional Backlinks Section */}
                <div className="pt-4 border-t border-zinc-100">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-2">
                    <Link2 size={12} />
                    <span>Linked from ({backlinks.length})</span>
                  </div>
                  {backlinks.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic">
                      No other wiki pages reference [[{activePage.path}]] yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {backlinks.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => setSelectedPath(b.path)}
                          className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 flex items-center gap-1.5"
                        >
                          <code className="text-[11px] text-[#5b40d6] font-mono">
                            [[{b.path}]]
                          </code>
                          <span>{b.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
