# Design

## Context

The repository currently contains a single standalone `index.html` prototype with three hard-coded stone choices and browser-side area and price calculations. There is no application package setup, API, persistence layer, test suite, lint configuration, container, or CI workflow. The proposal and capability specs define the target behavior.

## Goals / Non-Goals

**Goals:**

- Introduce a small, understandable frontend and Node.js/Express backend with an explicit API boundary.
- Deliver the MVP first with seed catalog data, working estimates and quotation submission, then add persistence without changing customer-facing behavior.
- Keep automated checks and deployment packaging in the project plan while making provider-specific deployment contingent on actual account and environment configuration.

**Non-Goals:**

- Authentication for the local-only quotation review in the student MVP, payments, vendor integrations, live inventory synchronization, AR room scanning, or automated quote negotiation.
- Production-grade multi-region operations or cloud resources created as part of this planning change.
- Treating the initial estimate as a final installed quote; labor, taxes, transport, and waste remain outside the first calculation.

## Decisions

1. **Use React with Vite for the dashboard and Node.js with Express for the API.** The frontend can be developed and built with a familiar lightweight toolchain, while the API keeps catalog, validation, and quotation behavior independent of the browser. A single static HTML file would minimize setup but would keep core behavior coupled to the prototype; a larger full-stack framework would add unnecessary concepts for the student-sized scope.

2. **Use a small JSON REST contract.** The API surface includes `GET /api/stones`, `POST /api/quotes`, `POST /api/activity/selections`, local-operator-only `GET /api/operator/activity`, local-operator-only `GET /api/operator/quotes`, and `GET /api/health`. Search and category filtering may initially run over the returned catalog in the frontend; the contract should allow query parameters later without changing user-visible semantics. Quote submission returns a request identifier and a clear success or field-validation response. Health returns a machine-readable status and an unsuccessful HTTP status when the service cannot serve requests. Activity records are server-timestamped summaries; access to the activity feed uses the existing loopback and development-token check so quote activity is not exposed through a public read route.

3. **Ship a seed-backed catalog and in-memory repositories before persistent storage.** Store at least ten named sample products in a seed module with category, INR per-square-foot price, and availability. Keep data access behind small repository interfaces so the initial implementation stays approachable and a later milestone can replace the in-memory quote/activity repositories with SQLite. SQLite is selected for the persistence milestone because it is local, file-backed, and suitable for a student project without a separately managed database service. That milestone must include schema creation, seed loading, and a migration path for existing sample data; persistence is not implied to exist before that work lands.

4. **Calculate estimates in one documented unit convention.** Accept positive finite length and width in feet, calculate square feet, then multiply by the selected product's INR-per-square-foot price. Keep the estimate explicitly limited to material cost and avoid implying that the displayed amount is a final quotation. Round only for display; retain numeric values for calculations.

5. **Keep activity summaries useful without copying customer contact data.** Record timestamped material-selection and accepted-quotation events. Activity entries include event type and product/request summary but omit email and phone. Quote data itself remains available to the project operator through the quotation workflow; activity is not a substitute for quote records.

6. **Keep quotation review local-only in the student MVP.** The operator review surface is available only to loopback requests that present a development token configured through the local environment; the API disables the route in production and returns a contact-redacted summary. The token is entered in the local UI for the current page session and is never committed or persisted by the app. This is a development safeguard, not production authentication. Any future public review capability requires a separate authentication and access-control decision before it is enabled.

7. **Deliver quality and deployment tooling in staged increments.** Add automated unit/API tests and ESLint before broadening features; add Docker packaging and local compose support after the app/API work; add GitHub Actions for lint, tests, and image build after those commands are stable. Treat cloud deployment as a later, provider-selected stage: first select a provider and target environment, document required secrets and environment variables, and only configure or claim a live deployment after the provider, account, and target environment are supplied and verified. A public deployment must not expose the local-only quotation review surface.

## Risks / Trade-offs

- [In-memory quote and activity data is lost when the API restarts] → Make this temporary behavior explicit and schedule SQLite before treating quotation storage as durable.
- [Sample prices and availability may be mistaken for live showroom inventory] → Label products as sample data and avoid claims of live stock synchronization.
- [A public quotation form collects personal data while review is local-only] → Validate inputs, avoid logging contact values, keep API error messages free of submitted PII, and ensure the public deployment does not expose quotation records or the operator review surface.
- [Cloud deployment requires provider-specific credentials and setup] → Keep CI checks independent of cloud credentials and leave deployment configuration pending until the deployment target is chosen.

## Migration Plan

1. Replace the standalone prototype with the responsive frontend and Express API using seed data and in-memory quote/activity repositories.
2. Add automated tests and ESLint and stabilize the API and estimate behavior.
3. Add SQLite persistence for quotes and activity, including schema initialization and a documented rollback to the previous release; retain sample catalog seeding.
4. Add Docker packaging and GitHub Actions checks/build. Deployment steps remain disabled or absent until a cloud provider and credentials are configured.
5. Select a cloud provider and target environment as a later project decision. Deploy only after configuration, confirmation that operator quotation review is not publicly exposed, and a successful health check. Roll back by restoring the previous application image and preserving or backing up the SQLite data file before any schema downgrade.
