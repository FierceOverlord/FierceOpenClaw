# FierceClaw

> AI-powered CLI assistant with Agent, Ask, Plan, and Telegram modes.

FierceClaw is a Bun/TypeScript CLI application that lets you interact with your codebase using an LLM. It features staged (approval-gated) file mutations, interactive diffs, web research capabilities, and a Telegram bot interface.

## ✨ Features

| Mode | Description |
|------|-------------|
| **Agent Mode** | AI coding assistant that reads, creates, modifies, and deletes files. All mutations are staged and require explicit user approval before being written to disk. |
| **Ask Mode** | Ask natural-language questions about your codebase using read-only tools (read, list, search, analyze). Optionally saves answers to a `.md` file. |
| **Plan Mode** | Generate a step-by-step execution plan from a high-level goal, research the codebase/web, select which steps to run, and execute them with approval. |
| **Telegram Mode** | Run FierceClaw as a Telegram bot (requires bot token and owner ID). |

Other highlights:
- 🛡️ **Staged mutations** — No file is written until you approve the staged diff.
- 🔍 **Interactive approval flow** — Review unified diffs per file, accept/reject individually or all at once.
- 🌐 **Web research** — Optional Firecrawl-powered web search, crawl, and fetch tools.
- 💅 **Beautiful terminal UI** — ASCII banners (figlet), colored output (chalk), interactive prompts (@clack/prompts), and terminal markdown rendering.

---

## 📦 Installation

### Prerequisites

- [Bun](https://bun.com) (v1.4.3 or newer)
- An [OpenRouter](https://openrouter.ai) API key (for the LLM)
- Optionally: [Firecrawl](https://firecrawl.dev) API key (for web search/crawl in Plan/Ask modes)
- Optionally: Telegram bot token and owner ID (for Telegram mode)

### Install

```bash
# Clone the repository
git clone <repo-url>
cd FierceClaw

# Install dependencies
bun install
```

### Environment variables

Create a `.env` file (or export the variables in your shell):

```bash
# Required for all AI modes
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_DEFAULT_MODEL=openrouter/auto

# Optional – web research (Plan & Ask modes)
FIRECRAWL_API_KEY=fc-...

# Optional – Telegram mode
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_OWNER_ID=123456789
```

> **Note:** FierceClaw does not commit a `.env` file (see `.gitignore`).

---

## 🚀 Usage

### Start the interactive CLI

```bash
bun run index.ts
# or, if linked globally:
FierceClaw wakeup
```

You'll see an ASCII banner and a menu to choose between **CLI**, **Telegram**, or **Exit**.

### CLI Submodes

After selecting **CLI**, you can choose:

1. **Agent Mode** — Give the AI a coding task (e.g. "Add a new utility function to src/utils.ts"). The agent explores files, stages changes, and asks for your approval before writing.
2. **Ask Mode** — Ask a question about the codebase (e.g. "What is inside the /modes/agent directory?"). Read-only; optionally saves the answer to a `.md` file.
3. **Plan Mode** — Provide a goal (e.g. "Refactor the auth module"). The AI researches and generates a numbered plan; you select which steps to execute.

### Direct commands

```bash
# Type-check the project
bun run typecheck
# or: bun check
```

### Telegram mode

```bash
TELEGRAM_BOT_TOKEN=... TELEGRAM_OWNER_ID=... bun run index.ts
# Then choose "Telegram" from the wakeup menu.
```

The bot sends a welcome message to the owner and listens for commands.

---

## 📁 Project Structure

```
FierceClaw/
├── index.ts              # CLI entry point (Commander.js) – "wakeup" command
├── package.json          # Bun project manifest
├── tsconfig.json         # TypeScript config (strict, bundler resolution)
├── bun.lock              # Bun lockfile
├── .gitignore            # Ignores node_modules, .env, dist, logs, etc.
├── ask.md                # Example ask-mode output
├── README.md             # This file
│
├── ai/                   # LLM provider configuration
│   ├── index.ts          # Re-exports getAgentModel
│   └── ai.config.ts      # OpenRouter provider setup
│
├── modes/                # Application modes
│   ├── cli.ts            # CLI submode menu (agent / ask / plan / back)
│   ├── agent/            # AI coding agent
│   │   ├── orchestrator.ts   # Entry point: prompt → ToolLoopAgent → approval → apply
│   │   ├── agent-tools.ts    # Tool schema definitions (read/create/modify/delete/list/search/shell)
│   │   ├── tool-executor.ts  # Safe file-system execution with staging & path validation
│   │   ├── action-tracker.ts # In-memory log of all actions (pending/approved/rejected)
│   │   ├── types.ts          # Shared interfaces (ActionType, AgentConfig, etc.)
│   │   ├── approval.ts       # Interactive diff review UI (accept/reject per file)
│   │   └── diff-view.ts      # Unified-diff helpers for staged changes
│   │
│   ├── ask/              # Q&A mode
│   │   └── orchestrator.ts   # Ask question → read-only agent → optional save to .md
│   │
│   ├── plan/             # Planning mode
│   │   ├── orchestrator.ts   # Generate plan → select steps → execute each step
│   │   ├── planner.ts        # Plan generation with JSON schema output
│   │   ├── planner types.ts  # Plan / PlanStep interfaces
│   │   ├── selection.ts      # Print plan + multiselect steps to run
│   │   └── web-tools.ts      # Firecrawl web_search / web_crawl / fetch_url tools
│   │
│   └── telegram/         # Telegram bot integration
│       ├── index.ts          # Bot launch + welcome message
│       ├── handlers.ts       # Message/command handlers
│       ├── agent-run.ts      # Run agent from Telegram
│       ├── approval-session.ts
│       ├── auth.ts           # Owner ID authorization
│       ├── constants.ts      # Welcome message text
│       ├── plan-session.ts   # Run plan mode from Telegram
│       └── text.ts           # Text formatting helpers
│
└── tui/                  # Terminal UI helpers
    ├── wakeup.ts         # ASCII banner + main mode selector
    └── terminal-md.ts    # Markdown rendering for terminal output
```

---

## 🏗️ How It Works

### Agent Mode (the core flow)

1. **Prompt** — You enter a natural-language goal (e.g. "Refactor the login handler").
2. **Agent loop** — A `ToolLoopAgent` (Vercel AI SDK) decides which tools to call.
3. **Staging** — File writes are staged in an overlay map and logged in an `ActionTracker`; nothing touches disk yet.
4. **Preview** — Each tool call is logged to the console with a truncated preview.
5. **Final answer** — The agent streams its textual response, rendered as terminal markdown.
6. **Approval** — An interactive UI shows unified diffs for all staged changes. You can accept/reject per file or all at once.
7. **Apply** — Approved mutations are written to disk; rejected ones are discarded.

### Ask Mode

- Read-only agent with `read_file`, `list_files`, `search_files`, `analyze_codebase`, `list_skills`, `read_skill`.
- No file creation/modification/shell execution.
- Optionally persists the Q&A to a `.md` file after your confirmation.

### Plan Mode

1. **Research** — Planner agent uses read-only tools (+ optional web tools if `FIRECRAWL_API_KEY` is set) to study the codebase.
2. **Plan** — Outputs a structured JSON plan (1–15 steps) with titles, descriptions, hints, and complexity.
3. **Select** — You pick which steps to execute via a multiselect prompt.
4. **Execute** — Each selected step runs as its own agent session with full tool access and staged approval.

---

## 🛠️ Development

### Scripts

```json
{
  "typecheck": "bun check"
}
```

### Adding a new tool

1. Define the tool schema in `modes/agent/agent-tools.ts` (using `zod` + `ai`'s `tool()`).
2. Implement the execution logic in `modes/agent/tool-executor.ts`.
3. Wire it into the mode(s) that should expose it (agent, ask, plan).

### Code style

- TypeScript with `strict: true` and bundler module resolution.
- ESM modules (`"type": "module"`).
- Bun runtime (shebang `#!/usr/bin/env bun`).

---

## 🤝 Contributing

1. Fork the repo and create your branch from `main`.
2. Install dependencies: `bun install`.
3. Make your changes and type-check: `bun run typecheck`.
4. Test manually via `bun run index.ts`.
5. Open a pull request with a clear description.

---

## 📄 License

Private project. See `package.json` for details.

---

## 🔗 Related

- [Bun](https://bun.com) — Fast all-in-one JavaScript runtime
- [Vercel AI SDK](https://sdk.vercel.ai) — AI agent framework (`ToolLoopAgent`)
- [OpenRouter](https://openrouter.ai) — LLM API provider
- [Firecrawl](https://firecrawl.dev) — Web scraping/search API
- [@clack/prompts](https://github.com/clack/prompts) — Beautiful terminal prompts