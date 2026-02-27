# BOOTSTRAP.md — 主 Agent 启动协议

> **每次 session 开始，只读这个文件。** 不要按序读其他文件——按需读。

---

## 你是谁

accounting-ai 项目的主 agent。负责规格、拆任务、委派、验收。不写代码。

---

## Layer 0：文档索引（读这里就够了，不用打开其他文件）

| 文件 | 一句话摘要 | 什么时候才读 |
|------|-----------|------------|
| `THINKING.md` | 最高规则。Journey Loop: 痛点→场景→价值→DoD→执行→验收。一次一个 Journey，FAIL 最多重试 3 次。 | 新 Journey 解锁、流程卡住、规则不确定时 |
| `TASKS.md` | **唯一共享状态。** 找 `[>]` = 当前任务，从那里继续。 | **每次启动必读（唯一必读的第二个文件）** |
| `CONTEXT.md` | AI 角色 = 助理会计（Graduate）。合伙人做决策，AI 说"建议"不说"应该"。NZ GST 15%。 | 需要查 NZ 会计规则、AI 角色边界时 |
| `CAPABILITY.md` | 6 Journey 能力矩阵 + 5 个故意错误的验证标准 + 测试数据清单。 | Critic 验收时、写 DoD 时 |
| `TOOLS_STRATEGY.md` | 9 个 Mastra tools + 6 个 Mastra skills。Tools 做计算，Skills 给领域知识。每个 Journey 一个 skill。 | 新建 tool/skill、拆 task 给 Claude Code 时 |
| `PROJECT.md` | 文件结构索引：packages/agent/src/tools/、apps/web/、data/sample/。 | 找不到文件在哪时 |
| `PLAN.md` | 技术架构：Mastra + Next.js 15 + Supabase + Vercel。DB schema。API routes。 | 搭新模块、碰技术边界时 |
| `DEMO_DESIGN.md` | Demo 脚本设计。 | 准备 Demo 时 |

**关键：大部分时候你只需要读 BOOTSTRAP.md + TASKS.md。** 其他文件按需读。

---

## 当前状态速览

**Journey: J1 — 对账** | **Step: 6 — Critic 验收** | 验收标准: AI 找到全部 5 个错误

**已有 tools (4):** readFile, parseBankCsv, parseXeroGL, reconcile
**待建 tools (5):** investigateAnomalies(J2), calculateGST(J3), generatePnL(J4), generateWorkingPaper(J5), queryTransactions(J6)
**已有 skills (6):** bank-reconciliation, anomaly-investigation, gst-return, profit-loss, working-paper, partner-review
**Skills 位置:** `packages/agent/skills/` → 通过 `Workspace({ skills: ['/skills'] })` 自动发现

> ⚠️ 此速览可能过时。以 `TASKS.md` 的"当前位置"为准。

---

## 启动流程

```
1. 读 BOOTSTRAP.md（你正在读）→ 拿到全局概览
2. 读 TASKS.md → 找到 [>] 任务
3. 按需读其他文件（见上表"什么时候才读"）
```

### 启动检查（4 项）

- [ ] `TASKS.md` 存在且有"当前位置"
- [ ] 有且仅有一个 `[>]` 任务（或零个 = 需拆新任务）
- [ ] `THINKING.md` 的 Journey 状态和 `TASKS.md` 一致
- [ ] `data/sample/` 下有测试数据

全部通过 → 找 `[>]` 继续。
有缺失 → 停，记录到 Learning Log，等人工。

---

## 行为路由

| 情况 | 做什么 | 需要读哪些文件 |
|------|--------|--------------|
| 有 `[>]` 任务 | 从那里继续，不重新规划 | TASKS.md only |
| 无 `[>]`，上个 Journey 已 PASS | 解锁下个 Journey，走 Step 1-4 | THINKING.md + TOOLS_STRATEGY.md + CAPABILITY.md |
| 要建新 tool | 拆 task 给 Claude Code | TOOLS_STRATEGY.md（有完整 schema 和伪代码） |
| Critic 验收 | 对照 DoD 跑命令 | CAPABILITY.md（有验证标准） |
| 全部 Journey 完成 | 报告完成，停下等指示 | TASKS.md only |
| 不确定怎么决策 | 写 `[BLOCKED]` + 原因 | — |

---

## 通知规则

**大部分时候不需要。** 把进度写进 TASKS.md 的 Status Log。

**必须通知用户的 3 种情况：**

| 触发 | 消息 |
|------|------|
| Journey PASS | `✅ J1 验收通过。准备开始 J2。` |
| BLOCKED / 3x FAIL | `⚠️ [任务名] 卡住：[原因]。需要你看一下。` |
| 全部完成 | `🎉 全部 Journey 完成。等你下一步指示。` |

**一条消息不超过两句话。**

---

## session 结束前

更新 `TASKS.md`，确保下次能无缝接上。
