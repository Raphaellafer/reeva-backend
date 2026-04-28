# Product Discovery

Last updated: 2026-04-27.

## Product Definition

Reeva is a semi-automated corporate reimbursement platform that gives companies future-looking spend planning, ROI visibility, and the operational data CFOs need to control spending. It should go beyond cash-in/cash-out visibility and help finance leaders understand what is happening now, what is leaking value, and what should change next.

## Buyer and Users

Primary buyer:

- Company finance department.
- CFO/director.

Daily users:

- Employee: submits receipts/reimbursement requests.
- Manager/finance: handles notes not approved by AI and controls exceptions.
- CFO/director: uses dashboards for spend control, ROI, recommendations, and decision support.

## Core Problem

CFOs lack visibility into poorly managed spending, hidden gaps, and simple operational issues that quietly reduce company return. Reeva should reveal these gaps, automate the low-value work, and convert reimbursement data into actionable financial insight.

## Sales Promise

"Aumente o retorno da sua empresa corrigindo etapas simples."

## MVP Goal

The MVP is pitch-ready within one month at most. It must be both beautiful and functional because it will be used in a pitch and should be credible for real companies quickly.

The MVP is considered complete only when it reaches the CFO/ROI layer. It must include:

1. Employee reimbursement submission.
2. Manager/finance control of approvals and exceptions.
3. External ERP/business-data integration.
4. CFO/director dashboard with ROI and recommendations.

Non-negotiable scope:

- Reimbursement flow.
- CFO/ROI view.

## Reimbursement Flow

The ideal flow is photo-first: the employee sends a receipt photo and AI fills most fields. If a CRM/ERP context exists, the employee may need to select/fill related context.

Mandatory fields:

- Amount.
- Date.
- CNPJ.
- Supplier.
- Category.
- Cost center.
- Client/project.
- Payment method.
- CRM/ERP reference when applicable.
- SEFAZ verification code when applicable.
- Items.

If the AI reads something incorrectly:

- Employee corrects manually when possible.
- If mandatory fields are unreadable, the system asks the employee to retake the photo.
- The manager must see the receipt image to verify when needed.

Employees should not edit a note after it has been submitted, except through explicit correction/resubmission flows.

Financial flow:

- After manager approval, finance primarily pays.
- Finance should not duplicate the same verification work if AI and manager controls already covered it.

## AI, Score, Policy, and Auto-Approval

Score above 90% means a combined confidence/compliance score:

- OCR extraction confidence.
- Company policy compliance.
- Fiscal/SEFAZ validity where applicable.
- Overall approval safety.

Auto-approval is allowed only when:

- Score is above 90%.
- Receipt is valid in SEFAZ when applicable.
- Expense is within company policy.
- Amount is under the company's configured auto-approval limit.

Never auto-approve:

- Fake/invalid SEFAZ notes.
- Expenses outside company policy.
- Expenses above BRL 5000.

The amount threshold and auto-approval behavior should live inside company policy, not hard-coded globally. Company policies should be configurable by admin and interpreted/enforced by AI/rules.

The AI must explain the score and the decision reason to the manager.

Fraud/suspicion detection should exist in the MVP as far as is viable, starting with policy, SEFAZ, duplicate/suspicious data, and explanation-based alerts.

## Company Policy

Each company configures its own policy. The AI should read or use that policy and prevent policy violations from passing silently.

Policy configuration owner:

- Admin.

Policy violation behavior:

- Reject automatically by default.
- Employee may appeal and send the case to the manager with an "outside policy" alert.

## ERP Integration

The specific ERP is not yet selected. The ideal target is a real company integration for pitch credibility, but this is not guaranteed yet.

Desired ERP/business data:

- Clients.
- Projects.
- Expenses.
- Receipts/revenue.
- Payments.
- Employees.
- Any available finance/business context.

Ideal integration:

- Real API.

Fallback:

- If a real API is not viable in the pitch timeline, use a controlled import/sync alternative such as CSV or seeded connector data.

Reeva does not need to send data back to ERP in the first MVP.

## CFO/ROI Dashboard

The CFO/director view is the core value.

Important ROI dimensions:

- Money saved.
- Recommendations for the next quarter.
- Visual analysis of what is working and what needs to change.
- Spend patterns.
- Policy exceptions.
- Approval cycle time.
- Manual work avoided.
- Rework caused by bad receipts.
- Fraud/suspicion signals where viable.

The dashboard should be as complete as possible while remaining visually easy. It should feel pitch-ready for CFOs.

No before-vs-after comparison is required right now.

## Product and Monetization

Reeva should become SaaS and support multiple companies.

Possible pricing models are still under analysis:

- Per user depending on company size.
- Per processed receipt.
- Monthly plan.
- Hybrid pricing.

Initial market focus:

- Brazil.

Open question:

- Whether the MVP needs a multi-company admin interface now. Current answer unclear.

