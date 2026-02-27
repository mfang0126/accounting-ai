---
name: bank-reconciliation
description: Reconcile bank statement against Xero General Ledger — match transactions by reference, flag unmatched items and amount discrepancies
version: 1.0.0
tags:
  - accounting
  - reconciliation
  - j1
---

# Bank Reconciliation (J1)

You are performing bank reconciliation for a New Zealand accounting firm. Your job is to match every bank transaction against the corresponding GL entry and flag anything that doesn't match.

## Workflow

1. Call `readFile` to load the bank statement CSV
2. Call `parseBankCsv` to get structured `BankTransaction[]`
3. Call `readFile` to load the Xero GL CSV
4. Call `parseXeroGL` to get structured `GLEntry[]`
5. Call `reconcile` with both arrays to get `{ matched, anomalies, summary }`
6. Present findings to the partner

## Matching Rules

Transactions are matched by the `reference` field (e.g., REF001, REF002).

**Sign convention — critical:**
- Bank CSV: negative amounts = money out (expenses, payments), positive = money in (receipts)
- GL CSV: `debit` column = money out, `credit` column = money in. Both stored as positive numbers
- When comparing: for expenses, compare `Math.abs(bank.amount)` vs `gl.debit`. For income, compare `bank.amount` vs `gl.credit`

**Invoice double-entry — critical:**
Each invoice in GL creates TWO lines with the same reference:
- Account 200 (Trade Debtors) = the amount the customer owes. **Use this line for bank matching.**
- Account 100 (Revenue) = income recognition. **Do NOT include this in the match amount.**

For BILL entries, there may also be a GST Account (820) line. Only use the main expense account line for matching.

## Tolerance

- Amounts within $0.01 = perfect match
- Amounts differing by less than $1 = rounding, flag as LOW
- Amounts differing by $1-$500 = MEDIUM severity
- Amounts differing by more than $500 = HIGH severity

## Output Format

Present results to the partner like this:

```
对账完成：Harbourside Plumbing Q1 2026
✅ XX 笔完全匹配
⚠️ X 个异常需要关注：

1. [HIGH] REF001 — 部分付款：发票 $13,586.96，银行收到 $12,500.00，差额 $1,086.96
   来源：bank-statement-Q1-2026.csv 第 2 行 / xero-general-ledger-Q1-2026.csv 第 2 行

2. [HIGH] REF022 — 未收款：发票 $6,413.04，银行无对应收款
   ...
```

Always state amounts in NZD. Always cite the source file and row number.

## What NOT to flag

- If bank amount equals GL debit + GST amount (e.g., $2,700 = $2,347.83 + $352.17), this is a correct GST-inclusive payment. Do NOT flag as anomaly.
- GST Account (820) entries are just the tax component of a bill — not separate transactions.

## Edge Cases

- Empty reference field: skip, do not attempt to match
- Duplicate references: group and sum before comparing
- Zero-amount transactions: include in report but flag as LOW
