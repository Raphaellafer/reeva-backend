# Codebase Map

## Structure

- `src/main/java/com/reeva/backend`: Spring Boot backend by domain package.
- `src/main/resources/db/migration`: Flyway SQL migrations.
- `src/test/java`: backend tests.
- `frontend`: React/Vite manager UI.
- `docker-compose.yml` and `Dockerfile`: local/runtime packaging.

## Backend Domains

- `auth`: login/register, refresh tokens, JWT support.
- `user`, `company`: users, roles, companies, departments.
- `expense`: expense aggregate, status transitions, policies, attachments, comments, controllers, DTOs.
- `manager`: manager dashboard and review use cases.
- `ai`: OCR integration and parsed OCR result.
- `storage`: local/S3 attachment access.
- `common.audit`, `common.exception`: audit logging and error handling.
- `config`: security, async, storage, Swagger/OpenAPI.

## AI Integration Notes

- OCR is asynchronous through `@Async`.
- Images are downloaded from configured storage, encoded as data URLs, and sent to OpenAI vision.
- PDFs currently bypass OCR and move to manual review.
- Parsed results update title, description, amount, date, category, AI analysis, alert level, and status history.
- Raw AI JSON is stored on the expense for traceability.
- Whiteboard context positions OCR as one part of a broader reimbursement automation hub with ERP data and CFO/director ROI visibility.

## Planning Risks

- JPA entity changes require Flyway migrations.
- OCR prompt changes can silently alter business outcomes, so parser tests and fixture-based checks matter.
- Status transitions should be verified through domain methods, not direct status assignment.
- Upload/storage behavior crosses local and S3 modes and needs explicit edge-case testing.
