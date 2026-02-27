import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Resolve DATA_DIR relative to the monorepo root (3 levels up from this file)
// Fallback to env variable if set
const __dirname = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const DATA_DIR = process.env.ACCOUNTING_DATA_DIR || resolve(MONOREPO_ROOT, 'data');

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
