import 'dotenv/config';
import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const DATA_DIR = resolve('/Users/mingfang/.openclaw/workspace/WIP/accounting-ai/data');

const { text } = await generateText({
  model: openai('gpt-4o-mini'),
  maxSteps: 10,
  tools: {
    readFile: tool({
      description: 'Read a CSV file. Available: sample/bank-statement-Q1-2026.csv, sample/xero-general-ledger-Q1-2026.csv',
      parameters: z.object({
        filename: z.string().describe('Relative path within data directory'),
      }),
      execute: async ({ filename }) => {
        const safePath = resolve(DATA_DIR, filename);
        return readFileSync(safePath, 'utf-8');
      },
    }),
  },
  system: `You are an NZ accounting AI. Read the two CSV files and:
1. List all HIGH-priority anomalies (partial payments, missing receipts, amount mismatches)
2. Flag the D Morrison invoice status
3. Summarise Q1 GST position`,
  prompt: 'Analyse the Harbourside Plumbing Q1 2026 accounts. Read both CSV files first.',
});

console.log(text);
