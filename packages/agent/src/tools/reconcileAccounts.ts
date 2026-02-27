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

// Bug 2 fix: compute net from debit/credit when net column is empty
function getEffectiveNet(gl: GLEntry): number {
  if (gl.net !== 0) return gl.net;
  if (gl.debit !== 0) return gl.debit;
  if (gl.credit !== 0) return gl.credit;
  return 0;
}

// Bug 1 fix: compute GL "bank-facing" amount per source type
// INV  → use Account 200 (Trade Debtors) net = gross receivable incl GST
// BILL → sum all debit entries = total bank payment (expense + GST debits)
// PAY  → sum all debit entries = payroll amount paid
// TAX  → sum all debit entries = tax payment amount
function getGLBankAmount(glMatches: GLEntry[]): number {
  if (glMatches.length === 0) return 0;
  const source = glMatches[0].source;

  if (source === 'INV') {
    // Only look at Trade Debtors (200) — this is what the bank actually receives
    const debtorEntries = glMatches.filter(gl => gl.accountCode === '200');
    if (debtorEntries.length > 0) {
      return debtorEntries.reduce((sum, gl) => sum + getEffectiveNet(gl), 0);
    }
    // Fallback: sum nets
    return glMatches.reduce((sum, gl) => sum + getEffectiveNet(gl), 0);
  }

  // BILL: sum debits (expense + 820 GST). If no 820 entry, add implied GST from taxAmount field.
  if (source === 'BILL') {
    const has820 = glMatches.some(gl => gl.accountCode === '820');
    const totalDebits = glMatches.reduce((sum, gl) => sum + gl.debit, 0);
    if (!has820) {
      const impliedGST = glMatches
        .filter(gl => gl.accountCode !== '820')
        .reduce((sum, gl) => sum + gl.taxAmount, 0);
      return totalDebits + impliedGST;
    }
    return totalDebits;
  }

  // PAY / TAX: sum all debit amounts = total cash out
  const totalDebits = glMatches.reduce((sum, gl) => sum + gl.debit, 0);
  if (totalDebits > 0) return totalDebits;

  // Fallback: net
  return glMatches.reduce((sum, gl) => sum + getEffectiveNet(gl), 0);
}

// Bug 3 fix: handle sign — bank income is positive, bank expense is negative
// GL amounts are always positive; we compare absolute values and check direction
function compareAmounts(bankAmount: number, glAmount: number): { matches: boolean; diff: number } {
  // Bug 3: normalise signs — bank payment (negative) matches GL debit (positive)
  const bankAbs = Math.abs(bankAmount);
  const glAbs = Math.abs(glAmount);
  const diff = Math.round((bankAbs - glAbs) * 100) / 100;
  return { matches: Math.abs(diff) < 0.01, diff };
}

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
      type: z.enum(['AMOUNT_MISMATCH', 'BANK_ONLY', 'GL_ONLY', 'PARTIAL_PAYMENT', 'GST_VERIFICATION']),
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
    const matchedGLJournalNos = new Set<string>();

    // Index GL entries by reference
    const glByRef = new Map<string, GLEntry[]>();
    for (const gl of glEntries) {
      const ref = gl.reference.trim();
      if (!ref) continue;
      if (!glByRef.has(ref)) glByRef.set(ref, []);
      glByRef.get(ref)!.push(gl);
    }

    // Match bank transactions against GL
    for (const bank of bankTransactions) {
      const ref = bank.reference.trim();
      if (!ref) continue;

      const glMatches = glByRef.get(ref) || [];
      if (glMatches.length === 0) continue;

      const glAmount = getGLBankAmount(glMatches);
      const { matches, diff } = compareAmounts(bank.amount, glAmount);

      if (matches) {
        // Special case: GST payment — mark for verification even if amounts match
        const isGSTPayment = glMatches.some(gl => gl.source === 'TAX' || gl.accountCode === '820');
        if (isGSTPayment) {
          anomalies.push({
            type: 'GST_VERIFICATION' as const,
            severity: 'MEDIUM' as const,
            description: `GST payment ${ref} amount matches ($${Math.abs(bank.amount).toFixed(2)}) — verify GST liability calculation against actual GST collected/paid for the period`,
            bankRef: ref,
            glRef: glMatches[0].reference,
            bankAmount: bank.amount,
            glAmount,
          });
        } else {
          matched.push({
            bankRef: ref,
            glRef: glMatches[0].reference,
            amount: Math.abs(bank.amount),
            date: bank.date,
            description: bank.narrative,
          });
        }
      } else {
        // Amount mismatch — INV source can be PARTIAL_PAYMENT; PAY/BILL = AMOUNT_MISMATCH
        const absDiff = Math.abs(diff);
        const isSrcINV = glMatches[0]?.source === 'INV';
        const isPartial = isSrcINV && absDiff > 100;
        anomalies.push({
          type: isPartial ? 'PARTIAL_PAYMENT' as const : 'AMOUNT_MISMATCH' as const,
          severity: absDiff > 500 ? 'HIGH' as const : 'MEDIUM' as const,
          description: isPartial
            ? `Partial payment on ${ref}: Bank received $${Math.abs(bank.amount).toFixed(2)} but GL shows $${glAmount.toFixed(2)} — $${absDiff.toFixed(2)} still outstanding`
            : `Amount mismatch on ${ref}: Bank $${Math.abs(bank.amount).toFixed(2)} vs GL $${glAmount.toFixed(2)} (diff $${absDiff.toFixed(2)})`,
          bankRef: ref,
          glRef: glMatches[0].reference,
          bankAmount: bank.amount,
          glAmount,
          difference: diff,
        });
      }

      matchedBankRefs.add(ref);
      glMatches.forEach(gl => matchedGLJournalNos.add(gl.journalNo));
    }

    // Unmatched bank transactions (no GL entry found)
    for (const bank of bankTransactions) {
      const ref = bank.reference.trim();
      if (!matchedBankRefs.has(ref) && ref) {
        anomalies.push({
          type: 'BANK_ONLY' as const,
          severity: Math.abs(bank.amount) > 1000 ? 'HIGH' as const : 'LOW' as const,
          description: `Bank transaction with no GL entry: ${bank.narrative} ($${bank.amount}) on ${bank.date}`,
          bankRef: ref,
          bankAmount: bank.amount,
        });
      }
    }

    // Unmatched GL entries — invoices with no bank receipt (overdue receivables)
    for (const [ref, entries] of glByRef) {
      if (!ref) continue;
      // Skip if any entry from this ref was already matched
      if (entries.some(e => matchedGLJournalNos.has(e.journalNo))) continue;

      const isReceivable = entries.some(e => e.accountCode === '200');
      if (isReceivable) {
        const glAmount = entries
          .filter(e => e.accountCode === '200')
          .reduce((sum, e) => sum + getEffectiveNet(e), 0);
        anomalies.push({
          type: 'GL_ONLY' as const,
          severity: Math.abs(glAmount) > 1000 ? 'HIGH' as const : 'MEDIUM' as const,
          description: `Invoice in GL with no bank receipt: ${entries[0].description} — $${Math.round(glAmount * 100) / 100} possibly overdue`,
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
