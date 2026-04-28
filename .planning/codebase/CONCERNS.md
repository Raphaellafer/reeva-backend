# Concerns

## Product Risks

- The current app can be perceived as an OCR uploader, while the whiteboard intent is broader reimbursement automation.
- CFO/director ROI value is not yet represented in the UI or backend metrics.
- ERP data ingestion is not implemented despite being part of the target operating model.

## Technical Risks

- `OcrService` has both old `PROMPT` and active `ENHANCED_PROMPT`; the unused old prompt should be removed in a cleanup pass.
- Chat Completions + `max_completion_tokens`/`json_schema` compatibility should be verified against the selected OpenAI model in production.
- OCR is async and transactional; method visibility/proxy behavior should be tested carefully.
- PDFs bypass OCR and always require manual review.
- Redis is present in Docker Compose but unused, which may confuse deployment expectations.
- Local dev currently uses Java 25, causing Mockito/Byte Buddy test failures.

## Schema and Data Risks

- Native enum migrations are later converted to varchar/check constraints; future status/category additions require migrations and entity/API updates together.
- `ocr_data` migrated from JSONB to TEXT for Hibernate simplicity, so JSON querying is not available without rework.
- `finance_*` and payment fields exist but full finance workflow is incomplete.

## UX Risks

- Employee submit flow uses placeholder amount/category before OCR updates the record.
- Manager review depends heavily on `aiAnalysis`, but detailed extracted OCR fields are not presented separately.
- Attachment preview assumes the stored `fileUrl` is browser-accessible; local absolute paths may not render in browser without serving endpoint support.

