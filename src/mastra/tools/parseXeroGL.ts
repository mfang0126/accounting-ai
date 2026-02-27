import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export interface GLEntry {
  date: string;
  source: string;
  journalNo: string;
  reference: string;
  description: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  net: number;
  taxRate: string;
  taxAmount: number;
}

export const parseXeroGL = createTool({
  id: 'parseXeroGL',
  description: 'Parse a Xero General Ledger CSV export and return structured journal entries',
  inputSchema: z.object({
    csvContent: z.string().describe('Raw CSV content of the Xero GL export'),
  }),
  outputSchema: z.object({
    entries: z.array(z.object({
      date: z.string(),
      source: z.string(),
      journalNo: z.string(),
      reference: z.string(),
      description: z.string(),
      accountCode: z.string(),
      accountName: z.string(),
      debit: z.number(),
      credit: z.number(),
      net: z.number(),
      taxRate: z.string(),
      taxAmount: z.number(),
    })),
    summary: z.object({
      totalDebits: z.number(),
      totalCredits: z.number(),
      entryCount: z.number(),
      accountsSeen: z.array(z.string()),
    }),
  }),
  execute: async ({ csvContent }) => {
    const lines = csvContent.trim().split('\n');
    const entries: GLEntry[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = parseCSVLine(line);
      if (cols.length < 12) continue;

      const [date, source, journalNo, reference, description, accountCode, accountName, debit, credit, net, taxRate, taxAmount] = cols;

      entries.push({
        date: date.trim(),
        source: source.trim(),
        journalNo: journalNo.trim(),
        reference: reference.trim(),
        description: description.trim(),
        accountCode: accountCode.trim(),
        accountName: accountName.trim(),
        debit: parseFloat(debit) || 0,
        credit: parseFloat(credit) || 0,
        net: parseFloat(net) || 0,
        taxRate: taxRate.trim(),
        taxAmount: parseFloat(taxAmount) || 0,
      });
    }

    const totalDebits = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredits = entries.reduce((sum, e) => sum + e.credit, 0);
    const accountsSeen = [...new Set(entries.map(e => `${e.accountCode} ${e.accountName}`))];

    return {
      entries,
      summary: {
        totalDebits: Math.round(totalDebits * 100) / 100,
        totalCredits: Math.round(totalCredits * 100) / 100,
        entryCount: entries.length,
        accountsSeen,
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
