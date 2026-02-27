# TOOLS_STRATEGY.md — Mastra Agent 工具 + 技能清单

> **什么时候读：** 新建 tool/skill 时、拆 task 给 Claude Code 时。日常路由不需要读。
> 回答：开发这个 Mastra Agent 需要哪些 tools 和 skills，每个 Journey 用哪些。
> 核心原则：**数字计算绝对用 tool，领域知识放 skill，LLM 只做调度和语言输出。**

---

## Skills 清单（6 个，每个 Journey 一个）

> Skills = 可发现的指令包。Agent 运行时自动发现，按需激活。不消耗 token 直到被激活。
> 位置：`packages/agent/skills/`
> 注册：`Workspace({ skills: ['/skills'] })` → agent 自动发现

| Skill | Journey | 职责 | 含 references |
|-------|---------|------|--------------|
| `bank-reconciliation` | J1 | 对账规则：符号惯例、Invoice 双重记账过滤、容差标准、输出格式 | — |
| `anomaly-investigation` | J2 | 异常分类（5 类）、严重程度规则、"建议"语气、逾期天数计算 | `nz-overdue-rules.md` |
| `gst-return` | J3 | NZ 15% GST 计算流程、Tax Rate 分类、IRD payment 识别、交叉验证 | `nz-gst-rates.md` |
| `profit-loss` | J4 | Account Code 分类、P&L 格式、排除规则（200/820 不入 P&L） | — |
| `working-paper` | J5 | 底稿结构（7 节）、来源引用格式 `[file:row]`、不做计算只做汇总 | — |
| `partner-review` | J6 | 5 类常见追问的应答模板、诚实说"不知道"、NZD 格式 | — |

### Skills vs Tools 分工

| 层面 | 由谁负责 | 例子 |
|------|---------|------|
| **数字计算** | Tool（Zod schema 进出） | reconcile 输出 `{ difference: 1086.96 }` |
| **领域知识** | Skill（SKILL.md 指令） | "逾期 > 60 天 → 建议考虑坏账准备" |
| **语言表达** | Agent（LLM 推理） | "Renovate NZ 有 $1,086.96 未付，建议跟进" |

---

## 设计原则

1. **Tool 做计算，Agent 做判断表达** — 加减乘除、匹配、汇总全在 tool 里完成，agent 拿到结果后用自然语言向合伙人汇报
2. **每个 tool 单一职责** — 一个 tool 只做一件事，小而准确，方便 agent 组合调用
3. **Zod schema 进出** — 所有输入输出都有 Zod 类型校验，不允许 `any`
4. **来源追溯** — 每个输出数字必须带来源（哪个文件、哪一行），tool 内部就要标记 `sourceRow`
5. **纯函数** — tools 不依赖外部状态，同样输入永远同样输出

---

## Tool 完整清单（9 个 tools）

### 数据读取层（3 个，含 readFile）

| Tool ID | 职责 | Journey | 已有? |
|---------|------|---------|-------|
| `readFile` | 从 data/ 目录读文件内容 | All | ✅ 有，需修 hardcoded path |
| `parseBankCsv` | 解析 Westpac CSV → 结构化 BankTransaction[] | J1 | ✅ 有 (parseBankStatement) |
| `parseXeroGL` | 解析 Xero GL CSV → 结构化 GLEntry[] | J1 | ✅ 有 |

### 对账层（1 个）

| Tool ID | 职责 | Journey | 已有? |
|---------|------|---------|-------|
| `reconcile` | Bank vs GL 逐笔匹配，输出 matched/unmatched/mismatch | J1 | ✅ 有 (reconcileAccounts) |

### 分析层（3 个）— 需要新建

| Tool ID | 职责 | Journey | 已有? |
|---------|------|---------|-------|
| `investigateAnomalies` | 对每个异常追查原因，给出 HIGH/MED/LOW + 处理建议 | J2 | ❌ **新建** |
| `calculateGST` | 汇总 GST on Income / Expenses / Payments，算净额 | J3 | ❌ **新建** |
| `generatePnL` | 按 Account Code 分类汇总 Revenue / Expenses / Net Profit | J4 | ❌ **新建** |

### 输出层（1 个）— 需要新建

| Tool ID | 职责 | Journey | 已有? |
|---------|------|---------|-------|
| `generateWorkingPaper` | 汇总 J1-J4 输出，每个数字标注 CSV 来源行号 | J5 | ❌ **新建** |

### 查询层（1 个）— 需要新建

| Tool ID | 职责 | Journey | 已有? |
|---------|------|---------|-------|
| `queryTransactions` | 按科目/日期/金额范围查询，支持追问 | J6 | ❌ **新建** |

---

## Journey → Tool 映射

### J1：对账（Bank Reconciliation）

```
Agent 调用顺序：
1. readFile("sample/bank-statement-Q1-2026.csv")
2. parseBankCsv(csvContent)                        → BankTransaction[]
3. readFile("sample/xero-general-ledger-Q1-2026.csv")
4. parseXeroGL(csvContent)                         → GLEntry[]
5. reconcile(bankTransactions, glEntries)           → { matched, anomalies, summary }

Agent 输出：
"44 笔银行交易 vs 57 行 GL 分录：41 笔完全匹配，3 个异常需要关注。"
```

**需要的 tools：** readFile, parseBankCsv, parseXeroGL, reconcile（全部已有）

---

### J2：查异常（Anomaly Investigation）

```
Agent 调用顺序：
1. investigateAnomalies(reconcileResult.anomalies, glEntries, bankTransactions)
   → 对每个异常：
     - 分类（部分付款 / 完全未收 / 工资差异 / GST 验证 / 误报）
     - 严重程度（HIGH / MED / LOW）
     - 处理建议（催款 / 调账 / 查编码 / 无需操作）
     - 判断依据（金额阈值 + 逾期天数 + 科目类型）

Agent 输出：
"发现 5 个需要关注的项目：
⚠️ HIGH: Renovate NZ 有 $1,086.96 未付，建议跟进
⚠️ HIGH: D Morrison 截至 Q1 末无收款，建议发催款函
..."
```

**需要新建的 tool：** `investigateAnomalies`

```typescript
// 伪代码 — 这个 tool 的核心逻辑
investigateAnomalies.execute = async ({ anomalies, glEntries, bankTransactions }) => {
  return anomalies.map(anomaly => {
    // 规则引擎判断，不是 LLM 判断：
    // - 部分付款：bank amount < GL amount && diff > $100
    // - 完全未收：GL 有 invoice，bank 无对应收款
    // - 工资差异：account code 是 payroll (450-459)，bank vs GL 不等
    // - GST 验证：reference 含 "GST Payment"
    // - 误报检查：bank amount == GL net + GST amount（含税匹配）
    return {
      ...anomaly,
      category: determineCategory(anomaly, glEntries),
      severity: determineSeverity(anomaly),
      recommendation: generateRecommendation(anomaly),
      daysSinceInvoice: calculateDaysSince(anomaly, glEntries),
      sourceRows: { bankRow: ..., glRow: ... },
    };
  });
};
```

**关键：** 判断逻辑是规则引擎（if/else），不是让 LLM 猜。但最后的**自然语言表达**交给 agent。

---

### J3：算 GST（GST Return）

```
Agent 调用顺序：
1. calculateGST(glEntries, { jurisdiction: 'NZ', period: 'Q1-2026' })
   → {
       gstOnIncome: number,        // 从 sales invoices 的 taxAmount 汇总
       gstOnExpenses: number,      // 从 purchase bills 的 taxAmount 汇总
       gstPaymentsMade: number,    // REF023 $3,200 + REF044 $2,800
       netLiability: number,       // gstOnIncome - gstOnExpenses - gstPaymentsMade
       breakdown: [                // 每笔带来源行号
         { ref, description, taxAmount, type: 'income'|'expense'|'payment', sourceRow }
       ]
     }

Agent 输出：
"Q1 2026 GST 计算结果：
GST collected (on sales): $X,XXX.XX NZD
GST paid (on expenses): $X,XXX.XX NZD
GST payments to IRD: $6,000.00 NZD（REF023 $3,200 + REF044 $2,800）
Net GST payable: $X,XXX.XX NZD
来源：xero-general-ledger-Q1-2026.csv"
```

**需要新建的 tool：** `calculateGST`

逻辑：
- 遍历 glEntries，按 taxRate 列分类：`GST on Income` → income, `GST on Expenses` → expense
- 找 GST payment transactions（account code = GST 相关科目）
- 纯加减，每一步保留 sourceRow
- NZ 15% 验证：检查每笔 taxAmount / (net - taxAmount) ≈ 0.15

---

### J4：出 P&L（Profit & Loss）

```
Agent 调用顺序：
1. generatePnL(glEntries, { period: 'Q1-2026' })
   → {
       revenue: { total, items: [{ accountCode, accountName, amount, sourceRows }] },
       expenses: { total, items: [{ accountCode, accountName, amount, sourceRows }] },
       netProfit: number,
       period: { from, to }
     }

Agent 输出：
"Harbourside Plumbing Q1 2026 损益表：
Revenue: $XX,XXX.XX NZD
  - 100 Sales: $XX,XXX.XX
Expenses: $XX,XXX.XX NZD
  - 449 ACC Levies: $X,XXX.XX
  - 450 Wages — Mike: $XX,XXX.XX
  ...
Net Profit: $X,XXX.XX NZD"
```

**需要新建的 tool：** `generatePnL`

逻辑：
- GL 里 account code 100 = Revenue（credit 列）
- account code 449-490 = Expenses（debit 列）
- 按 accountCode + accountName 分组汇总
- netProfit = revenue.total - expenses.total

---

### J5：生成底稿（Working Paper）

```
Agent 调用顺序：
1. generateWorkingPaper({
     reconcileResult,    // from J1
     anomalyReport,      // from J2
     gstCalculation,     // from J3
     pnlSummary,         // from J4
     clientName: 'Harbourside Plumbing Ltd',
     period: 'Q1 2026',
   })
   → {
       sections: [
         { title: 'Bank Reconciliation', content, sourceRefs },
         { title: 'Anomaly Report', content, sourceRefs },
         { title: 'GST Return', content, sourceRefs },
         { title: 'Profit & Loss', content, sourceRefs },
       ],
       metadata: { generatedAt, dataFiles, totalSourceCitations },
       markdown: string,  // 完整底稿的 markdown 文本
     }

Agent 输出：
完整 Working Paper（可导出 PDF）
```

**需要新建的 tool：** `generateWorkingPaper`

逻辑：
- 不做计算，只做**格式化 + 来源汇总**
- 每个数字旁边标注 `[bank-statement-Q1-2026.csv:row 15]` 这样的来源
- 输出 markdown，后续可用 pdf skill 转 PDF

---

### J6：合伙人审阅（Partner Review）

```
Agent 调用顺序：
1. queryTransactions({ query: 'Materials 花了多少', glEntries, period: 'Q1-2026' })
   → { results, total, sourceRows }

Agent 输出：
"Materials (Account 460) Q1 2026 total: $X,XXX.XX NZD
3 笔交易：
- 2026-01-15: Trade Tools $2,700.00 [GL row 23]
- 2026-02-10: Plumbing Supplies $1,800.00 [GL row 38]
..."
```

**需要新建的 tool：** `queryTransactions`

逻辑：
- 接受自然语言 query，tool 做关键词匹配（accountName contains 'Materials'）
- 也支持结构化查询（by accountCode, dateRange, amountRange）
- 返回匹配的 entries + 汇总 + sourceRows

**J6 还需要前端组件**（不是 Mastra tool，是 Next.js）：
- FileUpload.tsx
- ReconciliationTable.tsx
- AnomalyBadge.tsx
- ChatWindow.tsx（用 AI SDK useChat）

---

## 开发顺序（= Journey 顺序）

| 优先级 | Tool | Journey | 状态 | 依赖 |
|--------|------|---------|------|------|
| 1 | readFile | All | ✅ 需修路径 | 无 |
| 2 | parseBankCsv | J1 | ✅ 已有 | readFile |
| 3 | parseXeroGL | J1 | ✅ 已有 | readFile |
| 4 | reconcile | J1 | ✅ 已有 | parseBankCsv + parseXeroGL |
| 5 | investigateAnomalies | J2 | ❌ 新建 | reconcile |
| 6 | calculateGST | J3 | ❌ 新建 | parseXeroGL |
| 7 | generatePnL | J4 | ❌ 新建 | parseXeroGL |
| 8 | generateWorkingPaper | J5 | ❌ 新建 | J1-J4 全部输出 |
| 9 | queryTransactions | J6 | ❌ 新建 | parseXeroGL + parseBankCsv |

---

## Agent 配置（对齐后的目标）

```typescript
// packages/agent/src/agents/accountingAgent.ts — 目标状态
import { Agent } from '@mastra/core/agent';
import { Workspace, LocalFilesystem } from '@mastra/core/workspace';
import { anthropic } from '@ai-sdk/anthropic';

// 6 个 Skills 通过 Workspace 自动发现
const workspace = new Workspace({
  filesystem: new LocalFilesystem({ basePath: AGENT_ROOT }),
  skills: ['/skills'],  // → skills/{bank-reconciliation,anomaly-investigation,...}
});

export const accountingAgent = new Agent({
  id: 'accountingAgent',
  name: 'AccountingAssistant',
  instructions: SLIM_SYSTEM_PROMPT,         // 核心规则，领域知识在 skills 里
  model: anthropic('claude-sonnet-4-5'),
  workspace,                                // ← skills 在这里
  tools: {
    // 数据读取
    readFile,
    parseBankCsv,
    parseXeroGL,
    // 对账
    reconcile,
    // 分析
    investigateAnomalies,
    calculateGST,
    generatePnL,
    // 输出
    generateWorkingPaper,
    // 查询
    queryTransactions,
  },
});
```

---

## 不对齐问题汇总（需修复）

| # | 问题 | 文件 | 修复 |
|---|------|------|------|
| 1 | 模型用 openai/gpt-4o-mini，应该用 anthropic/claude-sonnet | accountingAgent.ts + package.json | 换 `@ai-sdk/anthropic` |
| 2 | readFile 硬编码 /Users/mingfang/ 路径 | readFile.ts | 改用相对路径或环境变量 |
| 3 | PROJECT.md 文件路径写 src/mastra/ | PROJECT.md | 改为 packages/agent/src/ |
| 4 | PLAN.md 列 6 个 tools，实际只有 4 个 | PLAN.md | 更新为 9 个 tools 的计划 |
| 5 | PLAN.md Agent 定义代码与实际不一致 | PLAN.md | 更新代码示例 |
| 6 | CLAUDE.md 说 "Active Skills (9)" 但其中一些可能不存在 | CLAUDE.md | 验证 OpenClaw skills 是否真的装了 |
| 7 | AGENTS.md 缺了 `packages/db/` 的说明 | AGENTS.md | 补上或标记 TODO |
| 8 | PROJECT.md 说 agent 用 "gpt-4o-mini，4 tools" | PROJECT.md | 改为 "Claude Sonnet，9 tools" |
