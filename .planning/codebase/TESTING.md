# Testing

## Current Tests

- One backend unit test file exists: `AuthServiceTest`.
- No OCR parser tests exist yet.
- No manager workflow tests exist yet.
- No frontend tests are configured.

## Current Validation Status

- `mvn -DskipTests package` succeeds.
- `mvn test` fails in the current environment because Java 25 is running while Mockito/Byte Buddy in this dependency set officially supports up to Java 22. The project target is Java 21, and Docker uses Java 21.

## Recommended Test Priorities

- Run backend tests with JDK 21.
- Add `OcrService` parser/schema tests using representative JSON.
- Add manager workflow tests for approve/reject/request revision status transitions.
- Add repository/service tests around manager team visibility.
- Add frontend build validation with `npm run build`.
- Add smoke tests for local upload and attachment preview.

## High-Risk Test Gaps

- OCR response schema and parsing can silently affect approval outcomes.
- Async OCR transaction boundaries are not covered.
- S3/local storage edge cases are not covered.
- Finance/payment fields exist in the data model but lack full workflow tests.

