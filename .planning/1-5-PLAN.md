# Phase 1 Plan 5: Manager-Facing AI Explanation

## Goal

Make AI outcomes understandable to the manager/finance user and preserve metrics for the future CFO ROI dashboard.

## Context

The manager UI currently shows `aiAnalysis` and alert level, but the user wants dashboard-first management and CFO ROI later. Phase 1 should expose enough reason data to build trust.

## Tasks

1. Update `ExpenseResponse` and frontend types with:
   - score;
   - AI decision;
   - decision reason;
   - policy status/reason;
   - SEFAZ status/reason;
   - auto-approval eligibility;
   - manual review reason.
2. Improve `ManagerDashboard` cards/list/detail modal to show:
   - score badge;
   - why this needs review;
   - why it was auto-approved;
   - policy/SEFAZ alerts.
3. Keep UI compact and pitch-ready.
4. Add derived metrics for future CFO:
   - auto-approved count;
   - manual-review count;
   - policy-violation count;
   - estimated manual work avoided.

## Verification

- Frontend builds with `npm run build`.
- Manager can understand AI outcome from the list/detail view.
- No text overlaps or noisy debug output in UI.

## Done

Manager/finance users can trust and act on AI decisions without reading raw JSON.

