# Integrations

## OpenAI

- `OcrService` sends image receipts to `https://api.openai.com/v1/chat/completions`.
- Request body uses a multimodal user message with text instructions plus a `data:` image URL.
- `response_format` is configured as `json_schema` for structured extraction.
- API key is read from `OPENAI_API_KEY`; blank key bypasses OCR and sends the expense to manual review.

## Storage

- `StorageService` stores uploads locally or in S3 based on `STORAGE_PROVIDER`.
- Local mode stores physical files and returns local absolute paths.
- S3 mode supports custom endpoint and optional public base URL.
- OCR downloads bytes from local path, `s3://` URI, or HTTP(S) URL.

## Database

- Flyway migrations create and evolve schema.
- Repositories use Spring Data JPA plus explicit JPQL queries for manager/team views.
- Demo data seeds one company, departments, policies, a manager, and an employee.

## Frontend API

- `frontend/src/api.ts` resolves API base URL from `VITE_API_BASE_URL`, otherwise uses current hostname with port `8080` and `/api/v1`.
- Employee flow uses `/expenses`.
- Manager flow uses `/manager`.
- Auth flow uses `/auth/login` and `/auth/register`.

## External Integration Gaps

- ERP integration is not implemented yet, but whiteboard context makes it a future core integration.
- Redis is included in Docker Compose but no current backend code path uses it.
- No payment provider or finance payout integration is currently implemented.

