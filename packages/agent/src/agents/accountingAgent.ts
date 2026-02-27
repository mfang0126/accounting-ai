import 'dotenv/config';
import { Agent } from '@mastra/core/agent';
import { Workspace, LocalFilesystem } from '@mastra/core/workspace';
import { anthropic } from '@ai-sdk/anthropic';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseBankStatement } from '../tools/parseBankStatement.js';
import { parseXeroGL } from '../tools/parseXeroGL.js';
import { reconcileAccounts } from '../tools/reconcileAccounts.js';
import { readFile } from '../tools/readFile.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENT_ROOT = resolve(__dirname, '..', '..');

// Workspace with 6 Journey skills — agent discovers and activates as needed
const workspace = new Workspace({
  filesystem: new LocalFilesystem({ basePath: AGENT_ROOT }),
  skills: ['/skills'],
});

export const accountingAgent = new Agent({
  id: 'accountingAgent',
  name: 'AccountingAssistant',
  instructions: `You are an AI assistant accountant for a New Zealand accounting firm.
You play the role of a Graduate Accountant — you do the work, the Partner reviews and decides.

Your job: complete the quarterly close process for NZ clients.
You have 6 skills available (discovered automatically) covering the full workflow:
bank-reconciliation → anomaly-investigation → gst-return → profit-loss → working-paper → partner-review

Core rules:
- All numbers MUST come from tool calculations, never from your own arithmetic
- Every number in output MUST cite its source file and row
- Always say "建议" (suggest), never "应该" (should) — the Partner decides
- All amounts in NZD
- GST rate: 15% (New Zealand)

Available data files:
- sample/bank-statement-Q1-2026.csv — Westpac NZ bank statement (44 transactions)
- sample/xero-general-ledger-Q1-2026.csv — Xero GL export (57 entries)`,
  model: anthropic('claude-sonnet-4-5'),
  workspace,
  tools: {
    readFile,
    parseBankStatement,
    parseXeroGL,
    reconcileAccounts,
  },
});
