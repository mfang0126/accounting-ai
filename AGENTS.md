# Accounting AI — Agent Instructions

> This file is read by ALL AI coding agents (Claude Code, Cursor, Copilot, Codex, etc.)
> For Claude Code specific rules, see CLAUDE.md which imports this file.

## ALWAYS read bundled docs before coding

<!-- BEGIN:mastra-agent-rules -->
Before any Mastra work, read the relevant doc in `node_modules/@mastra/core/dist/docs/references/`.
Your training data is outdated — the bundled docs are the source of truth for @mastra/core.

Key references:
- Agents: `references/docs-agents-overview.md`
- Tools: `references/docs-agents-using-tools.md`, `reference-tools-create-tool.md`
- Memory: `references/docs-memory-overview.md`
- Workflows: `references/docs-workflows-overview.md`
- Structured Output: `references/docs-agents-structured-output.md`
- MCP: `references/reference-tools-mcp-client.md`, `reference-tools-mcp-server.md`
- AI SDK integration: `references/guides-agent-frameworks-ai-sdk.md`
- Supabase auth: `references/reference-auth-supabase.md`
- Storage (PostgreSQL): `references/reference-storage-postgresql.md`
<!-- END:mastra-agent-rules -->

<!-- BEGIN:nextjs-agent-rules -->
Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`.
Your training data is outdated — the docs are the source of truth.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ai-sdk-agent-rules -->
Before any AI SDK work, check https://ai-sdk.dev/llms.txt for up-to-date API reference.
Key APIs used in this project:
- `generateText`, `streamText` — core text generation
- `useChat` (React hook) — chat UI streaming
- `toDataStreamResponse` — server-side stream response
- Tool calling with Zod schemas
- Provider: `@ai-sdk/anthropic` for Claude Sonnet
<!-- END:ai-sdk-agent-rules -->

<!-- BEGIN:turborepo-agent-rules -->
This is a Turborepo monorepo. Structure:
- `apps/web/` — Next.js 15 frontend
- `packages/agent/` — Mastra agent + tools
- `packages/db/` — Supabase schema + queries
- `data/sample/` — Test data (Harbourside Plumbing Q1 2026)

Commands: `pnpm install`, `pnpm build`, `pnpm dev`
Config: `turbo.json` for task pipelines, `pnpm-workspace.yaml` for packages
<!-- END:turborepo-agent-rules -->

## Project Overview

AI assistant accountant for NZ accounting firms. Automates quarterly close:
Bank Reconciliation → Anomaly Investigation → GST Calculation → P&L → Working Paper → Partner Review

6 Journeys, 9 Mastra tools + 6 Mastra skills — see `TOOLS_STRATEGY.md` for complete mapping.

## Tech Stack
- Agent: Mastra (TypeScript) + Claude Sonnet (`@ai-sdk/anthropic`)
- Frontend: Next.js 15 (App Router) + shadcn/ui + Tailwind
- DB: Supabase (PostgreSQL + pgvector + RLS)
- Monorepo: Turborepo
- Deploy: Vercel

## Mastra Tools (9)
- readFile, parseBankCsv, parseXeroGL — data layer
- reconcile — matching layer
- investigateAnomalies, calculateGST, generatePnL — analysis layer
- generateWorkingPaper — output layer
- queryTransactions — query layer (J6)

## Mastra Skills (6)
每个 Journey 一个 skill，通过 `Workspace({ skills: ['/skills'] })` 自动发现。
- bank-reconciliation (J1) — 对账规则、符号惯例、容差标准
- anomaly-investigation (J2) — 异常分类、严重程度、"建议"语气
- gst-return (J3) — NZ 15% GST 计算、Tax Rate 分类、交叉验证
- profit-loss (J4) — Account Code 分类、P&L 格式
- working-paper (J5) — 底稿结构、来源引用格式
- partner-review (J6) — 追问应答模板、诚实说"不知道"

> Tools 做计算，Skills 给领域知识，Agent 做调度和语言表达。

## Code Conventions
- TypeScript strict mode, no `any` unless explicitly justified
- All tools use Zod schemas for input/output validation
- NZ accounting: GST 15%, currency always stated as NZD
- AI says "建议" (suggest), never "应该" (should) — partner makes decisions
- Every number in output must cite its source (CSV file + row)

## Testing
- Tests are scenario descriptions, not code (see THINKING.md)
- Acceptance = run command, check real output matches expected
- Edge cases: empty CSV, malformed data, zero amounts must not crash

## Key Files
- THINKING.md — source of truth, overrides everything
- TASKS.md — shared state, all agents read/write here
- TOOLS_STRATEGY.md — Mastra tools design + Journey mapping
- CONTEXT.md — NZ accounting rules + AI role boundaries
- data/sample/ — Harbourside Plumbing test data (5 deliberate errors)
