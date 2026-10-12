# Proposal

## Why

Floora AR currently has only a small browser prototype and cannot support a complete, reliable journey from discovering available stone to requesting a customer quotation. The first release will turn that concept into a manageable student project with a responsive catalog, transparent estimates, saved quotation requests, and basic operational checks.

## What Changes

- Replace the prototype-only experience with a modern responsive dashboard for browsing stone inventory.
- Provide at least 10 sample stone products with category, price per square foot, and availability, plus search and category filtering.
- Calculate an estimated material cost from room dimensions and the selected stone's price per square foot.
- Collect customer details and a selected stone in a quotation request form, and show a basic activity log of catalog and quotation actions.
- Add a Node.js/Express API, including a health endpoint, and introduce persistent storage in a later implementation stage after the MVP contract is working.
- Plan automated tests, ESLint, Docker packaging, GitHub Actions CI/CD, and cloud deployment as project delivery stages.

## Capabilities

### New Capabilities

- `stone-catalog`: Browse, search, filter, and inspect sample stone products and their availability and pricing.
- `room-estimates`: Calculate an estimated material area and cost from room dimensions and a selected catalog product.
- `quotation-requests`: Submit a quotation request with customer details and a selected stone.
- `activity-log`: Review recent user-visible catalog and quotation activity.
- `service-health`: Check API service health for deployment monitoring.

### Modified Capabilities

None.

## Impact

- The existing `index.html` prototype is the starting point; the proposed implementation will introduce a frontend application and a Node.js/Express backend.
- New API contracts will cover catalog retrieval, quotation submission, and health checks. Persistent storage is planned as a later stage; the initial stage may use a documented in-memory or seed-backed approach.
- Project delivery will add automated test coverage, ESLint, Docker configuration, GitHub Actions workflows, and cloud deployment configuration in their respective stages. These require implementation and environment-specific setup before they can be considered active.
- No existing OpenSpec capabilities are present; the five new capability specs define the first behavior contract.
