# Sample Data — Harbourside Plumbing Ltd

## Company Profile
- **Name**: Harbourside Plumbing Ltd
- **Country**: New Zealand
- **IRD Number**: 123-456-789
- **GST Registered**: Yes (15% GST)
- **Bank**: Westpac NZ, BSB 032-001, Account 234567
- **Period**: Q1 2026 (Jan–Mar)
- **Employees**: 2 (Mike Tane, Sarah Chen)

## Files
| File | Format | Description |
|------|--------|-------------|
| `bank-statement-Q1-2026.csv` | Westpac Extended CSV | 44 bank transactions |
| `xero-general-ledger-Q1-2026.csv` | Xero GL Export | 72 journal lines |

## Intentional Discrepancies (for AI to find)
These are real-world errors deliberately embedded:

1. **REF011** — Payroll Sarah Chen Jan W3: Bank = $3,800, GL = $3,478.26 (excl GST base)
   → Bank amount doesn't match GL net. Possible payroll coding error.

2. **REF023** — GST Payment Jan: Bank = $3,200, GL = $3,200
   → Matches, but GST liability calculation needs verification against actual GST collected.

3. **REF021** — Trade Tools NZ: Bank = $2,700, GL = $2,347.83 + $352.17 GST = $2,700 ✓
   → This one is correct (tests AI doesn't false-positive).

4. **Unmatched item** — INV-2025-118 (REF001): Invoice $13,586.96 but bank received $12,500
   → $1,086.96 still outstanding (partial payment). AI should flag this.

5. **Missing transaction** — No bank entry for INV-2026-004 (D Morrison, $6,413.04)
   → Invoice exists in GL/Xero but no corresponding bank receipt. Overdue?

## Chart of Accounts Used
| Code | Name | Type |
|------|------|------|
| 100 | Revenue - Plumbing Services | Income |
| 200 | Trade Debtors | Asset |
| 449 | Motor Vehicle Expenses | Expense |
| 455 | Materials & Supplies | Expense |
| 461 | Subcontractors & Licenses | Expense |
| 469 | Rent | Expense |
| 472 | Tools & Equipment | Expense |
| 477 | Wages & Salaries | Expense |
| 489 | Insurance | Expense |
| 490 | ACC Levies | Expense |
| 820 | GST Account | Liability |

## Expected AI Tasks
1. **Reconcile** bank statement against GL — find matches, flag unmatched
2. **Identify anomalies** — partial payment, missing receipt, amount discrepancy
3. **GST summary** — total GST collected vs paid for Q1
4. **P&L summary** — Revenue, Expenses, Net Profit for Q1
5. **Answer questions** — "Is D Morrison overdue?", "What's our GST liability?", "How much did we spend on materials?"
