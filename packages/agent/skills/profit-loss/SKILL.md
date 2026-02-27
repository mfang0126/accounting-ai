---
name: profit-loss
description: Generate Profit & Loss statement — summarise revenue and expenses by account code, calculate net profit for the period
version: 1.0.0
tags:
  - accounting
  - pnl
  - financial-statements
  - j4
---

# Profit & Loss Statement (J4)

You are generating a P&L (Income Statement) for a New Zealand business. The P&L summarises revenue earned and expenses incurred during the period, resulting in a net profit or loss.

## Workflow

1. Call `readFile` + `parseXeroGL` to get all GL entries
2. Call `generatePnL` with the GL entries and period
3. Present the P&L to the partner

## Account Classification

Use the GL `accountCode` to classify each entry:

### Revenue (Income)
| Code | Name | GL Column |
|------|------|-----------|
| 100 | Revenue - Plumbing Services | `credit` column (income is credited) |

### Expenses
| Code | Name | GL Column |
|------|------|-----------|
| 449 | Motor Vehicle Expenses | `debit` column |
| 455 | Materials & Supplies | `debit` column |
| 461 | Subcontractors & Licenses | `debit` column |
| 469 | Rent | `debit` column |
| 472 | Tools & Equipment | `debit` column |
| 477 | Wages & Salaries | `debit` column |
| 489 | Insurance | `debit` column |
| 490 | ACC Levies | `debit` column |

### Excluded from P&L
| Code | Name | Why excluded |
|------|------|-------------|
| 200 | Trade Debtors | Balance sheet item (asset), not income/expense |
| 820 | GST Account | Balance sheet item (liability), not income/expense |

## Calculation Rules

1. **Revenue total** = sum of `credit` amounts for account 100 entries (exclude tax amount — use net/pre-tax amount)
2. **Expense total per account** = sum of `debit` amounts for each expense account (exclude tax amount)
3. **Net Profit** = Revenue total - Expenses total

**Important:** Use the pre-GST (net) amounts for P&L, not the GST-inclusive amounts. The `debit` or `credit` column in the GL already represents the net amount for most entries. For entries where `taxRate` is not `No Tax`, the debit/credit IS the net amount (GST is separately recorded in account 820).

## Output Format

```
Harbourside Plumbing Ltd
Profit & Loss Statement
Period: Q1 2026 (1 January — 31 March)

REVENUE
  100 Revenue - Plumbing Services          $XX,XXX.XX
                                           ──────────
Total Revenue                              $XX,XXX.XX

EXPENSES
  449 Motor Vehicle Expenses                $X,XXX.XX
  455 Materials & Supplies                  $X,XXX.XX
  461 Subcontractors & Licenses             $X,XXX.XX
  469 Rent                                  $X,XXX.XX
  472 Tools & Equipment                     $X,XXX.XX
  477 Wages & Salaries                     $XX,XXX.XX
  489 Insurance                             $X,XXX.XX
  490 ACC Levies                            $X,XXX.XX
                                           ──────────
Total Expenses                             $XX,XXX.XX

                                           ══════════
NET PROFIT                                  $X,XXX.XX NZD

来源：xero-general-ledger-Q1-2026.csv
```

## Cross-checks

1. **Revenue cross-check:** Sum of account 100 credits should roughly equal sum of account 200 credits (Trade Debtors = same invoices). Small differences are normal due to credit notes.
2. **Wages cross-check:** Sum of account 477 debits should roughly match bank payroll payments (allowing for PAYE/KiwiSaver differences).
3. **Materiality:** Flag any single expense category that exceeds 30% of revenue — it may need partner attention.

## Presentation Notes

- Sort expenses by account code ascending
- Show each expense category on its own line
- Always show two decimal places for NZD amounts
- If any account has only one transaction, still show the category (don't merge into "Other")
- Include the number of transactions per category in parentheses if helpful: `455 Materials & Supplies (5 transactions)`
