# Requirements

## V1 Must-Haves

- Employees can create expenses with attachments and required business fields.
- Managers can review, approve, reject, or request revision on submitted expenses.
- CFO/director users can see a first ROI dashboard for automation value, even if initial metrics are simple.
- CFO/director users can see spend recommendations for the next quarter, even if recommendations start rule-based or AI-assisted from available data.
- Reeva includes at least one external ERP integration path in the MVP, even if initially implemented as an import/sync adapter.
- The backend persists companies, departments, users, expenses, attachments, comments, audit logs, and status history.
- Receipt OCR extracts supplier, CNPJ, total amount, issue date, category, and description when a receipt image is readable.
- OCR/AI produces a confidence/compliance score and decision reason.
- AI can auto-approve only when score is above 90%, company policy is satisfied, SEFAZ validation passes when applicable, and amount is below a configurable auto-approval threshold.
- Expenses above BRL 5000 are never auto-approved unless a future company policy explicitly changes that rule.
- Company policy is configured by admin and can drive limits, required fields, auto-approval thresholds, and violation outcomes.
- Policy violations are rejected automatically by default, but employees can appeal and route the case to the manager with an outside-policy alert.
- OCR failures, unreadable documents, PDFs, policy mismatches, low scores, and incomplete extraction move expenses into correction or manual-review paths.
- Unreadable mandatory fields should ask the employee to retake the photo; manually fillable missing fields should return to the employee for correction.
- Every AI-derived result stores raw JSON and a human-readable summary for auditability.
- Flyway remains the source of truth for schema evolution.
- Security rules protect role-based manager/employee workflows.
- The MVP UI must be pitch-ready: visually clear, polished, and credible for a CFO/finance audience.

## V1 Quality Gates

- Backend changes include focused unit or integration tests for business rules.
- Entity changes that affect persistence include Flyway migrations.
- AI prompt or schema changes include at least parser-focused tests and documented expected behavior.
- Frontend changes preserve build health with `npm run build`.
- Backend changes preserve Maven test health with `mvn test`.

## V2 Candidates

- PDF OCR support.
- Better manager dashboard filters and analytics.
- Batch processing and retry controls for OCR jobs.
- Prompt/model evaluation fixtures using anonymized receipts.
- Advanced fraud/risk signals beyond policy, score, and SEFAZ validation.
- Full two-way ERP writeback.
- Before-vs-after ROI comparison.
