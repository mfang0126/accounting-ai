# TASKS.md — 当前开发状态

> **这是唯一的共享状态。所有 agent 启动时先读这里，结束时更新这里。**
> 不要通过对话传递状态，不要依赖 memory，只信这个文件。

---

## 当前位置

**Journey: J1 — AI 对账找异常**
**Step: 6 — Critic 验收**

验收标准：`curl` 或命令行跑出真实对账结果，AI 找到 Harbourside Plumbing 全部 5 个故意埋入的错误。

---

## J1 任务列表

- [x] parseBankCsvTool — 解析 Westpac CSV（44笔交易）
- [x] parseXeroGLTool — 解析 Xero GL CSV（72行）
- [x] reconcileTool — 按 Reference 匹配，输出 matched/unmatched
- [ ] **[>] Critic 验收** — 跑真实对账，确认5个错误全部被找到
  - DoD：命令输出包含 REF001 金额差 / INV-2026-004 未收款 / REF011 工资差异 / 其余2个
  - 验收命令：`cd /path/to/accounting-ai && npx ts-node src/test-reconcile.ts`
- [ ] 优化 AI 输出格式（JSON → 人类可读报告，含严重程度分级）

---

## Checkpoints

（J1 验收通过后在此记录）

---

## Status Log

（每完成一个动作追加一行，格式：`- [时间] [一句话]`）

---

## Learning Log

（每次踩坑后追加，格式：`- [日期] [坑] → [解法]`）

---

## 后续 Journeys（锁定，按序解锁）

> 解锁后，主 agent 先填 Step 1-4（痛点/场景/价值/DoD），再按 J1 格式拆成具体 task。

**J2 — 查异常：追查原因，给出会计判断**
- 对每个 unmatched/mismatch 项追查原因
- 给出处理建议（催款 / 调账 / 查编码）
- 区分严重程度 HIGH/MED/LOW
- 用"建议"语气，不替合伙人决策

**J3 — 算 GST：NZ 15% GST Return 数据**
- 汇总 GST on Income（已收）
- 汇总 GST on Expenses（可抵扣）
- 减去已付 IRD（REF023 $3,200 + REF044 $2,800）
- 输出净 GST 应付/应退

**J4 — 出 P&L：按科目汇总损益表**
- Revenue（Account 100）
- Expenses（Account 449-490，按科目分类）
- Net Profit = Revenue - Expenses

**J5 — 生成底稿：Working Paper，每个数字可溯源**
- 汇总 J1-J4 全部输出
- 每个数字标注来源（哪个 CSV、哪一行）
- 结构化格式，可供合伙人审阅

**J6 — 合伙人审阅：上传 + 结果展示 + 追问**
- FileUpload.tsx（拖放上传）
- 结果可视化（ReconciliationTable / AnomalyBadge）
- 自然语言追问（"Materials 花了多少？比上季度多吗？"）
