# PROJECT.md — 文件结构索引

> 所有文件放在哪、是什么、谁来改。

## 根目录

| 文件 | 用途 | 谁改 |
|------|------|------|
| `THINKING.md` | 底层逻辑，高于一切 | 主 agent + 用户 |
| `PROJECT.md` | 文件结构索引（本文件） | 主 agent |
| `PLAN.md` | 技术架构 + Phase 任务列表 | 主 agent |
| `DEMO_DESIGN.md` | Demo 脚本 + 场景设计 | 主 agent |
| `TASKS.md` | 当前任务状态（relay race 交接） | 所有 agent 共写 |

## src/

| 路径 | 用途 |
|------|------|
| `src/mastra/index.ts` | Mastra 实例入口 |
| `src/mastra/agents/accountingAgent.ts` | 主 agent（gpt-4o-mini，4 tools）|
| `src/mastra/tools/readFile.ts` | 读文件工具（沙箱限 data/ 目录）|
| `src/mastra/tools/parseBankStatement.ts` | 解析 Westpac CSV |
| `src/mastra/tools/parseXeroGL.ts` | 解析 Xero GL CSV |
| `src/mastra/tools/reconcileAccounts.ts` | 对账 + 异常检测 |

## data/

| 路径 | 用途 |
|------|------|
| `data/sample/bank-statement-Q1-2026.csv` | Harbourside Plumbing 银行流水（含5个故意错误）|
| `data/sample/xero-general-ledger-Q1-2026.csv` | Xero GL 对应数据 |
| `data/sample/README.md` | 5个错误说明 |

## diagrams/

> 所有 Mermaid 图源文件。验证命令：`npx -p @mermaid-js/mermaid-cli mmdc -i <file> -o /tmp/out.png`

| 文件 | 内容 |
|------|------|
| `diagrams/thinking.mmd` | THINKING.md 完整逻辑图 |
| `diagrams/thinking-flow.mmd` | Journey Loop 简版 |

## 规则

- 新增文件 → 先更新 PROJECT.md
- 不确定放哪 → 问主 agent
- TASKS.md 是唯一共享状态，其他文件不跨 agent 共享
