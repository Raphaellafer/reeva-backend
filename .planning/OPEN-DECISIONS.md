# Open Decisions

These decisions should be answered before implementation planning, because they affect scope, data model, UI, and pitch credibility.

## D1: ERP Integration Source

Status: decided for MVP.

Decision: try a real API first, but design a fallback to CSV/import/seeded connector data if the real integration blocks the 1-month pitch timeline.

Question: what is the first concrete ERP/business-data source?

Current state:

- Real API is ideal.
- Specific ERP/company is not confirmed.
- Fallback may be CSV/import/seeded connector data.

Impact:

- Controls Phase 4 scope.
- Controls what CFO ROI can calculate.
- Controls demo credibility.

## D2: CFO Dashboard First Metrics

Status: decided for MVP.

Decision: first dashboard metrics are money saved estimate, spend by category, spend by client/project, policy violations, and next-quarter recommendations.

Question: which metrics must be visible first for the pitch?

Candidates:

- Money saved.
- Spend by category/client/project.
- Policy violations.
- Approval cycle time.
- Automation rate.
- Rework caused by bad receipts.
- Next-quarter recommendations.

Impact:

- Controls data model and dashboard design.
- Controls which events must be tracked now.

## D3: Company Policy Format

Status: decided for MVP.

Decision: use natural-language policy interpreted into structured rules where possible, with a structured fallback. For implementation speed, start with seeded policy plus a simple company-demo edit path if needed.

Question: how does the company configure policy in the MVP?

Options:

- Admin form in the app.
- Seeded policy per demo company.
- JSON/YAML policy imported by admin.
- Natural-language policy interpreted by AI plus structured rule extraction.

Impact:

- Controls auto-approval and rejection behavior.
- Controls how much admin UI must exist in MVP.

## D4: Multi-Company Admin Scope

Status: decided for MVP.

Decision: do not build a full SaaS admin console for the pitch. Use seeded/demo company data, and only add a simple policy-edit surface if required for the demo.

Question: does the MVP need an admin screen to create/manage companies and users?

Clarification:

- A multi-company SaaS can exist in the data model without exposing a full admin UI in the first pitch.
- If the pitch only needs one or two demo companies, seed/import may be enough.

Impact:

- Controls whether Phase 0/admin work is needed.
