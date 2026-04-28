# Phase 1 Plan 2: OCR Result Schema, Score, and Parser Tests

## Goal

Make OCR output precise, testable, and aligned with the user's approval model: score above 90%, policy compliance, SEFAZ validity, and manager-readable reasoning.

## Context

`OcrService` currently parses JSON into `OcrResult`, updates fields, and routes incomplete cases to manual review. It needs a richer schema and tests before more automation is safe.

## Tasks

1. Remove the unused legacy `PROMPT` constant from `OcrService`.
2. Extend `OcrResult` to include:
   - `score`
   - `confidence_reason`
   - `policy_compliant`
   - `policy_reason`
   - `sefaz_status`
   - `sefaz_reason`
   - `required_fields_missing`
   - `suggested_action`
3. Update the JSON schema sent to OpenAI with these fields.
4. Extract parsing into testable methods or a dedicated component, keeping behavior narrow.
5. Add parser tests for:
   - complete high-score receipt;
   - low-score receipt;
   - unreadable image;
   - missing mandatory fields;
   - invalid category;
   - invalid amount/date;
   - policy mismatch;
   - invalid SEFAZ status;
   - malformed JSON.

## Verification

- Parser tests pass under JDK 21.
- `mvn -DskipTests package` succeeds.
- Low-confidence or malformed AI output never leads to auto-approval.

## Done

OCR parsing is deterministic and covered enough to safely build decision routing on top.

