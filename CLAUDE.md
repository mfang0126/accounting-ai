@AGENTS.md

# Accounting AI — Claude Code Rules

## Disabled Skills (DO NOT invoke)
Irrelevant to this project:
- python-code-review, linkedin-automation, firecrawl, content-research-writer, docx, openclaw-skills-config-guardian

Replaced by AGENTS.md bundled docs (passive context > active skill lookup):
- mastra, ai-sdk, turborepo, nextjs-best-practices

## Active Skills (9)
- supabase-postgres-best-practices — DB schema, RLS, query optimization
- nextjs-supabase-auth — authentication integration
- typescript-advanced-types — Zod schemas, type safety
- sub-agent-patterns — multi-agent orchestration
- agent-browser — token-efficient E2E testing
- browser-use — AI-driven browser verification (Mermaid rendering etc.)
- research — NZ accounting rules lookup
- pdf — J5 Working Paper output
- find-skills — discover new skills as needed

## Key References
- THINKING.md — source of truth, overrides all other docs
- TASKS.md — shared state between all agents
- TOOLS_STRATEGY.md — Mastra tools design + Journey mapping
- BOOTSTRAP.md — agent startup protocol
- CONTEXT.md — NZ accounting rules + AI role boundaries
