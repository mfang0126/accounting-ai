---
name: working-paper
description: Generate a structured Working Paper that consolidates J1-J4 outputs with full source traceability — every number cites its CSV origin
version: 1.0.0
tags:
  - accounting
  - working-paper
  - audit-trail
  - j5
---

# Working Paper Generation (J5)

You are generating a formal Working Paper (底稿) for partner review. This document consolidates all findings from J1-J4 into a single, auditable deliverable where every number can be traced back to its source.

## Prerequisites

This skill requires completed output from:
- J1: Bank reconciliation results (matched + anomalies)
- J2: Anomaly investigation report (categories + recommendations)
- J3: GST calculation (collected / paid / net)
- J4: P&L statement (revenue / expenses / net profit)

## Core Principle: Source Traceability

**Every number in the working paper MUST cite its source.** Format: `[filename:row N]`

Examples:
- `$12,500.00 [bank-statement-Q1-2026.csv:row 2]`
- `$13,586.96 [xero-general-ledger-Q1-2026.csv:row 2]`

If a number is calculated from multiple sources, cite all of them:
- `差额 $1,086.96 [bank:row 2 vs GL:row 2]`

## Working Paper Structure

### Section 1: Cover Page

```
WORKING PAPER
Client: [Client Name]
Period: [Period]
Prepared by: AI Accounting Assistant
Date: [Current Date]
Status: DRAFT — 待合伙人审阅

数据来源：
- [filename 1] (XX 行)
- [filename 2] (XX 行)
```

### Section 2: Bank Reconciliation Summary

From J1 output:
- Total transactions matched: XX
- Total anomalies found: X
- Table of all anomalies with reference, type, amounts, severity

### Section 3: Anomaly Investigation Report

From J2 output:
- Each anomaly with full investigation narrative
- Category, severity, recommended action
- Overdue days calculation where applicable

### Section 4: GST Position

From J3 output:
- GST collected (on income)
- GST paid (on expenses)
- GST payments to IRD
- Net liability
- 15% verification cross-check result

### Section 5: Profit & Loss

From J4 output:
- Revenue by account
- Expenses by account
- Net profit
- Cross-check notes

### Section 6: Action Items

Consolidated list of all recommended actions from J2:
```
1. [HIGH] 催收 Renovate NZ $1,086.96 — REF001
2. [HIGH] 跟进 D Morrison $6,413.04 — INV-2026-004
3. [MEDIUM] 查 Sarah Chen 工资差异 $321.74 — REF011
4. [LOW] 验证 GST payment vs calculated liability — REF023
```

### Section 7: Sign-off

```
AI 声明：以上数据直接从提供的 CSV 文件计算得出，所有数字均可通过来源引用追溯。
本底稿为 AI 生成的初稿，需合伙人审阅后方可作为正式文件。

合伙人审阅：________________  日期：________________
```

## Formatting Rules

1. **Numbers:** Always 2 decimal places, NZD, with thousands separator where > $9,999
2. **Citations:** Every number has `[source:row]` immediately after it
3. **Language:** Mixed Chinese/English is fine — Chinese for commentary, English for accounting terms
4. **Tables:** Use markdown tables for structured data
5. **Severity badges:** Use emoji prefix — ⚠️ HIGH, ⚡ MEDIUM, ℹ️ LOW

## What NOT to Do

- Do NOT perform any calculations — all numbers come from J1-J4 tool outputs
- Do NOT add opinions beyond what J2 already determined
- Do NOT omit source citations for any number
- Do NOT mark the paper as "final" — it is always DRAFT until partner signs off

## Output

The `generateWorkingPaper` tool should output:
- `sections[]` — array of structured section objects
- `markdown` — the complete working paper as markdown text
- `metadata` — generation timestamp, source files used, total citation count

The markdown output can later be converted to PDF using the pdf skill.
