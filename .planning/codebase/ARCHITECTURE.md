# Architecture

## Shape

The backend is a modular Spring Boot monolith organized by business domain. Controllers expose REST endpoints, services own use-case logic, repositories encapsulate persistence, and DTOs define API contracts.

## Main Domains

- `auth`: registration, login, JWT generation, security authentication.
- `user`: user entity, roles, repository, and user lookup service.
- `company`: company and department entities.
- `expense`: expense aggregate, status history, policy, attachments, comments, employee API.
- `manager`: manager dashboard, team expense listing, approval/rejection/revision workflow.
- `ai`: OCR integration and parsed OCR result.
- `storage`: upload storage and file retrieval abstraction.
- `common.audit`: audit log persistence.
- `common.exception`: business exception and global error handling.

## Expense Flow

1. Employee creates a draft expense with an attachment.
2. Employee submits the draft.
3. Submission transitions `DRAFT -> SUBMITTED`.
4. `OcrService.processExpense` runs asynchronously.
5. OCR either:
   - applies extracted fields and transitions to `AI_APPROVED`,
   - transitions to `PENDING_REVIEW` for incomplete/failing/PDF cases,
   - transitions to `NEEDS_REVISION` for unreadable/non-receipt images.
6. Manager reviews team expenses and approves, rejects, or requests revision.

## Frontend Shape

- `App.tsx` owns auth, employee upload, and employee history.
- `ManagerDashboard.tsx` owns manager KPIs, filters, expense detail modal, and review actions.
- No routing library is present; role-based view switching happens inside React state.

## Whiteboard-Aligned Target Architecture

Current code implements employee, AI, and manager slices. Future architecture should add:

- ERP ingestion/service boundary for customer/client/cost-center context.
- Executive reporting boundary for CFO/director ROI.
- Finance/payment workflow service beyond manager approval.

