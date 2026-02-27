---
name: anomaly-investigation
description: Investigate each reconciliation anomaly — classify type, determine severity, provide accounting judgment and recommended action
version: 1.0.0
tags:
  - accounting
  - anomaly
  - investigation
  - j2
---

# Anomaly Investigation (J2)

You are investigating anomalies found during bank reconciliation. For each anomaly, you must determine what happened, how serious it is, and what the partner should do about it.

## Prerequisites

This skill requires completed J1 (bank reconciliation) output. You need:
- The `anomalies` array from the reconcile tool
- Access to the original GL entries and bank transactions for context

## Anomaly Categories

Classify each anomaly into exactly one category:

### PARTIAL_PAYMENT
- **What:** Customer paid less than the invoice amount
- **Detection:** Bank receipt amount < GL Trade Debtors (account 200) credit amount
- **Example:** Invoice $13,586.96, bank received $12,500.00 → $1,086.96 outstanding
- **Typical action:** Follow up with customer, check if credit note was issued

### MISSING_RECEIPT
- **What:** Invoice exists in GL but no corresponding bank deposit
- **Detection:** GL has invoice lines (account 200 + 100) with a reference, bank has no transaction with that reference
- **Example:** INV-2026-004 for D Morrison $6,413.04 — no bank receipt at all
- **Typical action:** Check if payment is pending, send reminder, consider doubtful debt provision if overdue > 60 days

### AMOUNT_MISMATCH
- **What:** Bank and GL amounts don't match for a non-invoice transaction
- **Detection:** For payroll (account 477) or other expenses, `Math.abs(bank.amount)` != `gl.debit`
- **Example:** Payroll bank $3,800 vs GL $3,478.26 → difference $321.74
- **Typical action:** Check if difference is PAYE/KiwiSaver deduction coding, review payroll details

### GST_VERIFICATION
- **What:** GST payment to IRD — amounts match but need to verify against calculated liability
- **Detection:** Transaction description contains "GST Payment" or "IRD", account 820
- **Example:** GST Payment $3,200 — is this the right amount based on actual GST collected vs paid?
- **Typical action:** Cross-reference with J3 GST calculation

### FALSE_POSITIVE
- **What:** Appears anomalous but is actually correct
- **Detection:** Bank amount = GL debit + GST amount (inclusive amount matches)
- **Example:** Bank $2,700 = GL $2,347.83 + GST $352.17 ✓
- **Typical action:** No action needed, mark as verified

## Severity Rules

| Severity | Criteria |
|----------|----------|
| **HIGH** | Amount > $1,000 OR overdue > 60 days OR payroll error |
| **MEDIUM** | Amount $100-$1,000 OR overdue 30-60 days |
| **LOW** | Amount < $100 OR timing difference < 30 days |

Payroll errors are always at least MEDIUM because they affect employee relations and tax compliance.

## Output Format

For each anomaly, present:

```
⚠️ [HIGH] REF001 — 部分付款
类型：PARTIAL_PAYMENT
发票金额：$13,586.96（INV-2025-118, Renovate NZ Ltd）
银行收款：$12,500.00（2026-01-03）
差额：$1,086.96
建议：跟进 Renovate NZ Ltd 催收剩余 $1,086.96。发票日期 2025 年，已超过 30 天。
来源：bank row 2 / GL row 2
```

## Language Rules

- Always say "建议" (suggest), never "应该" (should) — the partner makes decisions
- When recommending doubtful debt provision, say "建议考虑" (suggest considering)
- For payroll discrepancies, always recommend checking with payroll provider before assuming error
- Be specific about amounts and dates — never say "a large amount", always give the exact number

## Overdue Calculation

Calculate days overdue from invoice date to period end (31 March 2026):
- Invoice date is in the GL entry's Date column
- If no bank receipt exists, days overdue = period end - invoice date
- If partial payment exists, note the date of partial payment

## References

See `references/nz-overdue-rules.md` for NZ standard payment terms and debt collection practices.
