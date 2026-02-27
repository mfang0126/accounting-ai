import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const DATA_DIR = resolve('/Users/mingfang/.openclaw/workspace/WIP/accounting-ai/data');

export const readFile = createTool({
  id: 'readFile',
  description: 'Read a file from the accounting data directory. Available files: sample/bank-statement-Q1-2026.csv, sample/xero-general-ledger-Q1-2026.csv',
  inputSchema: z.object({
    filename: z.string().describe('Relative path within the data directory, e.g. sample/bank-statement-Q1-2026.csv'),
  }),
  outputSchema: z.object({
    content: z.string(),
    filename: z.string(),
  }),
  execute: async ({ filename }) => {
    const safePath = resolve(DATA_DIR, filename);
    if (!safePath.startsWith(DATA_DIR)) {
      throw new Error('Access denied: path outside data directory');
    }
    const content = readFileSync(safePath, 'utf-8');
    return { content, filename };
  },
});
