# Phase 1 Plan 3: Policy and Auto-Approval Decision Engine

## Goal

Implement deterministic decision routing after OCR: auto-approve, send to manager, request employee correction, or reject by policy.

## Context

The user decided auto-approval is allowed only when score is above 90%, policy is satisfied, SEFAZ validity passes when applicable, and the amount is below the company/employee threshold. Expenses above BRL 5000 should never auto-approve in the MVP.

## Tasks

1. Introduce a small decision service, e.g. `AiExpenseDecisionService`.
2. Load applicable company/employee policy:
   - use existing `ExpensePolicy` for category limits;
   - add fallback rules for global max auto-approval and never-auto-approve threshold if needed.
3. Implement routing matrix:
   - unreadable mandatory field -> `NEEDS_REVISION` / employee retake reason;
   - manually fillable missing fields -> employee correction path;
   - score <= 90 -> manager review;
   - policy violation -> auto-reject by default, appealable later;
   - SEFAZ invalid -> reject/manual review depending on status;
   - score > 90 + policy match + SEFAZ valid/applicable + below threshold -> auto-approved path.
4. Store decision metadata on `Expense`.
5. Keep manager review visible even for auto-approved cases if needed by status wording.
6. Add service tests for the decision matrix.

## Verification

- Decision tests cover each branch.
- No branch auto-approves without score, policy, threshold, and SEFAZ checks.
- Manager dashboard can distinguish review-needed vs auto-approved reasons.

## Done

AI decisions are explainable, deterministic, and aligned with the MVP policy.

