# Roadmap

## Milestone 1: MVP Reimbursement Automation

Goal: deliver a beautiful, functional, pitch-ready MVP in at most one month. The MVP must demonstrate employee reimbursement, manager/finance exception control, ERP/business-data integration, and CFO/director ROI.

### Phase 1: AI OCR, Score, and Auto-Approval Rules

Improve the OCR prompt, structured output contract, model defaults, parser robustness, score model, policy checks, SEFAZ validation boundary, and test coverage so receipt extraction can support reliable correction, manager review, and conditional auto-approval.

### Phase 2: Employee Correction and Reimbursement Flow

Complete the employee-facing reimbursement path: submit receipt, receive AI feedback, retake unreadable photos, manually correct fillable fields, and resubmit.

### Phase 3: Manager Dashboard and Approval Control

Prioritize dashboard/KPI visibility first, then fast approval/rejection/revision workflows for manager control.

### Phase 4: ERP Integration MVP

Add the first external ERP/business-data integration path for pitch credibility. Prefer a real API integration if a company source is available; otherwise implement a controlled import/sync fallback with clients, projects, employees, spend, receipts/revenue, and payments.

### Phase 5: CFO/Director ROI Dashboard

Expose the core product value: automation rate, manual effort saved, cycle time, approved/rejected totals, policy exceptions, spend patterns, money saved, and next-quarter recommendations.

### Phase 6: Operational Hardening

Add retry/error observability for OCR jobs, storage edge-case handling, API documentation updates, deployment readiness checks, and audit hardening.
