# Conventions

## Backend

- Domain packages are preferred over layer-only packages.
- Controllers are thin and delegate to services.
- Services throw `BusinessException` for domain/API errors.
- DTOs are Java records.
- Entities use explicit getters/setters rather than Lombok.
- Status changes should use `Expense.transitionTo(...)` and append `ExpenseStatusHistory`.
- Audit events use `AuditService.log(...)` for important user actions.
- Flyway migrations are required for persistence/schema changes.

## API

- API base path is `/api/v1`.
- Employee expenses live under `/api/v1/expenses`.
- Manager review APIs live under `/api/v1/manager`.
- OpenAPI annotations are present on controllers.

## Frontend

- The frontend is a compact single-page app without a router.
- Session data is stored in `localStorage`.
- API calls are centralized in `frontend/src/api.ts`.
- Labels and UI copy are mostly Portuguese.
- Current CSS uses card-based layout and status-pill classes.

## AI/OCR

- OCR must be conservative: missing/uncertain data routes to manual review.
- Raw model output should remain stored for auditability.
- Prompt/schema changes should be treated as behavior changes and tested.

