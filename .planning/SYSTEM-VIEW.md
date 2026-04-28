# System View

This view summarizes the current system against the whiteboard MVP: reimbursement, manager approvals, ERP integration, and CFO/director ROI.

## Product Map

```text
Employee
  -> submits receipt/reimbursement
  -> corrects missing fields or retakes unreadable photos
  -> tracks status

Reeva
  -> OCR and validates receipt data
  -> applies company policy
  -> validates SEFAZ when applicable
  -> scores confidence/compliance
  -> routes to auto-approval, correction, manager review, or rejection

Manager
  -> sees dashboard/KPIs
  -> reviews exceptions and approvals
  -> approves, rejects, or requests revision

ERP
  -> provides employees, cost centers, clients, policies, payment/reconciliation context

CFO/Director
  -> sees ROI, automation rate, cycle time, exceptions, approved/rejected totals
  -> gets next-quarter spend recommendations
```

## Current Coverage

| Whiteboard block | Current state | Assessment |
|---|---|---|
| Employee reimbursement | Upload, submit, history exist | Partial |
| AI/OCR automation | Image OCR exists, structured JSON started | Partial |
| Manager approval | Dashboard, list, approve/reject/revision exist | Partial |
| ERP integration | Not implemented | Missing |
| CFO/director ROI | Not implemented | Missing |

## What Is Good

- The domain model already has the right backbone: company, department, user, expense, attachment, status history, comments, audit logs.
- Employee and manager flows already exist end to end at MVP level.
- OCR is asynchronous and stores raw AI output, which is good for auditability.
- Manager dashboard exists and can become the primary review/ops surface.
- Flyway gives a controlled path for schema evolution.
- The codebase is still small enough to reshape quickly.

## What Is Not Good Yet

- AI does not yet produce a real confidence/compliance score.
- Auto-approval rules are not implemented.
- Company policy is stored but not meaningfully applied in the AI decision path.
- SEFAZ validation is not implemented.
- Employee correction/retake flow is not explicit enough.
- Manager dashboard does not yet expose strong operational KPIs or ROI.
- ERP integration is absent.
- CFO/director role and ROI surface are absent.
- Test coverage is too thin for financial workflow automation.
- Local test execution currently fails under Java 25; project should use JDK 21 for tests.

## MVP Definition

The MVP is not just receipt upload. It must be pitch-ready within one month at most and demonstrate the full loop:

1. Employee submits reimbursement.
2. Reeva extracts, scores, validates, and routes.
3. Manager controls approvals and exceptions.
4. ERP data enriches or validates reimbursement context.
5. CFO/director sees ROI and operational value.
6. CFO/director receives visually clear recommendations about what is working and what should change.

## Recommended Build Sequence

1. Stabilize AI/OCR decisions: score, policy, auto-approval threshold, SEFAZ boundary, tests.
2. Finish employee correction loop: retake photo, edit missing fields, resubmit.
3. Upgrade manager dashboard: KPIs first, then fast approval/rejection list.
4. Add ERP integration MVP: prefer a real API; fallback to controlled import/sync if needed for pitch timing.
5. Add CFO/director ROI dashboard: start with metrics derivable from expenses/status history and imported ERP/business data.

## Phase 1 Success Criteria

- AI result includes score, decision, reasons, extracted fields, policy match, and SEFAZ status placeholder/result.
- Expenses above score threshold and under amount limit can enter the auto-approved path only when policy and validation pass.
- Low-score, missing-field, policy-mismatch, or unreadable cases route correctly.
- Manager can understand why each expense needs review or was auto-approved.
- Tests cover the decision matrix.
