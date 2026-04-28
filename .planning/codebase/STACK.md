# Stack

## Backend

- Java 21 target in `pom.xml`.
- Spring Boot 3.2.5.
- Spring Web MVC for REST APIs.
- Spring Security with JWT bearer auth.
- Spring Data JPA/Hibernate for persistence.
- Flyway for SQL migrations.
- Spring Validation for request validation.
- Spring Actuator exposes health/info.
- Springdoc OpenAPI exposes Swagger UI/API docs.

## Database

- PostgreSQL 16 in Docker Compose.
- Initial migrations create native PostgreSQL enums, then later convert enum-backed columns to `VARCHAR` with check constraints for Hibernate compatibility.
- `pgcrypto` is used by seed migrations for bcrypt password hashes.

## Storage

- Local filesystem by default under `./uploads`.
- S3-compatible storage supported through AWS SDK v2.
- Allowed upload types: JPEG, PNG, WebP, PDF.

## AI

- OpenAI vision OCR through `java.net.http.HttpClient`.
- Default application model is configured via `OPENAI_MODEL`, currently `gpt-5.4-mini` in `application.yml`.
- OCR responses are requested as strict JSON schema and stored as raw text in `expenses.ocr_data`.

## Frontend

- React 18.
- TypeScript 5.5.
- Vite 5.
- Plain CSS in `frontend/src/styles.css`.
- Browser local storage holds JWT/user session.

## Runtime

- Docker Compose runs PostgreSQL, Redis, and the backend app.
- Backend Docker image builds with Maven on Eclipse Temurin 21 and runs on JRE 21 Alpine.
- Local frontend runs on Vite port `5173`.

