import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { GLEntry } from './parseXeroGL.js';

const TransactionSchema = z.object({
  date: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
  currency: z.string(),
  closingBalance: z.number(),
  amount: z.number(),
  code: z.string(),
  narrative: z.string(),
  reference: z.string(),
});

const GLEntrySchema = z.object({
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
});

export const reconcileAccounts = createTool({
  id: 'reconcileAccounts',
  description: 'Reconcile bank statement transactions against Xero GL entries. Finds matches, flags unmatched items, and identifies amount discrepancies.',
  inputSchema: z.object({
    bankTransactions: z.array(TransactionSchema),
    glEntries: z.array(GLEntrySchema),
  }),
  outputSchema: z.object({
    matched: z.array(z.object({
      bankRef: z.string(),
      glRef: z.string(),
      amount: z.number(),
      date: z.string(),
      description: z.string(),
    })),
    anomalies: z.array(z.object({
      type: z.enum(['AMOUNT_MISMATCH', 'BANK_ONLY', 'GL_ONLY', 'PARTIAL_PAYMENT']),
      severity: z.enum(['HIGH', 'MEDIUM', 'LOW']),
      description: z.string(),
      bankRef: z.string().optional(),
      glRef: z.string().optional(),
      bankAmount: z.number().optional(),
      glAmount: z.number().optional(),
      difference: z.number().optional(),
    })),
    summary: z.object({
      matchedCount: z.number(),
      anomalyCount: z.number(),
      unmatchedBankCount: z.number(),
      unmatchedGLCount: z.number(),
    }),
  }),
  execute: async ({ bankTransactions, glEntries }) => {
    const matched = [];
    const anomalies = [];
    const matchedBankRefs = new Set<string>();
    const matchedGLRefs = new Set<string>();

    // Match by reference
    for (const bank of bankTransactions) {
      const ref = bank.reference.trim();
      if (!ref) continue;

      // Find GL entries with same reference
      const glMatches = glEntries.filter(gl =>
        gl.reference.trim() === ref ||
        gl.description.includes(ref)
      );

      if (glMatches.length === 0) continue;

      // Calculate GL net amount for this reference
      const glNet = glMatches.reduce((sum, gl) => sum + gl.net, 0);
      const glRounded = Math.round(glNet * 100) / 100;
      const bankRounded = Math.round(bank.amount * 100) / 100;

      if (Math.abs(glRounded - bankRounded) < 0.01) {
        // Perfect match
        matched.push({
          bankRef: ref,
          glRef: glMatches[0].reference,
          amount: bankRounded,
          date: bank.date,
          description: bank.narrative,
        });
        matchedBankRefs.add(ref);
        glMatches.forEach(gl => matchedGLRefs.add(gl.journalNo));
      } else {
        // Amount mismatch
        const diff = Math.round((bankRounded - glRounded) * 100) / 100;
        const isPartial = Math.abs(diff) > 100; // likely partial payment if large diff

        anomalies.push({
          type: isPartial ? 'PARTIAL_PAYMENT' as const : 'AMOUNT_MISMATCH' as const,
          severity: Math.abs(diff) > 500 ? 'HIGH' as const : 'MEDIUM' as const,
          description: isPartial
            ? `Partial payment: Bank received ${bankRounded} but GL shows ${glRounded} (difference: ${diff})`
            : `Amount mismatch on ref ${ref}: Bank ${bankRounded} vs GL ${glRounded} (difference: ${diff})`,
          bankRef: ref,
          glRef: glMatches[0].reference,
          bankAmount: bankRounded,
          glAmount: glRounded,
          difference: diff,
        });
        matchedBankRefs.add(ref);
        glMatches.forEach(gl => matchedGLRefs.add(gl.journalNo));
      }
    }

    // Find unmatched bank transactions
    for (const bank of bankTransactions) {
      const ref = bank.reference.trim();
      if (!matchedBankRefs.has(ref) && ref) {
        anomalies.push({
          type: 'BANK_ONLY' as const,
          severity: Math.abs(bank.amount) > 1000 ? 'HIGH' as const : 'LOW' as const,
          description: `Bank transaction with no GL entry: ${bank.narrative} (${bank.amount}) on ${bank.date}`,
          bankRef: ref,
          bankAmount: bank.amount,
        });
      }
    }

    // Find unmatched GL entries (invoices with no bank receipt)
    const glByRef = new Map<string, GLEntry[]>();
    for (const gl of glEntries) {
      const ref = gl.reference.trim();
      if (!glByRef.has(ref)) glByRef.set(ref, []);
      glByRef.get(ref)!.push(gl);
    }

    for (const [ref, entries] of glByRef) {
      if (!ref || matchedGLRefs.has(entries[0].journalNo)) continue;
      const isReceivable = entries.some(e => e.accountCode === '200');
      if (isReceivable) {
        const glAmount = entries.reduce((sum, e) => sum + e.net, 0);
        anomalies.push({
          type: 'GL_ONLY' as const,
          severity: Math.abs(glAmount) > 1000 ? 'HIGH' as const : 'MEDIUM' as const,
          description: `Invoice in GL with no bank receipt: ${entries[0].description} (${Math.round(glAmount * 100) / 100}) — possibly overdue`,
          glRef: ref,
          glAmount: Math.round(glAmount * 100) / 100,
        });
      }
    }

    return {
      matched,
      anomalies,
      summary: {
        matchedCount: matched.length,
        anomalyCount: anomalies.length,
        unmatchedBankCount: anomalies.filter(a => a.type === 'BANK_ONLY').length,
        unmatchedGLCount: anomalies.filter(a => a.type === 'GL_ONLY').length,
      },
    };
  },
});
