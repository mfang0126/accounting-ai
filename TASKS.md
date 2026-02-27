# TASKS.md — 当前开发状态

> **这是唯一的共享状态。所有 agent 启动时先读这里，结束时更新这里。**
> 不要通过对话传递状态，不要依赖 memory，只信这个文件。

---

## 当前位置

**Journey: J1 — AI 对账找异常**
**Step: 6 — Critic 验收（blocked on 3 bugs）**

验收标准：`curl` 或命令行跑出真实对账结果，AI 找到 Harbourside Plumbing 全部 5 个故意埋入的错误。

---

## J1 — 必须先修的 3 个 Bug

> ⚠️ 这 3 个 bug 不修，J1 验收跑不通。按顺序修。

### Bug 1: reconcile 双重计数（CRITICAL）

**问题：** `reconcileAccounts.ts` line 84 对同一个 reference 的所有 GL 行做 `reduce((sum, gl) => sum + gl.net, 0)`，但一张 invoice 在 GL 里有两行：
- Account 200 (Trade Debtors) = 应收金额（用来跟 bank 对账的）
- Account 100 (Revenue) = 收入确认（不应参与对账匹配）

两行加在一起导致 REF001 的 GL 金额变成 24,456.53（实际应该是 13,586.96），REF022 同理。

**影响的错误：** Error 4 (REF001) 和 Error 5 (REF022) — 能检测到异常但金额全部错误。

**修复方案：** 对 invoice 类型（Source = INV），只取 Account 200 (Trade Debtors) 行参与对账；对 BILL/PAY 类型，取主科目行（非 820 GST Account）。

### Bug 2: GL 的 net 列空值被解析为 0

**问题：** `parseXeroGL.ts` line 70：`net: parseFloat(net) || 0`。
部分 GL 行的 net 列是空的（BILL 的 GST Account 行、TAX 类型行、部分 expense 行如 REF021）。空值被解析为 0，导致对账时 glNet 为 0。

**影响的错误：**
- Error 2 (REF023 GST Payment): GL debit=3200, net=空→0, 对账比较 bank(-3200) vs gl(0)
- Error 3 (REF021 Trade Tools): GL debit=2347.83, net=空→0, 对账比较 bank(-2700) vs gl(0)
- REF021 本应是正确的（$2,347.83 + $352.17 GST = $2,700），但因为 net=0 被误报

**修复方案：** 当 net 为空时，fallback 计算：`net = debit > 0 ? debit : -credit`（即 debit 取正，credit 取负）。或者 reconcile 层直接用 debit/credit 而非 net。

### Bug 3: 银行与 GL 的符号惯例不一致

**问题：** 银行交易金额：支出为负（-3800），收入为正（+12500）。GL 的 net 列：debit 和 credit 都是正数（3478.26、13586.96）。reconcile 直接做 `bankAmount - glNet`，导致支出类交易产生荒谬差额。

**影响的错误：** Error 1 (REF011 Payroll): bank=-3800, gl.net=3478.26, diff=-7278.26（实际差额应该是 321.74）。

**修复方案：** reconcile 层在比较前做符号归一化：
- 如果 bank.amount < 0（支出），比较 `Math.abs(bank.amount)` vs `gl.debit`
- 如果 bank.amount > 0（收入），比较 `bank.amount` vs `gl.credit`
- 或者统一转换为"资金流向"符号

---

## J1 任务列表

- [x] parseBankCsvTool — 解析 Westpac CSV（44笔交易）
- [x] parseXeroGLTool — 解析 Xero GL CSV（72行）→ ⚠️ net 空值 bug 待修
- [x] reconcileTool — 按 Reference 匹配 → ⚠️ 3 个 bug 待修
- [x] ~~模型切换~~ — openai/gpt-4o-mini → anthropic/claude-sonnet-4-5 ✅ 已修
- [x] ~~readFile 路径~~ — 硬编码改为相对路径 ✅ 已修
- [x] ~~测试文件~~ — test-direct.ts / test-simple.ts 同步切换 Anthropic ✅ 已修
- [x] **Bug 1 修复** ✅ — INV: 只取 Account 200 (Trade Debtors) net，避免 Revenue 行重复计数
- [x] **Bug 2 修复** ✅ — parseXeroGL: net 空值时 fallback 到 debit || credit
- [x] **Bug 3 修复** ✅ — BILL 无 820 行时加 taxAmount；PAY/BILL 类型一律 AMOUNT_MISMATCH
- [x] **Critic 验收** ✅ — 5个 DoD 全部通过（`npx tsx src/test/test-reconcile-critic.ts`）
  - REF001: PARTIAL_PAYMENT ✅ diff $1,086.96
  - REF022: PARTIAL_PAYMENT ✅ diff $513.04
  - REF011: AMOUNT_MISMATCH ✅ diff $321.74
  - REF023: GST_VERIFICATION ✅
  - REF021: 正确 matched，不报错 ✅
- [ ] 优化 AI 输出格式（JSON → 人类可读报告，含严重程度分级）

---

## Checkpoints

- **J1 完成** [2026-02-27] — reconcile 3 bugs 修复，5个 Harbourside 错误全部正确检测 ✅

---

## Status Log

- [2026-02-27] 模型切换 openai→anthropic 完成（accountingAgent.ts + package.json + 3 个 test 文件）
- [2026-02-27] readFile.ts 硬编码路径修复（改为 import.meta.url 相对路径 + env fallback）
- [2026-02-27] 发现 reconcile 3 个 critical bugs：双重计数 / net 空值 / 符号惯例
- [2026-02-27] 创建 6 个 Mastra skills（每个 Journey 一个），注册到 Workspace，agent instructions 精简

---

## Learning Log

- [2026-02-27] GL CSV 的 net 列不是所有行都有值 → 不能依赖 net 列，需要用 debit/credit 做 fallback
- [2026-02-27] Invoice 在 GL 里创建 2 行（Debtors + Revenue），对账只能用 Debtors 行 → reconcile 必须按 accountCode 过滤
- [2026-02-27] Bank CSV 用正负号表示方向（-=支出），GL 用 debit/credit 列 → 对账前必须做符号归一化

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
