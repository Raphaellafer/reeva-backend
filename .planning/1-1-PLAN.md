# Phase 1 Plan 1: AI Decision Data Model

## Goal

Create the backend data foundation for AI score, policy result, SEFAZ result, auto-approval eligibility, and manager-facing decision reasons.

## Context

Phase 1 requires AI decisions to support CFO ROI later. The system currently stores `ocr_data`, `ai_score`, `ai_alert_level`, `ai_analysis`, and `ai_checked_at`, but does not model decision reasons, policy match, SEFAZ validation, automation outcome, or auto-approval threshold.

## Tasks

1. Add explicit fields to `Expense` for AI decision metadata:
   - `aiDecision`
   - `aiDecisionReason`
   - `policyCompliant`
   - `policyViolationReason`
   - `sefazStatus`
   - `sefazValidationMessage`
   - `autoApprovalEligible`
   - `manualReviewReason`
2. Create enums where useful:
   - `AiDecision`: `AUTO_APPROVED`, `READY_FOR_MANAGER`, `NEEDS_EMPLOYEE_CORRECTION`, `REJECTED_BY_POLICY`, `PENDING_MANUAL_REVIEW`
   - `SefazStatus`: `NOT_APPLICABLE`, `PENDING`, `VALID`, `INVALID`, `UNAVAILABLE`
3. Add Flyway migration for these fields.
4. Update `ExpenseResponse` so frontend can display decision metadata.
5. Keep `ocr_data` as raw text for auditability.

## Verification

- `mvn -DskipTests package` succeeds.
- Migration applies on local database.
- Existing employee and manager screens still load.
- API responses include AI decision fields without breaking existing clients.

## Done

The expense model can represent why AI approved, rejected, requested correction, or sent a case to review.

