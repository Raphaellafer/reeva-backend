# State

## Current Position

GSD is installed locally for Codex under `.codex/`. The project planning base has been initialized manually because this session is already inside an active repo and the runtime may need a restart before `$gsd-*` skills are discoverable.

As of 2026-04-27, the local development stack was smoke-tested:

- PostgreSQL and Redis are running through Docker Compose.
- Backend is running on `http://localhost:8080`.
- Frontend is running on `http://localhost:5173`.
- Backend health endpoint returned HTTP 200 at `/actuator/health`.
- `$gsd-map-codebase` equivalent has been run inline and generated the full `.planning/codebase/` document set.
- `$gsd-discuss-phase 1 --batch` equivalent has been run inline in assumptions mode and produced `.planning/1-CONTEXT.md`.
- `$gsd-plan-phase 1` equivalent produced `.planning/1-1-PLAN.md` through `.planning/1-6-PLAN.md`.
- Phase 1 execution started. Implemented AI decision metadata, SEFAZ demo boundary, policy-aware decision service, richer OCR schema, manager-facing AI fields, initial ROI/automation dashboard metrics, and a more professional frontend visual pass.
- Local app was restarted after implementation.

## Decisions

- Use local GSD planning artifacts in `.planning/`.
- Keep AI/OCR model configurable through `OPENAI_MODEL`.
- Default OCR model should favor strong cost/performance for high-volume extraction.
- Use structured JSON schema output for OCR responses instead of loose JSON-only prompting.
- Keep OCR conservative: missing or uncertain fields should trigger manual review rather than false approval.
- Treat Reeva as an end-to-end reimbursement automation hub, not only an OCR uploader.
- Preserve the whiteboard context in `.planning/WHITEBOARD-CONTEXT.md` for future planning.
- User confirmed precision is more important than cost for OCR/AI.
- AI auto-approval is allowed only above 90% score, within company policy, with SEFAZ validity when applicable, and below a configurable BRL 500/1000 limit.
- The MVP must include all four whiteboard steps: employee reimbursement, manager approvals, external ERP integration, and CFO/director ROI.
- CFO/director ROI is the core product value, but employee, manager, and ERP foundations must be finished quickly to support it.
- Product discovery answers were captured in `.planning/PRODUCT-DISCOVERY.md`.
- MVP target is pitch-ready within one month at most, beautiful and functional enough for real-company conversations.
- Primary buyers are finance and CFO/director; daily users are employee, manager/finance, and CFO/director.
- The product's main pain is CFO lack of visibility into poorly managed spending, hidden gaps, and simple process issues that reduce return.
- Open decisions were closed for MVP: ERP uses real API first with CSV/seed fallback, first CFO metrics are money saved/spend/category-client-project/policy violations/recommendations, policy uses natural-language-to-structured with seeded fallback, and no full SaaS admin console is required for pitch.

## Next Recommended GSD Commands

- Continue Phase 1 with parser/decision unit tests under JDK 21.
- Continue MVP planning for employee correction flow, ERP fallback/import, and CFO ROI dashboard.

## Latest Validation

- `mvn -DskipTests package` passed after Phase 1 execution changes.
- `npm.cmd run build` passed after frontend redesign.
- Backend health returned HTTP 200 at `http://localhost:8080/actuator/health`.
- Frontend returned HTTP 200 at `http://localhost:5173`.

## Local Demo Access

- Manager: `gestor@reeva.com.br` / `reeva123`
- Employee: `funcionario@reeva.com.br` / `reeva123`

## Notes

- The npm installer reported GSD v1.38.5.
- The installer accepted `--minimal` but reported installing the full skill and agent surface. Re-run updates with `npx.cmd get-shit-done-cc@latest --codex --local --minimal` if you want to verify or restore minimal mode later.
