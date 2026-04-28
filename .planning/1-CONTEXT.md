# Phase 1 Context: AI OCR Reliability

Phase: `1`

Roadmap phase: AI OCR Reliability.

Mode: user-answered batch discussion.

## Product Context

The whiteboard context reframes this phase: OCR is not an isolated feature. It is the first automation layer inside Reeva's broader reimbursement hub.

Reeva should:

- Accept employee reimbursement submissions with receipt evidence.
- Use AI to reduce manual entry and classify reimbursement data.
- Route uncertain cases to manager review instead of over-automating.
- Give managers a clear approve/reject/request-revision workflow.
- Preserve data that can later power ERP reconciliation and CFO/director ROI reporting.

## Locked Decisions

- AI can auto-approve only when the confidence/compliance score is above 90%, the expense matches company policy, the invoice/receipt is valid against SEFAZ where applicable, and the amount is under a configurable limit such as BRL 500 or BRL 1000.
- Prioritize OCR/AI precision over lowest cost.
- Incomplete or doubtful submissions follow field-dependent routing: mandatory unreadable fields should ask the employee to retake the photo; editable missing fields can be corrected manually by the employee; manager still verifies when needed.
- Store raw OCR output for auditability.
- Keep model configurable with `OPENAI_MODEL`.
- Prefer the most accurate model/profile that is reasonable for MVP quality; cost optimization is secondary.
- Treat PDFs as manual review until explicit PDF OCR support is planned.
- Keep Flyway migrations as the only schema-change path.
- Keep manager workflow explicit: approve, reject, request revision.
- The MVP must include all four whiteboard steps: employee reimbursement flow, manager approval control, external ERP integration, and CFO/director ROI view.

## Recommended Phase 1 Scope

1. Make OCR response handling testable.
2. Add score and decision rationale to OCR/AI results.
3. Add company policy validation into the AI decision path.
4. Define SEFAZ validation as an explicit integration boundary, with a stub/mock first if real validation is not immediately available.
5. Remove stale/unused prompt code.
6. Validate OpenAI request compatibility for the selected model and API endpoint.
7. Add parser tests for readable, unreadable, incomplete, invalid category, invalid amount, invalid date, score threshold, and policy mismatch cases.
8. Add status-transition tests for OCR outcomes:
   - no API key -> `PENDING_REVIEW`
   - no attachment -> `PENDING_REVIEW`
   - PDF -> `PENDING_REVIEW`
   - unreadable image -> `NEEDS_REVISION`
   - readable complete image -> `AI_APPROVED`
   - readable incomplete image -> `PENDING_REVIEW`
   - high-score, policy-compliant, SEFAZ-valid, below-limit expense -> auto-approved path
   - policy mismatch or score <= 90 -> manager/manual review path
9. Improve AI analysis text so managers understand why an item is approved, pending, or needs revision.
10. Preserve future reporting fields needed for ROI:
   - OCR attempted at
   - OCR outcome
   - manual review reason
   - extracted vs user-entered deltas
   - automation decision
   - estimated manual work avoided

## Batch Discussion Assumptions

### Model Strategy

Favor precision first. Keep `OPENAI_MODEL` configurable, but the product default should be chosen for reliable extraction and decision quality rather than minimum cost. Cost optimization can come after the MVP proves the workflow.

### Approval Strategy

Do not auto-approve purely because the model returns JSON. Auto-approval requires:

- readable receipt;
- supplier recognized;
- total amount recognized;
- issue date recognized;
- category recognized or safely inferred.
- AI/compliance score above 90%;
- company policy match;
- amount under configured auto-approval limit, initially BRL 500 or BRL 1000;
- SEFAZ validity confirmed when the document type supports validation.

If mandatory fields are unreadable, ask the employee to retake the photo. If fields are missing but manually fillable, let the employee correct them. If corrected but still uncertain, the manager verifies before approval.

### Manager UX Strategy

The first UX priority is the dashboard/KPI view. After that, build the fast approval/rejection list.

Manager should see:

- extracted supplier;
- extracted amount/date/category;
- AI summary;
- alert level;
- reason for manual review;
- original attachment preview or link.
- score and auto-approval eligibility.

Current UI only partially supports this.

### CFO/ROI Strategy

The core product value is CFO/director ROI. The MVP still needs employee, manager, and ERP steps first, but every phase should preserve data for:

- automation rate;
- manual reviews avoided;
- rework caused by unreadable receipts;
- approval cycle time;
- approved/rejected totals;
- policy exceptions;
- estimated hours and money saved.

### MVP Scope Strategy

The MVP must include all four whiteboard blocks, even if some are thin:

1. Employee reimbursement submission.
2. Manager approval control.
3. External ERP integration.
4. CFO/director ROI view.

### Data Strategy

Short term: keep `ocr_data` as TEXT to avoid Hibernate JSONB friction.

Future: consider structured OCR fields or a separate OCR attempt table if reporting, confidence, retries, and audits become important.

### Test Strategy

Use JDK 21 for reliable test execution. Do not optimize around Java 25 test failures unless the project intentionally moves to Java 25.

## Answered Batch Questions

1. Auto-approval: yes, conditionally, when AI score is above 90%, policy is satisfied, SEFAZ validity is confirmed when applicable, and the amount is under a configurable BRL 500/1000 threshold.
2. OCR priority: precision over cost.
3. Incomplete/doubtful receipt: depends on field; unreadable mandatory fields should ask for a new photo, manually fillable fields should go back to employee correction, and manager verifies when needed.
4. Manager UI priority: dashboard/KPIs first, then approval/rejection list.
5. Future/core value: CFO ROI is the core, but employee/manager/ERP steps must be completed quickly and well to support it.
6. Product scope: MVP, but with all four whiteboard steps included.

## Out Of Scope For Phase 1

- Full ERP integration.
- CFO/director dashboard.
- Payment execution.
- PDF OCR.
- Full fraud detection.
- Multi-company admin console.

Note: ERP and CFO/ROI are out of scope for Phase 1 implementation, but not out of scope for the MVP roadmap.

## Output Needed From `$gsd-plan-phase 1`

The plan should produce small implementation tasks, likely:

- Task 1: clean OCR prompt/request builder and confirm API contract.
- Task 2: extract parser/request-schema helpers for unit testing.
- Task 3: add score, policy, auto-approval threshold, and decision reason model.
- Task 4: add OCR parser and outcome tests.
- Task 5: improve manager-facing AI explanation fields.
- Task 6: define SEFAZ validation boundary/stub.
- Task 7: fix local test environment guidance or Maven config for JDK 21.
