# Tasks

## 1. Project foundation

- [x] 1.1 Create the frontend and Express API project structure with separate development commands; verify both services start locally and the frontend can reach the API.
- [x] 1.2 Add shared environment configuration and ESLint scripts for the frontend and backend; verify the lint command runs successfully on the initial project.
- [x] 1.3 Add a concise README with setup, development, and lint commands; verify a new contributor can follow the documented steps to start the project.

## 2. Dashboard and stone catalog

- [x] 2.1 Implement the responsive dashboard layout for catalog, estimate entry point, quotation entry point, and recent activity; verify narrow and wide viewport layouts have no horizontal page overflow and remain usable.
- [x] 2.2 Add a seed catalog with at least ten sample stones, each with name, category, INR price per square foot, and available/limited/unavailable status; verify catalog data checks enforce all required fields and the minimum count.
- [x] 2.3 Implement catalog retrieval, product cards, text search, category filtering, availability labels, and empty-result states; verify API and UI tests cover matching, filtering, combined search/filter, and no-match behavior.
- [x] 2.4 Document that catalog prices and stock statuses are sample data; verify the catalog UI and README do not imply live inventory or final installed pricing.

## 3. Estimates, quotations, activity, and health

- [x] 3.1 Implement the room estimate from positive finite feet dimensions and the selected product's per-square-foot rate; verify tests cover recalculation, invalid dimensions, area, displayed currency, and material-estimate limitations.
- [x] 3.2 Implement the customer quotation form and Express submission validation for name, email, phone, and an available selected stone; verify API/UI tests cover accepted submissions and field, email, unknown-stone, and unavailable-stone errors.
- [x] 3.3 Add a local project-operator review surface for accepted requests and ensure public customer routes cannot read quotation records; verify route/access tests distinguish the local review view from the public discovery experience.
- [x] 3.4 Implement a timestamped activity log for material selections and accepted quotations, ordered newest first and excluding email and phone; verify tests cover event creation, ordering, empty state, and absence of customer contact data.
- [x] 3.5 Add `GET /api/health` with machine-readable healthy and unsuccessful responses; verify endpoint tests cover a healthy service and a service unable to serve requests.
- [x] 3.6 Document API routes, request fields, validation errors, in-memory data limits, and local operator review; verify the documented examples match the implemented responses.

## 4. Persistent storage milestone

- [x] 4.1 Replace in-memory quotation and activity repositories with SQLite while preserving the existing API behavior; verify restart tests show accepted requests and activity remain available after the API process restarts.
- [x] 4.2 Add database schema initialization, sample catalog seeding, and a documented upgrade/rollback procedure; verify a clean database initializes correctly and the documented rollback preserves a backup of stored requests.
- [x] 4.3 Update storage documentation to describe the SQLite file location, backup expectations, and local-only quotation review; verify setup instructions work with a newly created database.

## 5. Container and continuous integration

- [x] 5.1 Add Docker images and a local compose configuration for the frontend/API and persistent data file; verify a clean build starts the app and the health endpoint succeeds from the container environment.
  - Verification recorded: `docker compose build --no-cache` built `floora-ar-api` and `floora-ar-frontend`; `http://localhost:8080/api/health` returned HTTP 200 with `status: healthy` and `catalog`, `quotations`, and `activity` checks all `ok`. Docker-volume quote persistence was not verified.
- [ ] 5.2 Add GitHub Actions CI for dependency installation, ESLint, automated tests, and production build/container build; verify the workflow passes on a clean branch and fails when a lint or test check fails.
- [ ] 5.3 Document local Docker usage and CI checks; verify the README commands match the compose and workflow configuration.

## 6. Provider-dependent cloud deployment

- [ ] 6.1 Select and record a cloud provider and target environment as a project decision; verify the choice supports the required Node.js runtime, health checks, and durable SQLite storage or document a suitable persistent database alternative.
- [ ] 6.2 After the provider and credentials are configured, add a deployment workflow and document required secrets, environment variables, and rollback steps; verify deployment is gated on passing CI and does not expose the local quotation review surface.
- [ ] 6.3 Deploy to the selected environment and verify the public dashboard loads, customer quotation submission follows the documented behavior, stored data survives the provider's restart/redeployment model, and the deployed health endpoint reports success.
