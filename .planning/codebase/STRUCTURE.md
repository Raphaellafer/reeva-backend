# Structure

## Repository Layout

- `pom.xml`: backend Maven project.
- `Dockerfile`: backend multi-stage image.
- `docker-compose.yml`: PostgreSQL, Redis, backend app.
- `src/main/java/com/reeva/backend`: Java source.
- `src/main/resources/application.yml`: default configuration.
- `src/main/resources/application-local.yml`: local profile overrides.
- `src/main/resources/db/migration`: Flyway migrations.
- `src/test/java`: backend tests.
- `frontend`: React/Vite app.
- `.planning`: GSD planning artifacts.
- `.codex`: local GSD installation for Codex.

## Java Packages

- `ai`: OpenAI OCR service and result record.
- `auth`: auth service/controller, refresh token, DTOs, JWT classes.
- `common.audit`: audit log model/repository/service.
- `common.exception`: API exception handling.
- `company`: company and department entities/repository.
- `config`: async, security, storage properties, Swagger.
- `expense`: aggregate, policies, status, controller/service/repository.
- `expense.attachment`: attachment entity/type.
- `expense.comment`: comments service/repository/entity/DTOs.
- `expense.dto`: request/response/update DTOs.
- `manager`: manager controller/service and dashboard/review DTOs.
- `storage`: local/S3 file storage.
- `user`: user entity, role, repository, service.

## Frontend Files

- `frontend/src/App.tsx`: employee/auth UI and role routing.
- `frontend/src/ManagerDashboard.tsx`: manager UI.
- `frontend/src/api.ts`: API client.
- `frontend/src/types.ts`: shared API types.
- `frontend/src/styles.css`: full visual styling.

