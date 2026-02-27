# Accounting AI — 详细开发计划

> 版本：1.0 | 创建：2026-02-27
> 参考：mastra.ai/docs | whitepaper | Harbourside sample data | 通话记录

---

## 产品定位

**不是 chatbot。是 Working Paper Generator + AI Assistant。**

用户上传 Xero GL + 银行对账单 → AI 自动 reconcile → 发现异常 → 生成底稿 → 随时可以用自然语言追问

竞品：Zato ($350 NZD/yr) | 我们：$150-200 NZD/yr，功能更强，AI 原生

---

## 技术栈（确定版）

| 层 | 技术 | 理由 |
|---|------|------|
| Agent 框架 | **Mastra** (TypeScript) | 原生 TS，内置 tools/memory/MCP，文档好 |
| 前端 | **Next.js 15** (App Router) | 复用 language-arts 经验 |
| UI 组件 | **shadcn/ui** + Tailwind | 一致性 |
| AI 模型 | **Claude Sonnet** (anthropic) | 长上下文，文档处理强 |
| 数据库 | **Supabase** (pgvector) | 已有账号，RLS 天然支持数据隔离 |
| 文件存储 | **Supabase Storage** | 简单，与 DB 同一平台 |
| 部署 | **Vercel** | 熟悉 |
| MCP 服务器 | `@modelcontextprotocol/server-filesystem` | 文件读写 |

---

## 项目结构

```
WIP/accounting-ai/
├── apps/
│   └── web/                          # Next.js 前端
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx              # 上传入口
│       │   ├── chat/
│       │   │   └── [clientId]/
│       │   │       └── page.tsx      # 主聊天界面
│       │   └── api/
│       │       ├── upload/route.ts   # 文件上传
│       │       └── chat/route.ts     # Mastra agent stream
│       └── components/
│           ├── FileUpload.tsx
│           ├── ChatWindow.tsx
│           ├── ReconciliationTable.tsx
│           └── AnomalyBadge.tsx
│
├── packages/
│   ├── agent/                        # Mastra agent 定义
│   │   ├── src/
│   │   │   ├── index.ts              # Agent 入口
│   │   │   ├── prompts/
│   │   │   │   └── system.ts         # NZ/AU 会计 system prompt
│   │   │   └── tools/                # Skills
│   │   │       ├── parse-bank-csv.ts
│   │   │       ├── parse-xero-gl.ts
│   │   │       ├── reconcile.ts
│   │   │       ├── flag-anomalies.ts
│   │   │       ├── calculate-gst.ts
│   │   │       └── generate-pnl.ts
│   │   └── package.json
│   │
│   └── db/                           # Supabase schema
│       ├── schema.sql
│       └── src/
│           ├── clients.ts
│           ├── documents.ts
│           └── audit-log.ts
│
├── data/
│   └── sample/                       # 已准备好的测试数据
│       ├── bank-statement-Q1-2026.csv
│       ├── xero-general-ledger-Q1-2026.csv
│       └── README.md
│
├── package.json                      # monorepo root
└── turbo.json
```

---

## 数据库 Schema（Supabase）

```sql
-- 客户（一个事务所有多个客户）
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL,              -- 事务所 ID
  name TEXT NOT NULL,                 -- "Harbourside Plumbing Ltd"
  ird_number TEXT,                    -- NZ IRD
  abn TEXT,                          -- AU ABN
  gst_registered BOOLEAN DEFAULT true,
  gst_rate DECIMAL DEFAULT 0.15,     -- NZ 15%
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 上传的文件
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  filename TEXT NOT NULL,
  file_type TEXT,                    -- 'bank_statement' | 'xero_gl' | 'xero_export'
  period_start DATE,
  period_end DATE,
  storage_path TEXT,                 -- Supabase Storage path
  processed BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 解析出来的交易
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  document_id UUID REFERENCES documents(id),
  source TEXT NOT NULL,              -- 'bank' | 'xero'
  date DATE NOT NULL,
  description TEXT,
  amount DECIMAL NOT NULL,
  reference TEXT,
  account_code TEXT,
  account_name TEXT,
  gst_amount DECIMAL,
  -- reconciliation
  matched_to UUID REFERENCES transactions(id),
  match_status TEXT DEFAULT 'unmatched', -- 'matched' | 'unmatched' | 'partial'
  match_confidence DECIMAL
);

-- 审计日志（不可删除）
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  user_id TEXT,
  action TEXT NOT NULL,              -- 'upload' | 'query' | 'reconcile'
  query TEXT,
  source_doc_ids TEXT[],
  response_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 对话历史
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  role TEXT NOT NULL,                -- 'user' | 'assistant'
  content TEXT NOT NULL,
  tool_calls JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security（数据隔离核心）
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 只能看自己 firm 的数据
CREATE POLICY "firm_isolation" ON clients
  USING (firm_id = current_setting('app.firm_id')::UUID);
```

---

## Mastra Agent 实现

### System Prompt
```typescript
// packages/agent/src/prompts/system.ts
export const ACCOUNTING_SYSTEM_PROMPT = `
You are an expert accounting assistant for New Zealand and Australian firms.

JURISDICTION:
- New Zealand: GST 15%, IRD tax authority, ACC levies, NZD
- Australia: GST 10%, ATO tax authority, AUD
- Default to NZ unless user specifies AU

YOUR CAPABILITIES:
- Parse and reconcile bank statements against Xero GL exports
- Identify anomalies: unmatched transactions, amount discrepancies, outstanding invoices
- Calculate GST position (collected vs paid vs net liability)
- Generate P&L summaries and financial ratios
- Answer questions about specific transactions with source citations

RESPONSE STYLE:
- Be precise with numbers. Always state the currency (NZD/AUD).
- When citing a transaction, always include the date, reference, and amount.
- Flag anomalies clearly with ⚠️ prefix.
- If you cannot find data to answer a question, say so explicitly.

EXAMPLE:
User: "What's our GST liability for Q1?"
You: "Based on the uploaded data for Harbourside Plumbing Ltd Q1 2026:
- GST collected (on sales): $X,XXX.XX NZD
- GST paid (on expenses): $X,XXX.XX NZD  
- Net GST payable to IRD: $X,XXX.XX NZD
Source: 9 sales invoices + 12 purchase invoices from xero-general-ledger-Q1-2026.csv"
`.trim();
```

### Agent 定义
```typescript
// packages/agent/src/index.ts
import { Agent } from '@mastra/core';
import { anthropic } from '@ai-sdk/anthropic';
import { ACCOUNTING_SYSTEM_PROMPT } from './prompts/system';
import {
  parseBankCsvTool,
  parseXeroGLTool,
  reconcileTool,
  flagAnomaliesTool,
  calculateGSTTool,
  generatePnLTool,
} from './tools';

export const accountingAgent = new Agent({
  name: 'AccountingAssistant',
  instructions: ACCOUNTING_SYSTEM_PROMPT,
  model: anthropic('claude-sonnet-4-5'),
  tools: {
    parseBankCsv: parseBankCsvTool,
    parseXeroGL: parseXeroGLTool,
    reconcile: reconcileTool,
    flagAnomalies: flagAnomaliesTool,
    calculateGST: calculateGSTTool,
    generatePnL: generatePnLTool,
  },
});
```

### Tool 示例：parseBankCsv
```typescript
// packages/agent/src/tools/parse-bank-csv.ts
import { createTool } from '@mastra/core';
import { z } from 'zod';
import Papa from 'papaparse';

export const parseBankCsvTool = createTool({
  id: 'parse-bank-csv',
  description: `Parse a Westpac/ANZ/ASB bank statement CSV file.
    Returns structured transactions with date, amount, narrative, reference.
    Use this when the user uploads a bank statement.`,

  inputSchema: z.object({
    csvContent: z.string().describe('Raw CSV content of the bank statement'),
    bankFormat: z.enum(['westpac', 'anz', 'asb', 'generic'])
      .default('westpac')
      .describe('Bank format to determine column mapping'),
  }),

  outputSchema: z.object({
    transactions: z.array(z.object({
      date: z.string(),
      amount: z.number(),
      narrative: z.string(),
      reference: z.string().optional(),
      balance: z.number().optional(),
    })),
    summary: z.object({
      count: z.number(),
      totalCredits: z.number(),
      totalDebits: z.number(),
      period: z.object({ from: z.string(), to: z.string() }),
    }),
  }),

  execute: async ({ csvContent, bankFormat }) => {
    const COLUMN_MAPS = {
      westpac: {
        date: 'Transaction date',      // YYYYMMDD format
        amount: 'Transaction amount',
        narrative: 'Narrative',
        reference: 'Reference',
        balance: 'Closing balance',
      },
      anz: {
        date: 'Date',                  // DD/MM/YYYY format
        amount: 'Amount',
        narrative: 'Details',
        reference: 'Reference',
        balance: 'Balance',
      },
      generic: {
        date: 'Date', amount: 'Amount',
        narrative: 'Description', reference: 'Reference',
      },
    };

    const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    const cols = COLUMN_MAPS[bankFormat];
    const transactions = parsed.data.map((row: any) => ({
      date: normalizeDate(row[cols.date], bankFormat),
      amount: parseFloat(row[cols.amount]) || 0,
      narrative: row[cols.narrative] || '',
      reference: row[cols.reference] || '',
      balance: parseFloat(row[cols.balance]) || undefined,
    }));

    const credits = transactions.filter(t => t.amount > 0);
    const debits = transactions.filter(t => t.amount < 0);
    const dates = transactions.map(t => t.date).sort();

    return {
      transactions,
      summary: {
        count: transactions.length,
        totalCredits: credits.reduce((s, t) => s + t.amount, 0),
        totalDebits: Math.abs(debits.reduce((s, t) => s + t.amount, 0)),
        period: { from: dates[0], to: dates[dates.length - 1] },
      },
    };
  },
});
```

### Tool 示例：reconcile
```typescript
// packages/agent/src/tools/reconcile.ts
import { createTool } from '@mastra/core';
import { z } from 'zod';

export const reconcileTool = createTool({
  id: 'reconcile-accounts',
  description: `Match bank transactions against Xero GL entries.
    Uses reference numbers (REF001, etc.) to find matches.
    Returns matched pairs + unmatched items on both sides.
    ALWAYS run this after parsing both bank and GL files.`,

  inputSchema: z.object({
    bankTransactions: z.array(z.object({
      date: z.string(),
      amount: z.number(),
      narrative: z.string(),
      reference: z.string(),
    })),
    glTransactions: z.array(z.object({
      date: z.string(),
      reference: z.string(),
      description: z.string(),
      debit: z.number().optional(),
      credit: z.number().optional(),
      accountCode: z.string(),
    })),
  }),

  execute: async ({ bankTransactions, glTransactions }) => {
    const matched = [];
    const unmatchedBank = [];
    const unmatchedGL = [];
    const usedGL = new Set<string>();

    for (const bankTx of bankTransactions) {
      // 1. Try exact reference match
      const refMatch = glTransactions.find(gl =>
        gl.reference === bankTx.reference && !usedGL.has(gl.reference)
      );

      if (refMatch) {
        const glAmount = (refMatch.credit || 0) - (refMatch.debit || 0);
        const diff = Math.abs(bankTx.amount - glAmount);
        matched.push({
          bank: bankTx,
          gl: refMatch,
          status: diff < 0.01 ? 'exact' : 'amount_mismatch',
          difference: diff,
        });
        usedGL.add(refMatch.reference);
      } else {
        unmatchedBank.push(bankTx);
      }
    }

    for (const gl of glTransactions) {
      if (!usedGL.has(gl.reference)) {
        unmatchedGL.push(gl);
      }
    }

    return {
      matched,
      unmatchedBank,   // In bank but not in GL
      unmatchedGL,     // In GL but not in bank (e.g. unpaid invoices)
      summary: {
        totalMatched: matched.length,
        exactMatches: matched.filter(m => m.status === 'exact').length,
        amountMismatches: matched.filter(m => m.status === 'amount_mismatch').length,
        unmatchedBankCount: unmatchedBank.length,
        unmatchedGLCount: unmatchedGL.length,
      },
    };
  },
});
```

### Tool 示例：calculateGST
```typescript
// packages/agent/src/tools/calculate-gst.ts
import { createTool } from '@mastra/core';
import { z } from 'zod';

export const calculateGSTTool = createTool({
  id: 'calculate-gst',
  description: `Calculate GST position from Xero GL transactions.
    NZ GST = 15%, AU GST = 10%.
    Returns GST collected, GST paid, and net liability to IRD/ATO.`,

  inputSchema: z.object({
    glTransactions: z.array(z.any()),
    jurisdiction: z.enum(['NZ', 'AU']).default('NZ'),
    period: z.object({
      from: z.string(),
      to: z.string(),
    }).optional(),
  }),

  execute: async ({ glTransactions, jurisdiction }) => {
    const gstRate = jurisdiction === 'NZ' ? 0.15 : 0.10;

    const gstOnIncome = glTransactions
      .filter(t => t.taxRate === 'GST on Income' && t.credit)
      .reduce((sum, t) => sum + (parseFloat(t.taxAmount) || 0), 0);

    const gstOnExpenses = glTransactions
      .filter(t => t.taxRate === 'GST on Expenses' && t.debit)
      .reduce((sum, t) => sum + (parseFloat(t.taxAmount) || 0), 0);

    const netLiability = gstOnIncome - gstOnExpenses;

    return {
      gstCollected: gstOnIncome,
      gstPaid: gstOnExpenses,
      netLiability,
      payableOrRefund: netLiability > 0 ? 'payable' : 'refund',
      jurisdiction,
      gstRate,
    };
  },
});
```

---

## MCP 集成

```typescript
// packages/agent/src/mcp.ts
import { MCPClient } from '@mastra/mcp';

// 文件系统 MCP（读上传文件）
export const filesystemMCP = new MCPClient({
  servers: {
    filesystem: {
      command: 'npx',
      args: [
        '-y',
        '@modelcontextprotocol/server-filesystem',
        '/tmp/accounting-ai-uploads',  // 上传文件临时目录
      ],
    },
  },
});

// 用法：agent 可以直接 read_file 读上传的 CSV
```

---

## API Routes（Next.js）

### 文件上传
```typescript
// apps/web/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const clientId = formData.get('clientId') as string;
  const fileType = formData.get('fileType') as string; // 'bank_statement' | 'xero_gl'

  const supabase = createClient();

  // 1. 上传到 Supabase Storage（client-scoped path）
  const path = `${clientId}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('accounting-docs')
    .upload(path, file);

  if (error) return NextResponse.json({ error }, { status: 500 });

  // 2. 记录到 documents 表
  await supabase.from('documents').insert({
    client_id: clientId,
    filename: file.name,
    file_type: fileType,
    storage_path: path,
    processed: false,
  });

  return NextResponse.json({ path, success: true });
}
```

### Chat Stream
```typescript
// apps/web/app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { accountingAgent } from '@accounting-ai/agent';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const { messages, clientId } = await req.json();

  // 审计日志
  await logAudit({ clientId, query: messages.at(-1)?.content });

  // Stream response
  const stream = await accountingAgent.stream(messages, {
    resourceId: clientId,     // Mastra memory scope（per-client 隔离）
    threadId: clientId,
  });

  return stream.toDataStreamResponse();
}
```

---

## Phase 0 — 骨架（Day 1-2）

### Day 1：初始化
```bash
# 1. 创建 monorepo
cd ~/Code
npx create-turbo@latest accounting-ai
cd accounting-ai

# 2. 安装 Mastra
npm install @mastra/core @mastra/mcp
npm install @ai-sdk/anthropic ai

# 3. 安装工具库
npm install papaparse zod
npm install @types/papaparse -D

# 4. Next.js 前端
npm install -w apps/web shadcn-ui
npx shadcn@latest init  # 在 apps/web 里

# 5. Supabase
npm install @supabase/supabase-js
```

**任务列表：**
```
□ 初始化 monorepo（Turbo）
□ packages/agent/src/index.ts — Agent 定义
□ packages/agent/src/prompts/system.ts — System prompt
□ apps/web/app/page.tsx — 上传页面（简单）
□ apps/web/app/chat/[clientId]/page.tsx — 聊天界面
□ apps/web/components/ChatWindow.tsx — 使用 Vercel AI SDK useChat
□ Supabase 项目创建 + schema.sql 执行
□ .env 配置（ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY）
```

### Day 2：连通
```
□ apps/web/app/api/upload/route.ts — 文件上传 API
□ apps/web/app/api/chat/route.ts — Chat stream API
□ FileUpload.tsx 组件（拖放 + 文件类型检测）
□ 端到端测试：上传 sample CSV → 问 "这个公司叫什么？"
□ 部署 Vercel staging
```

**完成标准：** 能上传文件，能对话，回答基于文件内容

---

## Phase 1 — 核心功能（Day 3-7）

### Day 3：解析工具
```
□ parseBankCsvTool（Westpac 格式，见上方代码）
□ parseXeroGLTool（Xero GL 格式）
□ 测试：上传 bank-statement-Q1-2026.csv → 解析出44笔交易
□ 测试：上传 xero-general-ledger-Q1-2026.csv → 解析出72行
```

### Day 4：Reconciliation
```
□ reconcileTool（见上方代码）
□ 测试：两个文件同时上传 → AI 自动运行 reconcile
□ 验收：必须发现 REF001 金额差异（$12,500 vs $13,586.96）
□ 验收：必须发现 INV-2026-004 未收款（D Morrison）
```

### Day 5：会计功能
```
□ flagAnomaliesTool — 封装4类异常检测
□ calculateGSTTool — NZ 15% GST 计算
□ generatePnLTool — Revenue / Expenses / Net Profit
□ 测试：问 "Q1 GST liability 是多少？" → 正确计算
□ 测试：问 "有哪些异常？" → 列出4个故意埋的问题
```

### Day 6：数据隔离 + 审计
```
□ Supabase RLS 策略启用
□ 每次 query 写入 audit_log 表
□ 测试：两个客户同时存在，A 的数据不出现在 B 的查询里
□ 客户选择界面（简单 dropdown）
```

### Day 7：Polish + Demo
```
□ ReconciliationTable.tsx — 可视化 matched/unmatched
□ AnomalyBadge.tsx — ⚠️ 异常高亮
□ 上传进度显示
□ 完整流程测试（Harbourside scenario 端到端）
□ Demo video / screenshot
```

**Phase 1 完成标准（验收 checklist）：**
```
✓ 上传两个 CSV，30秒内自动 reconcile
✓ 发现全部4个故意埋的异常（REF001, D Morrison, REF011, GST验证）
✓ 问"Q1 收入多少" → 正确数字 + 引用来源发票
✓ 问"GST liability" → 正确计算（NZ 15%）
✓ 两个不同客户数据完全隔离
✓ 每次操作有审计日志
```

---

## Phase 2 — 会计专用（Week 3+）

```
□ Working Paper 输出（Word/PDF，带来源 hyperlink）
□ Variance analysis（同比，需要两期数据）
□ IRD 规则 RAG（爬取 ird.govt.nz，向量化，实时查询）
□ Journal entry 建议（AI 猜科目编码）
□ Partner 仪表板（多客户健康状态）
□ 支持 AU（GST 10%，ATO 规则）
□ MYOB 导出格式支持
```

---

## Phase 3 — 可卖（Month 2+）

```
□ 多租户注册（事务所 onboarding）
□ Xero API 直连（OAuth 2.0，sandbox 先）
□ Stripe 订阅（$150-200 NZD/客户/年）
□ 白标（logo/域名/主题色）
□ 安全认证（SOC2 等效，约 $20-50K AUD）
□ 销售给 Speaker 1 的事务所网络
```

---

## 环境变量

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # 仅服务端
```

---

## 关键参考

| 资源 | 链接 |
|------|------|
| Mastra Docs | https://mastra.ai/docs |
| Mastra Tools | https://mastra.ai/docs/agents/using-tools |
| Mastra MCP | https://mastra.ai/docs/agents/mcp-guide |
| Mastra Memory | https://mastra.ai/docs/memory/overview |
| Westpac CSV 格式 | https://bankrec.westpac.com.au/docs/statements/extended-csv |
| 样本数据 | `WIP/accounting-ai/data/sample/` |
| 白皮书（隐私合规） | `WIP/privacy_whitepaper/privacy-compliant-ai-agent-development-whitepaper.md` |
| 竞品（Zato） | 通话记录，$350/yr/套账 |

---

## 开始命令

```bash
cd /Users/mingfang/.openclaw/workspace/WIP/accounting-ai
npx create-turbo@latest .
# 然后按 PLAN.md Phase 0 Day 1 执行
```
