import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export interface BankTransaction {
  date: string;
  accountNumber: string;
  accountName: string;
  currency: string;
  closingBalance: number;
  amount: number;
  code: string;
  narrative: string;
  reference: string;
}

export const parseBankStatement = createTool({
  id: 'parseBankStatement',
  description: 'Parse a Westpac NZ CSV bank statement and return structured transactions',
  inputSchema: z.object({
    csvContent: z.string().describe('Raw CSV content of the bank statement'),
  }),
  outputSchema: z.object({
    transactions: z.array(z.object({
      date: z.string(),
      accountNumber: z.string(),
      accountName: z.string(),
      currency: z.string(),
      closingBalance: z.number(),
      amount: z.number(),
      code: z.string(),
      narrative: z.string(),
      reference: z.string(),
    })),
    summary: z.object({
      totalCredits: z.number(),
      totalDebits: z.number(),
      transactionCount: z.number(),
    }),
  }),
  execute: async ({ csvContent }) => {
    const lines = csvContent.trim().split('\n');
    const transactions: BankTransaction[] = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quoted fields
      const cols = parseCSVLine(line);
      if (cols.length < 9) continue;

      const [date, accountNumber, accountName, currency, closingBalance, amount, code, narrative, reference] = cols;

      transactions.push({
        date: formatDate(date.trim()),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        currency: currency.trim(),
        closingBalance: parseFloat(closingBalance) || 0,
        amount: parseFloat(amount) || 0,
        code: code.trim(),
        narrative: narrative.trim(),
        reference: reference.trim(),
      });
    }

    const totalCredits = transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDebits = transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      transactions,
      summary: {
        totalCredits: Math.round(totalCredits * 100) / 100,
        totalDebits: Math.round(totalDebits * 100) / 100,
        transactionCount: transactions.length,
      },
    };
  },
});

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function formatDate(raw: string): string {
  // Westpac format: YYYYMMDD → YYYY-MM-DD
  if (raw.length === 8 && /^\d+$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw;
}
