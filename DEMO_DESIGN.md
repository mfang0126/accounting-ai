# Accounting AI — Demo Design
> 目标：15分钟内，让会计事务所合伙人看完整个流程，说"这个我想用"
> 受众：Speaker 1（NZ 会计事务所合伙人，懂业务，不懂技术）
> 核心竞品：Zato（$350 NZD/账套/年，50个印度开发做了3年）

---

## 一句话定位

> "你现在用 Excel 对账需要1天，我们上传两个文件，3分钟出报告，每个数字都有原始凭证。"

---

## 你见到他时他最在乎的问题

基于 WeChat 会议记录，Speaker 1 会问这几件事：

1. **"这个能不能 tie up bank statement 和 GL？"** → Journey 1 直接回答
2. **"每个数据有没有支持的原始凭证？"** → Journey 2 回答
3. **"能不能生成 working paper？"** → Journey 2 回答
4. **"Security 怎么解决？数据放哪里？"** → 架构说明
5. **"Zato 收 $350，你收多少？"** → 商业模型

---

## Demo 结构（15分钟）

| 时间 | 内容 | 工具 |
|------|------|------|
| 0-2 分钟 | 背景设定 — Harbourside Plumbing 场景 | 口述 |
| 2-8 分钟 | **Journey 1：Bank Reconciliation** | 终端 / Mastra Studio |
| 8-13 分钟 | **Journey 2：Working Paper 生成** | 终端 / Mastra Studio |
| 13-15 分钟 | 扩展能力 + 下一步 | 口述 + 截图 |

---

## Journey 1：Bank Reconciliation（6分钟）

### 场景背景（1分钟口述）

> "这是 Harbourside Plumbing，一家奥克兰水管公司，Q1 2026。
> 他们有一个 Westpac 银行账户，用 Xero 记账。
> 我们的会计收到了这两个文件——一个银行对账单，一个 Xero GL 导出。
> 正常情况下，助理要花半天手动核对。我们现在 3 分钟做完。"

### Demo 步骤

**Step 1：上传两个文件**
```
上传：bank-statement-Q1-2026.csv（Westpac 格式，44笔交易）
上传：xero-general-ledger-Q1-2026.csv（Xero 导出，72行分录）
```
*说：这就是他们每个月收到的原始数据，没有任何处理*

**Step 2：问一句话**
```
输入："帮我对账，找出所有异常，按严重程度排列"
```

**Step 3：AI 自动执行（你什么都不用做）**
```
Agent 内部：
① readFile → 读取两个 CSV
② parseBankStatement → 解析44笔银行交易
③ parseXeroGL → 解析72行 GL 分录
④ reconcileAccounts → 按 Reference 号匹配
⑤ 生成报告
```

**Step 4：展示结果（这是 demo 的核心时刻）**

AI 应该输出：

```
🔴 HIGH SEVERITY — 2 个问题

1. 部分付款 | INV-2025-118 | Renovate NZ Ltd
   发票金额：$13,586.96 NZD
   银行收到：$12,500.00 NZD
   未收款：$1,086.96 NZD
   状态：可能拖欠，需跟进
   
2. 未收款发票 | INV-2026-004 | D Morrison
   发票金额：$6,413.04 NZD
   银行收到：$0
   状态：无收款记录，可能坏账

🟡 MEDIUM SEVERITY — 1 个问题

3. 工资异常 | REF011 | Sarah Chen Jan W3
   银行支出：$3,800.00
   GL 记录：$3,478.26
   差异：$321.74
   状态：可能是税款编码错误

✅ 已匹配：41 笔交易
❌ 需关注：3 个异常
```

**说的话：**
> "这是一个真实的水管公司的数据，我们在里面故意埋了几个问题。
> AI 找到了全部问题，包括一张 $6,413 的发票完全没有收到钱。
> 这个信息如果用 Excel 对账，很容易被漏掉。"

### Journey 1 的证明点

- ✅ 证明：能读真实格式（Westpac CSV，Xero GL）
- ✅ 证明：能做 bank-GL tie up（Speaker 1 最关心的）
- ✅ 证明：AI 能发现人容易忽略的问题
- ✅ 证明：结果清晰，可操作

---

## Journey 2：Working Paper 生成（5分钟）

### 场景衔接（口述）

> "对账找到问题之后，下一步是什么？
> 会计要做 working paper——就是把每个数字的来源都记录清楚，
> 给合伙人和审计师看。这个过程现在要几个小时，我们做给你看。"

### Demo 步骤

**Step 1：追问细节**
```
输入："D Morrison 这张发票 — 原始发票是什么时候开的？金额怎么算的？"
```

AI 回答：
```
INV-2026-004 — D Morrison Residential
开票日期：2026年2月14日
发票总额：$6,413.04 NZD（含 GST）
GST 金额：$513.04（15%）
税前金额：$5,900.00
GL 来源：Journal INV-2026-004，Trade Debtors 账户 200
银行状态：截至 2026年3月31日，无对应收款记录
建议操作：发送催款函，考虑计提坏账准备
```

**Step 2：GST 汇总**
```
输入："Q1 的 GST 情况怎么样？要交多少给 IRD？"
```

AI 回答：
```
Harbourside Plumbing Q1 2026 — GST 汇总

收入端 GST（已收）：
  9张发票合计 GST：$6,XXX.XX NZD

支出端 GST（可抵扣）：
  12张账单合计 GST：$X,XXX.XX NZD

净 GST 应付 IRD：$X,XXX.XX NZD
（注：已支付 Jan $3,200 + Feb $2,800，共 $6,000）
实际差额：[正数=还欠IRD / 负数=IRD 还你]

来源：xero-general-ledger-Q1-2026.csv，所有 GST on Income 分录
```

**Step 3：生成 Working Paper 摘要**
```
输入："帮我生成 Q1 working paper 摘要，包含：收入、支出、净利润、异常清单"
```

AI 回答（这是 demo 高潮）：
```
═══════════════════════════════════════
HARBOURSIDE PLUMBING LTD
Working Paper — Q1 2026（Jan–Mar）
生成时间：2026-02-27 | 来源：Xero GL + Westpac Bank
═══════════════════════════════════════

1. INCOME SUMMARY
━━━━━━━━━━━━━━━━
Total Revenue（税前）：$XX,XXX.XX NZD
  INV-2025-118 Renovate NZ    $10,869.57  ← [REF001]
  INV-2025-119 Auckland Council $6,521.74  ← [REF005]
  INV-2025-120 Kiwi Dev         $7,652.17  ← [REF008]
  ... (共9张发票)

2. EXPENSE SUMMARY
━━━━━━━━━━━━━━━━
Total Expenses（税前）：$XX,XXX.XX NZD
  Wages（Mike Tane + Sarah Chen）：$XX,XXX.XX
  Materials & Supplies：          $ X,XXX.XX
  Vehicle Expenses：               $ X,XXX.XX
  Rent：                          $ X,XXX.XX
  Insurance：                     $ X,XXX.XX

3. NET PROFIT（税前）
━━━━━━━━━━━━━━━━
Revenue - Expenses = $XX,XXX.XX NZD

4. ANOMALIES REQUIRING ATTENTION
━━━━━━━━━━━━━━━━
⚠️ [HIGH] INV-2025-118 部分收款 — 未收 $1,086.96
⚠️ [HIGH] INV-2026-004 D Morrison — 完全未收款 $6,413.04
⚠️ [MED]  REF011 Sarah Chen 工资差异 — $321.74

5. GST POSITION
━━━━━━━━━━━━━━━━
净应付 IRD：$X,XXX.XX NZD

═══════════════════════════════════════
每个数字均可追溯至原始 GL 分录
[REF001] = xero-general-ledger-Q1-2026.csv Line 1-2
[REF005] = xero-general-ledger-Q1-2026.csv Line 7-8
...
═══════════════════════════════════════
```

**说的话：**
> "每一个数字旁边都有 Reference，可以点进去看原始数据是哪一行。
> 这就是 Speaker 1 说的 hyperlink——以前要手动做，现在自动生成。
> 合伙人和审计师拿到这个，不需要再重新找原始凭证。"

### Journey 2 的证明点

- ✅ 证明：每个数字有原始凭证支持（Speaker 1 核心需求）
- ✅ 证明：GST 自动计算（NZ 15%，IRD 规则）
- ✅ 证明：Working paper 结构化输出
- ✅ 证明：可以追问细节（不只是批处理）

---

## 扩展能力说明（2分钟口述）

### 现在能做（已实现）

| 功能 | 状态 | 说明 |
|------|------|------|
| 读 Westpac CSV | ✅ | 最常用 NZ 银行格式 |
| 读 Xero GL CSV | ✅ | Xero 一键导出 |
| Bank-GL 对账 | ✅ | 按 Reference 匹配 |
| 异常检测 4类 | ✅ | 部分付款/未收款/金额差/多余记录 |
| GST 计算 NZ | ✅ | 15%，IRD 逻辑 |
| 自然语言追问 | ✅ | 随时问随时答 |

### 2周内能加（技术上直接）

| 功能 | 优先级 | 说明 |
|------|------|------|
| ANZ / ASB 银行格式 | P1 | 换列名映射，1天 |
| Working paper PDF 导出 | P1 | 用 ReportLab 或 Puppeteer，2天 |
| AU GST（10%，ATO） | P1 | 加一个参数，半天 |
| Variance analysis | P2 | 对比两期数据，2天 |
| Financial ratios | P2 | 快速比率/毛利率，1天 |
| MYOB 格式支持 | P2 | 解析器，2天 |

### 1个月后能做

| 功能 | 说明 |
|------|------|
| Xero API 直连 | 不用导出 CSV，直接拉数据 |
| 多客户管理 | 一个事务所，多个客户文件夹 |
| 数据隔离（RLS） | 每个客户数据完全隔开 |
| 审计日志 | 每次查询都有记录（合规要求） |
| 浏览器界面 | 拖拽上传，不用命令行 |

### 我们 vs Zato

| | Zato | 我们（MVP） |
|---|---|---|
| 价格 | $350 NZD/账套/年 | $150-200 NZD/账套/年 |
| 开发周期 | 3年，50人 | 2周 MVP |
| AI 能力 | 无（规则引擎） | Claude / GPT 推理 |
| 自然语言问答 | ❌ | ✅ |
| 可定制 | ❌ | ✅ |
| 数据位置 | 云端（不明） | AWS ap-southeast-2 NZ/AU |

---

## Security 问题的标准答案

Speaker 1 的 IT 部门会问 Security，准备好这个回答：

> "数据存在 AWS 悉尼（ap-southeast-2），符合 NZ Privacy Act 2020 和 AU Privacy Act 1988 的数据本地化要求。
> 每个客户的数据完全隔离，用 Row Level Security 实现。
> 每次 AI 查询都有审计日志，记录谁问了什么、基于哪些数据回答。
> 如果公司需要 ISO 27001 认证，这个成本大约 2-4 万 NZD，是一次性的。"

---

## Demo 之后的对话引导

Demo 结束后，引导这两个问题：

**问题 1：**
> "你们事务所里，哪个流程最耗时间？对账？GST 申报？客户年报？我们下一步就做那个。"

**问题 2：**
> "如果这个工具，一个助理每天能省 1 小时，一年 250 个工作日，省 250 小时。
> 按 $50/小时算，一年省 $12,500。
> 我们一个账套 $150/年。你算不算值得？"

---

## 需要补的开发任务（按 Journey 分）

### Journey 1 缺的

| 任务 | 说明 | 估时 |
|------|------|------|
| 验证 reconcileAccounts 找到5个错误 | 目前代码写了但未跑通 | 2小时 |
| 优化 AI 输出格式 | 现在是 JSON，要变成人类可读的报告 | 1天 |
| 用中文/英文都能问 | 现在 prompt 是英文 | 半天 |

### Journey 2 缺的

| 任务 | 说明 | 估时 |
|------|------|------|
| GST 计算工具（calculateGST） | 代码结构在，需要实现 | 1天 |
| Working paper 输出格式 | 结构化文本，带 Reference | 1天 |
| P&L 汇总工具（generatePnL） | Revenue - Expenses = Net Profit | 1天 |

### Demo 环境

| 任务 | 说明 | 估时 |
|------|------|------|
| Mastra Studio 能正常跑 | 需要持久运行，不被 kill | 1小时 |
| 准备好 Harbourside 数据 | 已有，确认5个错误位置正确 | 30分钟 |
| 写 demo 问题脚本 | 准备好要输入的问题，顺序对 | 1小时 |

---

## 总开发量估计

**Journey 1 可以 demo：3天**
**Journey 2 可以 demo：再加3天**
**合计：6个工作日**

这是 MVP demo 级别，不是产品级别。
产品级别需要 UI、部署、多用户，那是另外2-4周的事。

---

*文档版本：1.0 | 2026-02-27*
*基于：WeChat 会议记录（2026-02-24）+ 样本数据 README*
