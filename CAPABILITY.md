# CAPABILITY.md — 项目能力说明 + 验证计划

> **什么时候读：** Critic 验收时（查验证标准）、写 DoD 时（查测试数据）。日常路由不需要读。
> 回答：项目能做什么、怎么验证、每个 Journey 怎么证明它 work。

---

## 项目做什么

Accounting AI 是一个 AI 助理会计，能独立完成 NZ 会计事务所的季度末结账流程：

```
上传 Bank Statement + Xero GL → AI 自动对账 → 查异常 → 算 GST → 出 P&L → 生成底稿
```

用真实的 Harbourside Plumbing Ltd（奥克兰水管公司）Q1 2026 数据演示全流程。

---

## 6 个 Journey 能力矩阵

| Journey | 能力 | Mastra Tools | 输入 | 输出 | 验证命令 |
|---------|------|-------------|------|------|---------|
| **J1** | Bank Reconciliation | readFile, parseBankCsv, parseXeroGL, reconcile | bank CSV + GL CSV | matched/unmatched 列表 | 跑对账脚本，确认 41 笔 matched + 3 个异常 |
| **J2** | Anomaly Investigation | investigateAnomalies | J1 的 anomalies 列表 | 每个异常的原因分析 + 处理建议 | AI 对 5 个问题给出正确判断（见下方） |
| **J3** | GST Return | calculateGST | GL 的 Tax 列 + GST payments | GST collected / paid / net liability | 手算验证 GST 净额与 AI 输出一致 |
| **J4** | P&L Summary | generatePnL | GL 的 Account Code + Debit/Credit | 按科目的 Revenue / Expenses / Net Profit | 手算验证总数与 AI 输出一致 |
| **J5** | Working Paper | generateWorkingPaper | J1-J4 全部输出 | 结构化底稿，每个数字带来源引用 | 抽查 5 个数字，每个都能追溯到原始 CSV 行 |
| **J6** | Partner Review | queryTransactions + 前端 | 浏览器 UI | 上传 + 可视化 + 追问 | 端到端操作：上传两个文件 → 看到报告 → 追问一个问题 |

> 完整 tools 设计见 `TOOLS_STRATEGY.md`

---

## J2 异常判断的验证标准

这是最关键的 Journey——AI 不只是找到异常，还要**像会计一样做判断**。

| 异常 | AI 应该发现什么 | AI 应该建议什么 | 判断依据 |
|------|---------------|---------------|---------|
| REF001 部分付款 | 发票 $13,586.96 vs 银行 $12,500，差 $1,086.96 | "Renovate NZ 有 $1,086.96 未付，建议跟进催款" | 未收金额 > $500，超过 30 天 |
| INV-2026-004 完全未收 | 发票 $6,413.04，银行 $0 | "D Morrison 截至 Q1 末无收款，建议发催款函，考虑坏账准备" | 发票日 2/14，Q1 末仍无收款 = 45+ 天逾期 |
| REF011 工资差异 | 银行 $3,800 vs GL $3,478.26，差 $321.74 | "Sarah Chen W3 多付 $321.74，可能是 PAYE/KiwiSaver 编码问题，建议查 payroll 明细" | GL 记录的是税前工资，银行是实际支付，差额可能是税款分类 |
| REF023 GST 验证 | GST Payment $3,200 已付 IRD | "Jan GST payment $3,200，需与计算的实际 GST 负债对比验证" | GST payment 本身不是错误，但需要验证金额合理性 |
| REF021 正确交易 | $2,700 = $2,347.83 + $352.17 GST ✓ | **不应标记为异常** | 含 GST 金额匹配，AI 不应误报 |

---

## 测试数据现状 + 缺口

### 已有（Harbourside Plumbing Q1 2026）

| 文件 | 内容 | 行数 |
|------|------|------|
| `bank-statement-Q1-2026.csv` | Westpac 格式，44 笔交易 | 45（含 header） |
| `xero-general-ledger-Q1-2026.csv` | Xero GL 导出，57 行分录 | 58（含 header） |
| `README.md` | 5 个故意错误说明 + Chart of Accounts | — |

### 建议新增的测试场景

| 场景 | 为什么需要 | 建议做法 |
|------|-----------|---------|
| **空文件** | 边界测试：上传空 CSV 不应崩溃 | 创建 `empty-bank.csv`（只有 header） |
| **格式错误** | 鲁棒性：列名不匹配、日期格式错 | 创建 `malformed-bank.csv`（故意打乱列顺序） |
| **单笔交易** | 最小场景：只有一笔交易能否正常跑 | 创建 `single-transaction.csv` |
| **大量数据** | 性能：100+ 笔交易时不超时 | 创建 `large-bank-Q1-2026.csv`（100笔） |
| **纯匹配（无异常）** | 证明 AI 不误报：所有交易都匹配时不应标红 | 创建 `perfect-match-bank.csv` + 对应 GL |
| **多客户** | 数据隔离：A 的数据不出现在 B 的查询里 | 创建 Harbourside + 第二个公司的数据 |

### GST 专项测试

| 场景 | 为什么需要 |
|------|-----------|
| Invoice basis vs Payments basis | NZ 两种 GST 核算方式，需确认计算正确 |
| Zero-rated supplies | 有些收入不含 GST（如出口），AI 不应计入 |
| GST 调整（Credit Note） | 退款/折扣时 GST 也要调整 |

---

## 怎么跑验证

每个 Journey 完成后，按以下步骤验证：

```
1. 跑验收命令（curl / 脚本）
2. 对比 AI 输出 vs 手算结果
3. 检查边界场景（空文件、格式错误）
4. Critic Agent 出 PASS/FAIL + 原因
5. 写入 TASKS.md Checkpoint
```

### J3 GST 手算验证参考

从 GL 数据手算（供 Critic Agent 对比用）：

**GST on Income（已收）：** 每张 Invoice 的 Tax Amount 列加总
**GST on Expenses（可抵扣）：** 每张 Bill 的 Tax Amount 列加总
**已付 IRD：** REF023 $3,200 + REF044 $2,800 = $6,000
**净额：** GST on Income - GST on Expenses - 已付 = 应付/应退

（具体数字需要 agent 从 GL 原始数据计算，这里不预设答案，让 Critic 独立验证）

---

## 数据真实性验证

以下已通过网上资料验证：

| 项目 | 验证结果 | 来源 |
|------|---------|------|
| NZ 季度末流程 | ✅ Bank Rec → AR/AP Review → GST → P&L → Working Paper | Xero NZ, Ace Tax, multiple NZ accounting firms |
| NZ GST 15% | ✅ 正确 | IRD.govt.nz |
| GST 报频率 | ⚠️ 常见是 2 月一报，不是季度 | IRD.govt.nz |
| GST due date | ✅ 下月 28 号（3月期限 = 5月7号） | IRD.govt.nz |
| 水管公司财务概况 | ✅ 2人公司年收 $150-250K 合理 | IBISWorld NZ, FieldPulse |
| Materials 占比 | ✅ 10-20% 合理 | Industry benchmark |
| 记录保留要求 | ✅ NZ 7 年 | Tax Administration Act |
