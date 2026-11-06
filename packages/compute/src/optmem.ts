import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const LOG_REC = 320;
const TREE_REC = 288;
const DEFAULT_ENTRY_CHARS = 280;

export interface OptMemLogRecord {
  id: number;
  date: string;
  text: string;
}

export interface OptMemTreeNode {
  blockId: string; // e.g. "0-1", "0-3", "0-7"
  lo: number;
  hi: number; // inclusive, matching memo's #lo-hi notation
  size: number; // power of two: 2, 4, 8, 16...
  level: number; // 1 for size=2, 2 for size=4, 3 for size=8...
  summary: string;
}

export interface OptMemConfig {
  WAKE_LINES: number;
  ENTRY_CHARS: number;
  PART_CHARS: number;
  PART_LINES: number;
}

export interface ContextCompactionState {
  botHandle: string;
  channelId: string;
  rollingSummary: string;
  compactedMessagesCount: number;
  activeRawMessagesCount: number;
  estimatedContextTokens: number;
  maxContextTokens: number;
  compactionRuns: number;
  lastCompactedAt: string | null;
}

export interface OptMemStoreSnapshot {
  botHandle: string;
  memoryDir: string;
  memoBinaryPath: string;
  totalMemories: number;
  pendingCompressionsCount: number;
  pendingBlocks: string[];
  wakeOutput: string;
  wakeLinesCount: number;
  config: OptMemConfig;
  logs: OptMemLogRecord[];
  treeNodes: OptMemTreeNode[];
  compaction: ContextCompactionState;
}

// Find the repo root and bundled memo script
function resolveRepoRoot(): string {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), "../.."),
    path.resolve(__dirname, "../../.."),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "packages/compute/src/optmem/memo"))) {
      return c;
    }
  }
  return process.cwd();
}

export function getMemoBinaryPath(): string {
  const root = resolveRepoRoot();
  const bundled = path.join(root, "packages/compute/src/optmem/memo");
  if (fs.existsSync(bundled)) return bundled;
  const homeMemo = path.join(process.env.HOME || "~", ".optmem/memo");
  return homeMemo;
}

export function getAgentMemoryDir(botHandle: string): string {
  const cleanHandle = (botHandle || "default").toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const root = resolveRepoRoot();
  return path.join(root, ".conclave-data", "optmem", cleanHandle);
}

/**
 * Run the authentic Python 3 `memo` CLI against a specific agent's $MEMORY_DIR.
 * Enforces the subagent guard: if OPTMEM_SUBAGENT=1, throws immediately.
 */
export function runMemoCommand(
  botHandle: string,
  args: string[],
  options?: { isSubagent?: boolean }
): { stdout: string; stderr: string; exitCode: number } {
  if (options?.isSubagent || process.env.OPTMEM_SUBAGENT === "1" || process.env.OPTMEM_ROLE === "subagent") {
    throw new Error("You are a subagent. Don't run memo.");
  }

  const memoBin = getMemoBinaryPath();
  const memoryDir = getAgentMemoryDir(botHandle);

  const res = spawnSync("python3", [memoBin, ...args], {
    env: {
      ...process.env,
      MEMORY_DIR: memoryDir,
      OPTMEM_SUBAGENT: "0",
      OPTMEM_ROLE: "main",
    },
    encoding: "utf-8",
    timeout: 8000,
  });

  return {
    stdout: (res.stdout || "").trim(),
    stderr: (res.stderr || "").trim(),
    exitCode: res.status ?? 1,
  };
}

/**
 * Sanitize a memory or summary line so it strictly obeys OptMem's single-line <= 280 UTF-8 byte rule.
 */
export function clampOptMemLine(text: string, maxBytes = DEFAULT_ENTRY_CHARS): string {
  const singleLine = text.replace(/[\r\n]+/g, " · ").replace(/\s+/g, " ").trim();
  if (!singleLine) return "Recorded agent milestone.";
  const buf = Buffer.from(singleLine, "utf-8");
  if (buf.length <= maxBytes) return singleLine;
  // Slice safely at UTF-8 character boundary
  let clipped = buf.subarray(0, maxBytes - 3).toString("utf-8");
  // Drop any trailing replacement char from split multibyte sequence
  clipped = clipped.replace(/\uFFFD+$/g, "").trim();
  return `${clipped}...`;
}

/**
 * Read all raw memories directly from fixed-width LOG.txt (320 bytes per record).
 */
export function readRawLogs(botHandle: string): OptMemLogRecord[] {
  const memoryDir = getAgentMemoryDir(botHandle);
  const logFile = path.join(memoryDir, "LOG.txt");
  if (!fs.existsSync(logFile)) return [];
  const buf = fs.readFileSync(logFile);
  const count = Math.floor(buf.length / LOG_REC);
  const out: OptMemLogRecord[] = [];

  for (let i = 0; i < count; i++) {
    const raw = buf.subarray(i * LOG_REC, (i + 1) * LOG_REC).toString("utf-8").trimEnd();
    const firstSpace = raw.indexOf(" ");
    const secondSpace = raw.indexOf(" ", firstSpace + 1);
    if (firstSpace > 0 && secondSpace > firstSpace) {
      const id = parseInt(raw.slice(1, firstSpace), 10);
      const date = raw.slice(firstSpace + 1, secondSpace);
      const text = raw.slice(secondSpace + 1);
      out.push({ id: Number.isNaN(id) ? i : id, date, text });
    }
  }
  return out;
}

/**
 * Read all binary merge tree summary nodes from TREE/<size> (288 bytes per record).
 */
export function readTreeNodes(botHandle: string): OptMemTreeNode[] {
  const memoryDir = getAgentMemoryDir(botHandle);
  const treeDir = path.join(memoryDir, "TREE");
  if (!fs.existsSync(treeDir)) return [];

  const entries = fs.readdirSync(treeDir).filter((f) => /^\d+$/.test(f));
  const nodes: OptMemTreeNode[] = [];

  for (const file of entries) {
    const size = parseInt(file, 10);
    if (size < 2) continue;
    const level = Math.round(Math.log2(size));
    const buf = fs.readFileSync(path.join(treeDir, file));
    const count = Math.floor(buf.length / TREE_REC);
    for (let k = 0; k < count; k++) {
      const summary = buf.subarray(k * TREE_REC, (k + 1) * TREE_REC).toString("utf-8").trimEnd();
      if (summary) {
        const lo = k * size;
        const hi = (k + 1) * size - 1;
        nodes.push({
          blockId: `${lo}-${hi}`,
          lo,
          hi,
          size,
          level,
          summary,
        });
      }
    }
  }

  // Sort largest/highest level first, then by lo index
  nodes.sort((a, b) => b.size - a.size || a.lo - b.lo);
  return nodes;
}

/**
 * Compute pending power-of-two blocks that can be compressed right now (matching memo's pending(d, T)).
 */
export function getPendingBlocks(botHandle: string): Array<{ blockId: string; lo: number; hiExclusive: number; size: number }> {
  const logs = readRawLogs(botHandle);
  const T = logs.length;
  const memoryDir = getAgentMemoryDir(botHandle);
  const todo: Array<{ blockId: string; lo: number; hiExclusive: number; size: number }> = [];

  let size = 2;
  while (size <= T) {
    const p = path.join(memoryDir, "TREE", String(size));
    const have = fs.existsSync(p) ? Math.floor(fs.statSync(p).size / TREE_REC) : 0;
    const target = Math.floor(T / size);
    for (let k = have; k < target; k++) {
      const lo = k * size;
      const hiExclusive = (k + 1) * size;
      todo.push({
        blockId: `${lo}-${hiExclusive - 1}`,
        lo,
        hiExclusive,
        size,
      });
    }
    size *= 2;
  }
  return todo;
}

/**
 * Synthesize a deterministic, high-signal 1-line compression (<= 280 bytes) for block [lo, hiExclusive)
 * from either raw logs (when size <= 16) or the two child tree summaries.
 */
function synthesizeBlockSummary(botHandle: string, lo: number, hiExclusive: number): string {
  const logs = readRawLogs(botHandle);
  const slice = logs.slice(lo, hiExclusive);
  if (slice.length === 0) {
    return clampOptMemLine(`Consolidated memories #${lo}-${hiExclusive - 1}.`);
  }

  // Extract concise key phrases from each memory in the block
  const snippets = slice.map((item) => {
    const clean = item.text
      .replace(/^(noted|recorded|completed|verified|updated|built):\s*/i, "")
      .replace(/\.$/, "")
      .trim();
    return clean.length > 64 ? clean.slice(0, 61) + "..." : clean;
  });

  // Deduplicate and join
  const unique = Array.from(new Set(snippets));
  const combined = `[#${lo}-${hiExclusive - 1}] ${unique.join(" | ")}`;
  return clampOptMemLine(combined, DEFAULT_ENTRY_CHARS);
}

/**
 * Automatically settle all pending binary merge tree compressions (`memo nap <lo>-<hi> "<summary>"`).
 */
export function autoSettlePendingNaps(botHandle: string): Array<{ blockId: string; summary: string }> {
  const settled: Array<{ blockId: string; summary: string }> = [];
  const pending = getPendingBlocks(botHandle);

  for (const block of pending) {
    const summary = synthesizeBlockSummary(botHandle, block.lo, block.hiExclusive);
    const res = runMemoCommand(botHandle, ["nap", block.blockId, summary]);
    if (res.exitCode === 0) {
      settled.push({ blockId: block.blockId, summary });
    }
  }
  return settled;
}

/**
 * Seed realistic initial memories for each ACME agent if its store hasn't been initialized yet.
 */
const INITIAL_AGENT_MEMORIES: Record<string, Array<{ date: string; text: string }>> = {
  ops: [
    { date: "2026-10-28", text: "Initialized ACME Ops Agent for Paris Nord Hub (#ops); monitoring Docks 1-8 and cold-chain telemetry." },
    { date: "2026-10-29", text: "Enforced Cold-Chain SLA (<= 5.0 C for pharma/dairy). Reefer deviations > 15m require Dock 4 quarantine." },
    { date: "2026-10-30", text: "Configured Vault connection yard-gate-api in checked mode; Yard RFID webhooks require schema check." },
    { date: "2026-11-01", text: "Built Dock Planner v1 reactive app on Conclave.records('docks') for real-time bay scheduling." },
    { date: "2026-11-02", text: "Upgraded Dock Planner to v2 with live reefer temperature column and red badge alerts above 5.0 C." },
    { date: "2026-11-03", text: "Detected Carrier #204 (Bay 4) reefer drift at +6.8 C; opened inline approval card for Mara & Tom." },
    { date: "2026-11-04", text: "Rerouted Carrier #119 from Bay 2 to Bay 5 after hydraulic lift maintenance check completed." },
    { date: "2026-11-05", text: "Verified all noisy telemetry & app-builder tasks run in isolated subprocesses with OPTMEM_SUBAGENT=1." },
  ],
  sales: [
    { date: "2026-10-28", text: "Initialized ACME Sales Agent in #sales with HubSpot CRM (auto mode) and Resend Email (ask mode)." },
    { date: "2026-10-30", text: "Built Deals Tracker reactive app tracking EUR 442k pipeline across ColdChain Pharma, Nordisk, and Velocity." },
    { date: "2026-11-01", text: "ColdChain Pharma SLA renewal (EUR 180k) moved to Negotiation stage; owner Lena Hoffmann." },
    { date: "2026-11-03", text: "Completed Browser Machine sign-in handoff on sales-chrome-paris for FreightQuote EU portal." },
    { date: "2026-11-04", text: "Queued external follow-up email draft for Nordisk Retail Group (EUR 95k) via feed guardrail." },
    { date: "2026-11-05", text: "Synced Q4 carrier volume discounts with #ops capacity forecast; delegated CRM sync to subprocess." },
  ],
  "ivo-claude": [
    { date: "2026-10-29", text: "Connected Ivo's local Claude Code CLI bridge (ivos-macbook-pro) to #website and #ops." },
    { date: "2026-10-31", text: "Built Customer Portal Status banner and live shipment lookup prototype in Conclave App Kit." },
    { date: "2026-11-02", text: "Configured three-tier memory links: SOUL.md, AGENTS.md, and [[wiki/cold-chain-sla]] backlinks." },
    { date: "2026-11-05", text: "Enabled OptMem binary merge tree compaction and isolated subprocess worker delegation." },
  ],
  finance: [
    { date: "2026-10-29", text: "Initialized Finance Agent in #finance; Stripe Billing Production secret locked to human_only." },
    { date: "2026-11-01", text: "Built Month Close Tracker app; reconciled 142 of 143 October carrier invoices automatically." },
    { date: "2026-11-03", text: "Flagged Invoice #INV-8841 (+EUR 1,420 fuel surcharge variance) for human sign-off." },
    { date: "2026-11-05", text: "Updated [[wiki/month-close-checklist]] with customs brokerage accrual verification rules." },
  ],
};

export function ensureAgentOptMemInitialized(botHandle: string): void {
  const memoryDir = getAgentMemoryDir(botHandle);
  const isFresh = !fs.existsSync(path.join(memoryDir, "LOG.txt"));

  if (isFresh) {
    runMemoCommand(botHandle, ["init"]);
    const cleanHandle = botHandle.toLowerCase();
    const seedItems =
      INITIAL_AGENT_MEMORIES[cleanHandle] ||
      INITIAL_AGENT_MEMORIES.ops.map((m) => ({
        date: m.date,
        text: m.text.replace(/Ops Agent/g, botHandle),
      }));

    // Write temporary import file and bulk-load via `memo import`
    const tmpImport = path.join(memoryDir, ".bootstrap.txt");
    const content = seedItems.map((item) => `${item.date} ${clampOptMemLine(item.text)}`).join("\n") + "\n";
    fs.writeFileSync(tmpImport, content, "utf-8");
    runMemoCommand(botHandle, ["import", tmpImport]);
    try {
      fs.unlinkSync(tmpImport);
    } catch {
      // ignore
    }
    // Settle all initial binary merge tree compressions so `memo wake` works immediately
    autoSettlePendingNaps(botHandle);
  }
}

/**
 * Execute `memo wake` for a Main Agent. Automatically settles any blocking binary tree
 * compressions so `wake` always succeeds and returns the compact O(log N) memory context.
 */
export function wakeMainAgentMemory(botHandle: string): {
  wakeOutput: string;
  settledNaps: Array<{ blockId: string; summary: string }>;
  totalMemories: number;
  treeNodesCount: number;
} {
  ensureAgentOptMemInitialized(botHandle);
  const settledNaps = autoSettlePendingNaps(botHandle);
  let res = runMemoCommand(botHandle, ["wake"]);

  if (res.exitCode !== 0) {
    // Settle any newly required naps and retry
    const extra = autoSettlePendingNaps(botHandle);
    settledNaps.push(...extra);
    res = runMemoCommand(botHandle, ["wake"]);
  }

  const logs = readRawLogs(botHandle);
  const treeNodes = readTreeNodes(botHandle);

  return {
    wakeOutput: res.stdout || "You are awake.",
    settledNaps,
    totalMemories: logs.length,
    treeNodesCount: treeNodes.length,
  };
}

/**
 * Record a durable 1-line memory (`memo note`) for a Main Agent and automatically
 * settle any triggered power-of-two binary tree compressions (`memo nap`).
 */
export function recordMainAgentNote(
  botHandle: string,
  noteText: string
): {
  noteId: number;
  savedLine: string;
  noteOutput: string;
  settledNaps: Array<{ blockId: string; summary: string }>;
} {
  ensureAgentOptMemInitialized(botHandle);
  const cleanLine = clampOptMemLine(noteText);
  const res = runMemoCommand(botHandle, ["note", cleanLine]);
  const match = res.stdout.match(/Saved as #(\d+)/);
  const logs = readRawLogs(botHandle);
  const noteId = match ? parseInt(match[1], 10) : Math.max(0, logs.length - 1);

  // If `memo note` triggered a pending compression block, settle it immediately
  const settledNaps = autoSettlePendingNaps(botHandle);

  return {
    noteId,
    savedLine: cleanLine,
    noteOutput: res.stdout,
    settledNaps,
  };
}

// ---------------------------------------------------------------------------
// Rolling Channel + Agent Context Compaction Store (+compact)
// ---------------------------------------------------------------------------

const compactionRegistry = new Map<string, ContextCompactionState>();

function getCompactionKey(botHandle: string, channelId: string): string {
  return `${botHandle.toLowerCase()}::${channelId || "global"}`;
}

export function getContextCompactionState(
  botHandle: string,
  channelId = "global",
  recentMessages: Array<{ sender: string; content: string }> = []
): ContextCompactionState {
  const key = getCompactionKey(botHandle, channelId);
  let state = compactionRegistry.get(key);
  if (!state) {
    state = {
      botHandle,
      channelId,
      rollingSummary:
        "Channel context initialized. Active guardrails: SOUL.md, AGENTS.md, OptMem O(log N) binary tree memory, and strict subprocess delegation (`You are a subagent. Don't run memo.`).",
      compactedMessagesCount: 6,
      activeRawMessagesCount: recentMessages.length || 3,
      estimatedContextTokens: 1420,
      maxContextTokens: 16000,
      compactionRuns: 1,
      lastCompactedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    };
    compactionRegistry.set(key, state);
  }

  if (recentMessages.length > 0) {
    const rawChars = recentMessages.reduce((acc, m) => acc + m.content.length + m.sender.length, 0);
    state.activeRawMessagesCount = recentMessages.length;
    state.estimatedContextTokens = Math.min(
      state.maxContextTokens,
      950 + Math.round((state.rollingSummary.length + rawChars) / 3.8)
    );
  }

  return state;
}

/**
 * Compact the Main Agent's conversation context (`+compact`) AND settle/compress
 * OptMem binary merge tree nodes (`memo nap`).
 */
export function compactMainAgentContext(options: {
  botHandle: string;
  channelId?: string;
  messagesToCompact?: Array<{ sender: string; content: string }>;
  reason?: string;
}): {
  compaction: ContextCompactionState;
  noteRecorded: { noteId: number; savedLine: string };
  settledNaps: Array<{ blockId: string; summary: string }>;
} {
  const { botHandle, channelId = "global", messagesToCompact = [], reason } = options;
  ensureAgentOptMemInitialized(botHandle);

  const state = getContextCompactionState(botHandle, channelId, messagesToCompact);

  const highlights = messagesToCompact
    .slice(-6)
    .map((m) => `${m.sender}: ${m.content.replace(/\s+/g, " ").slice(0, 60)}`)
    .join(" | ");

  const summaryIncrement = highlights
    ? `Compacted ${messagesToCompact.length} turns (${highlights})`
    : reason
    ? `Compacted context (${reason})`
    : `Compacted channel turns into rolling memory state`;

  state.rollingSummary = clampOptMemLine(
    `${state.rollingSummary.split(" · ").slice(-2).join(" · ")} · ${summaryIncrement}`,
    260
  );
  state.compactedMessagesCount += Math.max(2, messagesToCompact.length);
  state.activeRawMessagesCount = Math.min(2, messagesToCompact.length);
  state.estimatedContextTokens = 980 + Math.round(state.rollingSummary.length / 3.5);
  state.compactionRuns += 1;
  state.lastCompactedAt = new Date().toISOString();

  compactionRegistry.set(getCompactionKey(botHandle, channelId), state);

  // Record a permanent 1-line note in OptMem so the compaction survives across sessions
  const noteRecorded = recordMainAgentNote(
    botHandle,
    `Context compacted (#${state.compactionRuns}): ${summaryIncrement}`
  );

  // Ensure all binary merge tree blocks are settled
  const extraNaps = autoSettlePendingNaps(botHandle);

  return {
    compaction: state,
    noteRecorded: {
      noteId: noteRecorded.noteId,
      savedLine: noteRecorded.savedLine,
    },
    settledNaps: [...noteRecorded.settledNaps, ...extraNaps],
  };
}

/**
 * Read current OptMem config knobs (`WAKE_LINES`, `ENTRY_CHARS`, `PART_CHARS`, `PART_LINES`).
 */
export function getOptMemConfig(botHandle: string): OptMemConfig {
  ensureAgentOptMemInitialized(botHandle);
  const res = runMemoCommand(botHandle, ["config"]);
  const cfg: OptMemConfig = {
    WAKE_LINES: 96,
    ENTRY_CHARS: 280,
    PART_CHARS: 20000,
    PART_LINES: 500,
  };
  for (const line of res.stdout.split("\n")) {
    const m = line.match(/^(WAKE_LINES|ENTRY_CHARS|PART_CHARS|PART_LINES)\s+(\d+)/);
    if (m) {
      cfg[m[1] as keyof OptMemConfig] = parseInt(m[2], 10);
    }
  }
  return cfg;
}

export function updateOptMemConfig(botHandle: string, updates: Partial<OptMemConfig>): OptMemConfig {
  ensureAgentOptMemInitialized(botHandle);
  const args: string[] = ["config"];
  for (const [k, v] of Object.entries(updates)) {
    if (typeof v === "number" && v > 0) {
      args.push(`${k}=${Math.floor(v)}`);
    }
  }
  if (args.length > 1) {
    runMemoCommand(botHandle, args);
  }
  return getOptMemConfig(botHandle);
}

/**
 * Full snapshot of an agent's OptMem store + binary merge tree + context compaction state.
 */
export function getOptMemSnapshot(botHandle: string, channelId = "global"): OptMemStoreSnapshot {
  ensureAgentOptMemInitialized(botHandle);
  const wakeRes = wakeMainAgentMemory(botHandle);
  const logs = readRawLogs(botHandle);
  const treeNodes = readTreeNodes(botHandle);
  const pending = getPendingBlocks(botHandle);
  const config = getOptMemConfig(botHandle);
  const compaction = getContextCompactionState(botHandle, channelId);

  return {
    botHandle,
    memoryDir: getAgentMemoryDir(botHandle),
    memoBinaryPath: getMemoBinaryPath(),
    totalMemories: logs.length,
    pendingCompressionsCount: pending.length,
    pendingBlocks: pending.map((b) => b.blockId),
    wakeOutput: wakeRes.wakeOutput,
    wakeLinesCount: wakeRes.wakeOutput.split("\n").filter(Boolean).length,
    config,
    logs: [...logs].reverse(), // newest first for UI log table
    treeNodes,
    compaction,
  };
}
