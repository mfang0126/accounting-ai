# PROJECT.md — 文件结构索引

> 所有文件放在哪、是什么、谁来改。

## 根目录

| 文件 | 用途 | 谁改 |
|------|------|------|
| `BOOTSTRAP.md` | 主 agent 启动入口（第一个读的文件） | 用户 |
| `CONTEXT.md` | 项目大背景：AI 角色 + 真实场景 + 判断边界 + NZ 会计规则 | 用户 + 主 agent |
| `CAPABILITY.md` | 项目能力说明 + 测试验证计划 + 数据真实性验证 | 主 agent |
| `THINKING.md` | 底层逻辑，高于一切 | 主 agent + 用户 |
| `PROJECT.md` | 文件结构索引（本文件） | 主 agent |
| `PLAN.md` | 技术架构 + Phase 任务列表 | 主 agent |
| `DEMO_DESIGN.md` | Demo 脚本 + 场景设计 | 主 agent |
| `TASKS.md` | 当前任务状态 + Checkpoints + Learning Log | 所有 agent 共写 |
| `TOOLS_STRATEGY.md` | Mastra Agent 工具清单 + Journey 映射 | 主 agent |

## packages/agent/src/（Mastra Agent）

| 路径 | 用途 | 状态 |
|------|------|------|
| `packages/agent/src/index.ts` | Mastra 实例入口 | ✅ |
| `packages/agent/src/agents/accountingAgent.ts` | 主 agent（Claude Sonnet，9 tools）| ⚠️ 需换模型 |
| `packages/agent/src/prompts/system.ts` | NZ/AU 会计 system prompt | ❌ 待创建 |
| `packages/agent/src/tools/readFile.ts` | 读文件工具（沙箱限 data/ 目录）| ⚠️ 需修路径 |
| `packages/agent/src/tools/parseBankStatement.ts` | 解析 Westpac CSV | ✅ |
| `packages/agent/src/tools/parseXeroGL.ts` | 解析 Xero GL CSV | ✅ |
| `packages/agent/src/tools/reconcileAccounts.ts` | 对账 + 异常检测 | ✅ |
| `packages/agent/src/tools/investigateAnomalies.ts` | 异常追查 + 会计判断 | ❌ J2 新建 |
| `packages/agent/src/tools/calculateGST.ts` | NZ 15% GST 计算 | ❌ J3 新建 |
| `packages/agent/src/tools/generatePnL.ts` | P&L 按科目汇总 | ❌ J4 新建 |
| `packages/agent/src/tools/generateWorkingPaper.ts` | 底稿汇总 + 来源追溯 | ❌ J5 新建 |
| `packages/agent/src/tools/queryTransactions.ts` | 自然语言查询交易 | ❌ J6 新建 |

## packages/db/（Supabase）

| 路径 | 用途 | 状态 |
|------|------|------|
| `packages/db/schema.sql` | Supabase 数据库 schema | ❌ 待创建 |

## apps/web/（Next.js 前端）

| 路径 | 用途 | 状态 |
|------|------|------|
| `apps/web/` | Next.js 15 App Router | ❌ 待搭建 |

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
