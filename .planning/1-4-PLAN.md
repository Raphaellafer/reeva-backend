# Phase 1 Plan 4: SEFAZ Validation Boundary

## Goal

Add a clear SEFAZ validation boundary without blocking the MVP on a real SEFAZ integration.

## Context

The product needs fiscal validity as part of the score and auto-approval decision. Real SEFAZ integration may be difficult in the pitch timeline, so the MVP needs a replaceable interface and demo-safe behavior.

## Tasks

1. Create `SefazValidationService` interface.
2. Implement a stub/demo provider that can return:
   - `VALID`
   - `INVALID`
   - `UNAVAILABLE`
   - `NOT_APPLICABLE`
3. Use receipt fields such as CNPJ, verification code, date, and amount as input.
4. Wire validation into OCR decision routing.
5. Add configuration flag for demo/stub behavior.
6. Add tests proving invalid SEFAZ prevents auto-approval.

## Verification

- Stub can simulate valid and invalid notes.
- Decision service treats invalid SEFAZ as never auto-approved.
- Real integration can replace the stub without touching OCR parsing.

## Done

The system has a fiscal-validation integration point and does not fake certainty inside the AI prompt.

