## Memory

Your memory is OptMem:
- The tool is `~/.optmem/memo` (or `packages/compute/src/optmem/memo` with `MEMORY_DIR` per agent)
- Your memories are in `~/.optmem/memory` (or `.conclave-data/optmem/<bot-handle>`)

OptMem outlives every session, compaction, model and vendor change.
Without it you do not know who you are, or what was decided and tried.

### At startup: activating OptMem (mandatory)

Run `~/.optmem/memo wake` before any other tool call, in every session, and
then do exactly what it prints, to the end of its output.

### While working: register memories (mandatory)

Call `~/.optmem/memo note "<1 line, max 280 bytes>"` whenever you learn
something new, or something worth keeping happens. That covers a task
worth real effort, a fact or insight the user teaches you, anything you
learn about their life (even indirectly), any event of lasting effect.

Do not register redundant memories.

If `~/.optmem/memo note` asks a compression: do it before your next action.

Never edit or delete anything under `~/.optmem/memory`: the tool manages it.

### When you need an old memory: search, or navigate

`~/.optmem/memo recall <regex>` searches every memory, word for word.

Your memories also form a binary tree: #0-1, #2-3 ... exist as one-line
summaries, pairs of those as #0-3, and so on -- every `#a-b` line wake
prints is one node of it. `~/.optmem/memo zoom <a-b>` opens a node into its
two halves, down to the raw memories.

### If you're a subagent: skip everything above

Parallel sessions on this machine are all you, and may all write memories.
A subagent is not: it must never run `memo`, because it cannot judge what
is already known, and its notes would arrive duplicated and incorrectly.
When you spawn one, write: `You are a subagent. Don't run memo.`

---

## Conclave Main Agent Architecture: Memory + Context (+Compact) + Subprocess Delegation

1. **Main Agents are Clean Orchestrators**:
   - Every main agent (`@ops`, `@sales`, `@ivo-claude`, `@finance`) wakes with `memo wake` + compacted channel context + three-tier workspace memory (`SOUL.md`, `AGENTS.md`, `MEMORY.md`).
   - Main agents **never** run noisy multi-step execution directly in their main loop. Instead, they delegate concrete work (app building, SQL/records mutations, telemetry checks, external comms drafting, code/shell runs) to isolated **Subprocess Workers** (`packages/compute/src/subagent-worker.ts`).
2. **Subprocess Isolation Rule**:
   - Every delegated subprocess runs with `OPTMEM_SUBAGENT=1` and the instruction:
     `You are a subagent. Don't run memo.`
   - Subprocesses execute in isolation and return only a structured JSON summary (`summary`, `internalSteps`, `artifactHtml`, `suggestedNote`) to the Main Agent.
3. **Context Compaction (`+compact` / `memo nap`)**:
   - After receiving the subprocess result, the Main Agent records a single 1-line memory (`memo note`) and settles any pending binary merge tree compressions (`memo nap <lo>-<hi> "<summary>"`).
   - Channel context is automatically compacted (or manually compacted via `/compact`) into a rolling summary so the Main Agent's context window stays fast, clean, and well-rounded.
