# Reeva

Reeva is a semi-automated corporate reimbursement platform for finance teams and CFOs. It combines reimbursement capture, AI validation, policy enforcement, ERP/business data, and ROI dashboards so leaders can see where spend is working, where value is leaking, and what to improve next.

The product goal is to help companies receive employee expenses, extract receipt data automatically, enforce company policy, reduce manual approval work, and turn reimbursement data into CFO-level control and recommendations.

Additional product context from the whiteboard: Reeva should act as the central automation hub for reimbursement, connecting employee submissions, manager approval/rejection, ERP data, and CFO/director ROI visibility. OCR is one part of the broader reimbursement automation system.

Discovery source of truth: `.planning/PRODUCT-DISCOVERY.md`.

## Product Principles

- Prefer reliable financial workflow behavior over flashy automation.
- Keep AI decisions inspectable: store raw OCR JSON, a concise analysis summary, alert level, and status history.
- Treat OCR as assistive, not authoritative, when key fields are missing or confidence is low.
- Keep database changes explicit through Flyway migrations.
- Preserve security boundaries for roles, JWT auth, uploads, and company-scoped data.
- Make operational and executive value visible: approval time, avoided manual work, exception volume, and ROI.
- Build for pitch quality: the MVP must look credible and useful to real companies, not only prove backend functionality.
- Optimize for CFO insight: recommendations and ROI visibility are the core product, while reimbursement automation supplies the data.

## Current Stack

- Backend: Java 21, Spring Boot 3.2, Spring Security, Spring Data JPA, Flyway.
- Database: PostgreSQL.
- Storage: local uploads or S3-compatible object storage.
- AI: OpenAI vision model via Chat Completions API, structured receipt extraction.
- Frontend: React 18, TypeScript, Vite.
- Runtime: Docker and Docker Compose.
