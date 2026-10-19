# Ask Mode

## Question

What is inside the /modes/agent explain what is going in proper example code

## Answer

**📁 `/modes/agent` – Overview**

The `modes/agent` directory contains a complete, self‑contained AI coding‑assistant agent that can:

* read, create, modify, delete files and folders  
* list/search files, analyze the codebase, run shell commands  
* access external skill‑files (Cursor/Claude)  
* stage all mutations until the user explicitly approves them  
* show interactive diffs and let the user accept/reject changes one‑by‑one or all‑at‑once  

It is built on top of the Vercel AI SDK’s `ToolLoopAgent` and uses a small, focused set of helper classes to keep the core loop clean and safe.

---

### 🗂️ File‑by‑file breakdown

| File | Purpose |
|------|---------|
| **`agent-tools.ts`** | Defines the **tool schema** that the AI model can call. Each tool (e.g. `read_file`, `create_file`, `modify_file`, …) is a thin wrapper that forwards the call to a `ToolExecutor`. |
| **`tool-executor.ts`** | Implements the actual file‑system logic. It: <br>• validates paths (prevents workspace escapes) <br>• respects exclude patterns (`node_modules`, `.git`, `*.log`, …) <br>• stages changes in an overlay map / deleted set (so nothing is written until approval) <br>• logs every action via `ActionTracker` <br>• provides `applyApprovedFromTracker()` to commit approved mutations <br>• also implements skill‑listing/reading for external `SKILL.md` files. |
| **`action-tracker.ts`** | Simple in‑memory log of all actions (mutations, analyses, tool executions). Tracks `id`, `timestamp`, `type`, `path`, `details`, `status` (`pending\|executed\|approved\|rejected`), and optional `userApproved`. |
| **`types.ts`** | Shared TypeScript interfaces: <br>• `ActionType`, `ActionStatus` <br>• `ActionLog` (the shape stored in the tracker) <br>• `AgentConfig` (workspace path, limits, tool‑flags) <br>• `defaultAgentConfig()` (sensible defaults) <br>• `isMutationType()` helper. |
| **`orchestrator.ts`** | The **entry point** (`runAgentMode()`). It: <br>1. Prompts the user for a natural‑language goal (`clack/prompts` + `chalk`). <br>2. Builds the config, tracker, executor, and tool set. <br>3. Instantiates a `ToolLoopAgent` from the AI SDK (model supplied by `../../ai/getAgentModel`). <br>4. Runs the agent loop, streaming tool‑call previews to the console. <br>5. After the loop, shows the agent’s final text response (rendered as markdown via `../../tui/terminal-md`). <br>6. Launches the interactive approval flow (`approval.ts`). <br>7. If approved, applies the staged changes and reports any errors. |
| **`approval.ts`** | Interactive review UI. Groups pending mutations by file/path, shows a unified diff (via `diff-view.ts`) for each group, and lets the user: <br>• **Accept** → mark as approved <br>• **Reject** → mark as rejected <br>• **Show diff** → view the patch <br>• **Accept all / Cancel** → bulk actions. Returns `true` if any action was approved. |
| **`diff-view.ts`** | Tiny helpers that turn a sequence of file‑create/modify/delete actions into a proper unified‑diff patch (`createTwoFilesPatch` from the `diff` package) and compose the “before/after” strings needed for the patch. |

---

### 🧩 How the pieces work together (simplified data flow)

1. **User prompt** → `orchestrator.ts` asks “What would you like the agent to do?”
2. **Agent loop** (`ToolLoopAgent`) receives the goal and decides which **tool** to call (e.g. `read_file`, `modify_file`).
3. Each tool call goes to `agent-tools.ts` → forwards to `ToolExecutor`.
4. `ToolExecutor`:
   * Checks the path against exclusions & workspace root.
   * For reads: returns the file content immediately (logged as `code_analysis`).
   * For writes: stores the new content in an **overlay** map, marks the action as `pending` in the `ActionTracker`, and returns a staging message.
   * For shells: queues the command (logged as pending).
5. After the agent finishes (or hits the step limit), the orchestrator prints the agent’s final textual answer.
6. **Approval flow** (`approval.ts`) lists all pending mutations:
   * Shows a diff for each file (or a shell command).
   * User can accept/reject individually or all at once.
7. If the user approves, `ToolExecutor.applyApprovedFromTracker()`:
   * Creates folders.
   * Writes/updates/deletes files according to the staged overlay.
   * Runs any approved shell commands.
   * Clears the staging area.

All mutations are **never** written to disk until the user explicitly says “yes”.

---

### 💡 Example code – using the agent mode in a script

Below is a minimal example that shows how you could start the agent mode from another TypeScript file (e.g. a CLI command or a test).  
It assumes you have the AI SDK and the required dependencies installed (`ai`, `@clack/prompts`, `chalk`, `diff`, etc.).

```ts
// example: run-agent.ts
import { runAgentMode } from "./modes/agent/orchestrator";

// Entry point – just call the exported async function.
(async () => {
  try {
    await runAgentMode();
    console.log("\n✅ Agent session finished.");
  } catch (err) {
    console.error("\n❌ Agent session failed:", err);
    process.exit(1);
  }
})();
```

When you run `tsx example/run-agent.ts` (or `node -r tsx/esm run-agent.ts`), you’ll see:

```
🤖 Agent Mode

What would you like the agent to do ?  [Add a new utility function to src/utils.ts]
```

The agent will then:

1. Read `src/utils.ts` (if it exists) to understand the current code.
2. Possibly create/modify the file with the requested function.
3. Stage the change.
4. Show you the final answer (e.g. “I’ve added the function …”).
5. Prompt you to review the staged diff.
6. Upon your approval, write the file to disk.

---

### 🛠️ Example of a tool call inside the agent loop (what the AI sees)

The AI model does **not** call the functions directly; it receives a description of each tool via the `tool` schema from `agent-tools.ts`.  
For illustration, here’s what the schema for `modify_file` looks like (simplified):

```ts
// Inside createAgentTools(executor) → modify_file tool
modify_file: tool({
  description:
    "Stage a full-file replacement for an existing file (pending approval).",
  inputSchema: z.object({
    path: z.string().describe("Relative file path"),
    content: z.string().describe("Complete new file contents"),
  }),
  execute: async ({ path: p, content }) => executor.modifyFile(p, content),
}),
```

When the AI decides to modify a file, it sends a JSON payload like:

```json
{
  "toolName": "modify_file",
  "args": { "path": "src/utils.ts", "content": "// …new file content…" }
}
```

The orchestrator logs the tool call, the executor stages the change, and the user later gets to approve it.

---

### ✅ Summary

* **`/modes/agent`** is a ready‑to‑use AI coding assistant that lets you talk to an LLM in natural language and have it edit your codebase **safely**.
* All file‑system mutations are **staged** and require explicit user approval.
* The code is split into clear concerns: tool definitions, safe execution, action tracking, user interaction, and the main orchestration loop.
* You can start it with a single function call (`runAgentMode()`) and extend or replace any piece (e.g. swap the model, change the approval UI, add new tools) without touching the core logic.

Feel free to explore the individual files above to see the exact implementation details, or copy the folder into your own project and adapt it to your needs!
