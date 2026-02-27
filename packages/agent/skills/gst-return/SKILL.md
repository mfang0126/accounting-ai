---
name: gst-return
description: Calculate NZ GST Return — summarise GST collected on income, GST paid on expenses, IRD payments made, and net GST liability
version: 1.0.0
tags:
  - accounting
  - gst
  - tax
  - nz
  - j3
---

# GST Return Calculation (J3)

You are calculating the GST position for a New Zealand GST-registered business. This is a critical compliance task — every number must be exact and traceable.

## NZ GST Rules

- **Rate:** 15% (standard rate)
- **Formula:** GST = net amount × 15/115 (for GST-inclusive amounts) OR net amount × 0.15 (for GST-exclusive amounts)
- **Basis:** Invoice basis (most common) — GST is accounted for when invoice is issued, not when payment is received
- **Filing frequency:** Commonly 2-monthly (Jan/Feb, Mar/Apr, etc.)
- **Due date:** 28th of the month following the period end

## Workflow

1. Call `readFile` + `parseXeroGL` to get all GL entries
2. Call `calculateGST` with the GL entries and period parameters
3. Present the GST summary to the partner

## Calculation Logic

The `calculateGST` tool should:

### Step 1: Classify each GL entry by Tax Rate column

| Tax Rate Value | Classification | What it means |
|---------------|---------------|---------------|
| `GST on Income` | Income GST | GST collected from customers on sales invoices |
| `GST on Expenses` | Expense GST | GST paid to suppliers on purchase bills (claimable) |
| `No Tax` | No GST | Exempt items (wages, ACC levies, GST payments themselves) |
| `GST` | GST Account entry | The GST component of a bill posted to account 820 |

### Step 2: Sum Tax Amount by classification

- **GST on Income total** = sum of `taxAmount` where `taxRate = 'GST on Income'`
- **GST on Expenses total** = sum of `taxAmount` where `taxRate = 'GST on Expenses'`

### Step 3: Identify GST payments already made to IRD

- Look for entries where `source = 'TAX'` AND `accountCode = '820'`
- These are payments to IRD (e.g., REF023 $3,200 and REF044 $2,800)

### Step 4: Calculate net position

```
Net GST liability = GST on Income - GST on Expenses - GST payments to IRD
```

- Positive result = business owes IRD more
- Negative result = business is owed a refund

### Step 5: Verify each entry

For each income/expense entry, verify: `taxAmount / (debit or credit - taxAmount) ≈ 0.15` (within $0.01 tolerance).
If any entry fails this check, flag it for partner review.

## Output Format

```
GST 计算结果：Harbourside Plumbing Q1 2026

GST Collected (on sales):        $X,XXX.XX NZD
GST Paid (on expenses):         ($X,XXX.XX) NZD
                                 ──────────
Net GST before payments:         $X,XXX.XX NZD
GST Payments to IRD:            ($X,XXX.XX) NZD
  - REF023 Jan payment:         ($3,200.00)
  - REF044 Feb payment:         ($2,800.00)
                                 ──────────
Net GST Payable/(Refundable):    $X,XXX.XX NZD

来源：xero-general-ledger-Q1-2026.csv
每笔明细见底稿附录。
```

## Cross-checks

After calculation, verify:
1. GST on Income should be approximately 15% of total Revenue (account 100 credit total)
2. GST on Expenses should be approximately 15% of total Expenses (accounts 449-490 debit total, excluding No Tax items like wages and ACC)
3. If cross-check fails by more than $10, flag for partner review

## Items NOT subject to GST

These items in the Harbourside data have `No Tax`:
- Wages & Salaries (account 477) — employment income is not a taxable supply
- ACC Levies (account 490) — government levy, exempt
- GST payments to IRD (account 820) — these ARE the GST, not subject to GST themselves

## References

See `references/nz-gst-rates.md` for the complete NZ GST rate schedule.
