# Floora AR

Floora AR is a stone discovery and quotation project. The current release includes a React/Vite dashboard, a Node.js/Express API, a sample stone catalog, a room material estimator, quotation request submission, and a local operator review surface. Quotation requests and activity events are stored in a local SQLite database; deployment remains a later OpenSpec stage.

## Requirements

- Node.js 20.19+ or 22.12+
- npm 10+

## Local setup

From the repository root, install the locked workspace dependencies and create the shared local environment file. The Windows PowerShell commands use `npm.cmd` to avoid PowerShell's `npm.ps1` execution-policy restriction. On macOS or Linux, use `npm` instead of `npm.cmd`.

```powershell
npm.cmd ci --cache .npm-cache
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

The local `.npm-cache` path keeps npm's cache inside the workspace and avoids Windows access problems with a restricted user-level npm cache. The environment copy runs only when `.env` does not already exist, so it will not overwrite existing local settings or credentials. On macOS or Linux, use `npm ci --cache .npm-cache` and `test -f .env || cp .env.example .env`. The example config sets the API to port `3001` and Vite to port `5173`. Change those values in `.env` if the ports are already in use.

| Variable | Purpose | Default / rule |
| --- | --- | --- |
| `API_PORT` | Express listen port | `3001` |
| `VITE_DEV_PORT` | Vite development server port | `5173` |
| `OPERATOR_REVIEW_TOKEN` | Local-only operator access token | Blank in `.env.example`; configure a random value of at least 32 characters for operator review |
| `DATABASE_PATH` | SQLite database file | `.data/floora.sqlite3` under the repository root; `:memory:` is useful only for tests |
| `NODE_ENV` | Runtime mode | When set to `production`, operator review routes return `404` |

The API creates the SQLite parent directory and runs versioned migrations when it first opens the configured database. It then seeds missing demonstration catalog entries from `apps/api/src/data/stoneCatalog.js`. Keep the database file private because quotation records contain customer contact details. The default `.data/` directory is ignored by Git. Existing quotation and activity records survive API restarts.

## Local Docker Compose

Docker Compose runs the production-built React files from an Nginx image and the Express API in a separate Node.js image on the default Compose network. Both Node build/runtime stages use the supported Node 22 line. The API image forces `sqlite3` to build from source with Debian Bookworm build tools so its native module matches the API runtime's glibc; those tools are left behind in the dependency build stage. The browser calls same-origin `/api` paths; Nginx resolves the API service as `api:3001` and re-resolves Docker DNS periodically, so the browser never uses a container hostname and API recreation does not leave Nginx with a stale address. The API image contains production dependencies and runs as the unprivileged `node` user; the frontend runtime contains only Nginx and the static bundle.

Create `.env` if needed, set a local operator token if you want to use quotation/activity review, then build and start the stack:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Set OPERATOR_REVIEW_TOKEN in .env to a private random value of at least 32 characters.
docker compose build
docker compose up -d
docker compose ps
```

The dashboard is available at `http://localhost:8080` by default. Set `FLOORA_WEB_PORT` in `.env` to change the host port. Compose publishes the frontend only to host loopback; the API has no host-published port. The API's local review endpoints retain their loopback-peer and development-token checks. Because Nginx is a separate container, requests proxied through this Compose stack are not loopback at the API and those operator-review reads remain denied; use the local `npm.cmd run dev` setup for operator review. Do not publish this student stack to a public network. Compose sets `DATABASE_PATH=/app/.data/floora.sqlite3`, and the `floora-data` named volume mounted at `/app/.data` retains quotations, activity, and catalog edits across API restarts and normal container recreation. Startup applies the existing schema migrations and repeatable demo-catalog seeding.

Useful commands:

```powershell
docker compose logs -f api frontend
curl.exe -i http://localhost:8080/api/health
docker compose restart api
docker compose up -d --build --force-recreate
docker compose stop
docker compose start
docker compose down
```

To verify persistence, submit a quotation and record a stone selection in the running UI, then restart/recreate the API with `docker compose restart api` or `docker compose up -d --build --force-recreate`. Reopen local operator review with the configured token; the saved request and activity should remain. `docker compose down` preserves the named volume. **Do not use `docker compose down --volumes` for a normal stop or upgrade:** it deletes the SQLite volume and all stored quotation, activity, and catalog data. To make a local backup, stop the API first so SQLite closes its files, then copy the database from its container into the ignored `.data` directory:

```powershell
docker compose stop api
New-Item -ItemType Directory -Force .data | Out-Null
docker compose cp api:/app/.data/floora.sqlite3 .data\floora-compose-backup.sqlite3
if ((Get-Item .data\floora-compose-backup.sqlite3).Length -le 0) { throw 'Database backup is empty.' }
docker compose start api
```

Keep the verified backup private and outside any image or commit. Never remove the named volume until the backup is verified and the data-loss impact is understood.

### Latest Docker verification record

The project owner reported that the Compose API and frontend containers were healthy, the API container restarted successfully, its health stayed healthy afterward, and the existing named SQLite volume was preserved. Host requests independently checked from this workspace returned `200 OK` for `/` and `/api/health`; health reported `catalog`, `quotations`, and `activity` as `ok`. `GET /api/stones` returned `200 OK` with 10 catalog records. Operator-review reads through the Compose proxy remain denied because Express sees a non-loopback proxy peer; this is intentional and the local-development token/loopback restriction was not relaxed. A quotation has not yet been submitted and checked after a Docker API restart, so Docker quotation persistence is not verified. Task 5.1 remains open pending a direct persistent-quotation check against the named volume.

## Development

Start both services together:

```powershell
npm.cmd run dev
```

Or run them in separate terminals from the repository root:

```powershell
npm.cmd run dev:api
```

```powershell
npm.cmd run dev:web
```

The frontend is served at <http://localhost:5173>. Its `/api` requests are proxied to the Express API at <http://localhost:3001>. Start just the API with `npm.cmd run dev:api`, or just the frontend with `npm.cmd run dev:web` (the API must also be running for catalog, quotes, and activity requests).

## API reference

All routes are mounted under `/api`. JSON request bodies must use `Content-Type: application/json`. Catalog search, category filtering, and room-estimate arithmetic are performed in the browser; there is no dedicated search, filter, or estimate-calculation API route. The estimator reads `GET /api/stones` and uses the returned price data locally.

| Method and path | Purpose | Successful response |
| --- | --- | --- |
| `GET /api` | Basic API identification | `200` — `{ "name": "Floora AR API", "status": "ready" }` |
| `GET /api/health` | Unauthenticated smoke/readiness check | `200` healthy JSON, or `503` unhealthy JSON |
| `GET /api/stones` | Read the sample stone catalog | `200` — array of stone records |
| `POST /api/quotes` | Validate and accept a quotation request | `201` — non-sensitive request receipt |
| `POST /api/activity/selections` | Record a selected catalog stone | `201` — activity summary |
| `GET /api/operator/quotes` | Review local quotation summaries | `200` — redacted array; access failures use `401`, `403`, `404`, or `503` |
| `GET /api/operator/activity` | Review local activity summaries | `200` — newest-first array; access failures use `401`, `403`, `404`, or `503` |

Unknown paths return Express's `404` response. The API currently returns JSON on the documented successful and validation responses below.

### Catalog response

`GET /api/stones` returns the ten sample records. Each record has `id`, `name`, `category`, `price`, `availability`, and `image`. `price` contains `label`, `source` (`supplier` or `estimate`), `disclosure`, numeric `min`, and numeric `max` (or `null` when no upper bound is confirmed). `availability` is `available`, `limited`, or `unavailable`. A response record has this shape:

```json
{
  "id": "morchana-white",
  "name": "Morchana White",
  "category": "Indian Marble",
  "price": {
    "label": "₹60 / sq. ft.",
    "source": "supplier",
    "disclosure": "Supplier-provided price",
    "min": 60,
    "max": 60
  },
  "availability": "available",
  "image": "/images/stones/white-soft.svg"
}
```

These are sample data; they do not represent live stock or verified prices for exact slabs.

### Quotation submission

`POST /api/quotes` requires the following JSON fields:

| Field | Requirement and validation |
| --- | --- |
| `name` | Required string, trimmed length 2–100 characters |
| `email` | Required valid email string, maximum 254 characters |
| `phone` | Required string containing 7–15 digits, with optional leading `+` and spaces, parentheses, periods, or hyphens |
| `projectLocation` | Required string, trimmed length 2–200 characters |
| `stoneId` | Required catalog ID for a stone whose availability is `available` |
| `notes` | Optional string, maximum 1,000 trimmed characters |
| `roomDimensions` | Optional object with both `lengthFeet` and `widthFeet` as positive finite numbers; omit the object when dimensions are not supplied |

The form shape, with values supplied by the local operator/customer in their own environment, is:

```json
{
  "name": "<name>",
  "email": "<email>",
  "phone": "<phone>",
  "projectLocation": "<project location>",
  "stoneId": "morchana-white",
  "notes": "<optional project notes>",
  "roomDimensions": { "lengthFeet": 12, "widthFeet": 10 }
}
```

Replace the placeholders with valid values before sending; the stone ID above is an existing catalog example. On acceptance, the API responds `201 Created`:

```json
{
  "id": "<server-generated request id>",
  "status": "received",
  "message": "Your quotation request has been received."
}
```

Invalid fields return `400 Bad Request` with `{ "error": "Please correct the highlighted fields and try again.", "fields": { ... } }`. Field messages are:

| Field key | Message |
| --- | --- |
| `name` | `Enter your name (2 to 100 characters).` |
| `email` | `Enter a valid email address.` |
| `phone` | `Enter a valid phone number with 7 to 15 digits.` |
| `projectLocation` | `Enter a project location (up to 200 characters).` |
| `notes` | `Keep notes to 1,000 characters or fewer.` |
| `stoneId` | `Choose a stone that is currently available for quotation.` |
| `roomLengthFeet`, `roomWidthFeet` | `Enter both room dimensions as positive finite feet values, or leave both empty.` |

The `fields` object includes only invalid fields. The API does not echo submitted values in validation errors. Accepted requests and their associated activity entries persist in the configured SQLite file across API restarts. There is no public read route for quotation records.

### Material selection and room estimates

The browser records an estimator or quotation stone selection with `POST /api/activity/selections`, sending only `{ "stoneId": "<catalog stone id>" }`. A known catalog stone returns `201 Created` with `{ "type": "material-selected", "stone": { "id": "...", "name": "..." }, "timestamp": "<UTC ISO 8601 timestamp>" }`. An unknown or missing ID returns `400 Bad Request` with `{ "error": "Choose a stone from the catalog to record this selection." }`. Extra submitted fields are not copied into the event.

The room estimator has no server-side calculation endpoint. It calculates square feet and indicative material cost from positive feet dimensions and the selected catalog price in the React app. Ranged prices require a chosen rate, and all totals are estimates excluding taxes, installation, transport, other charges, and any supplier-confirmed final slab price.

### Health check

`GET /api/health` does not require operator authentication. It checks whether the catalog, quotation repository, and activity repository respond. A healthy service returns `200 OK`; a failed dependency check returns `503 Service Unavailable`. The JSON contains only `status`, a server-generated UTC ISO 8601 `timestamp`, and per-dependency `checks`; no customer records or secret values are included.

Example healthy response:

```json
{
  "status": "healthy",
  "timestamp": "2026-10-12T04:00:00.000Z",
  "checks": { "catalog": "ok", "quotations": "ok", "activity": "ok" }
}
```

Run a local smoke check after starting the API:

```powershell
curl.exe -i http://localhost:3001/api/health
```

### Local operator review and activity

`GET /api/operator/quotes` and `GET /api/operator/activity` are local-only review routes. Both require all of these checks to pass: request originates from a loopback address, `x-operator-token` matches the configured development token, and `NODE_ENV` is not `production`. Responses are `401` for a missing/wrong token, `403` for a non-loopback request, `503` when no token of at least 32 characters is configured, and `404` when running in production. The quote response contains request ID, customer name, selected stone, project location, optional room dimensions, and submission time; email, phone, and notes are omitted. Activity contains material-selection and accepted-quotation summaries in newest-first order; each timestamp is server-generated UTC ISO 8601 (for example, `2026-10-11T12:00:00.000Z`). Neither review response includes customer contact details, notes, tokens, or other secrets.

For example, a quote review item has this redacted shape:

```json
{
  "id": "<request id>",
  "customerName": "<customer name>",
  "stone": { "id": "morchana-white", "name": "Morchana White" },
  "projectLocation": "<project location>",
  "roomDimensions": null,
  "createdAt": "<server-generated ISO 8601 timestamp>"
}
```

An activity item is either `material-selected` or `quotation-submitted`; both include `stone` and `timestamp`, and quotation events also include `requestId`. For example:

```json
{
  "type": "quotation-submitted",
  "requestId": "<request id>",
  "stone": { "id": "morchana-white", "name": "Morchana White" },
  "timestamp": "<server-generated ISO 8601 timestamp>"
}
```

Neither response contains email, phone, or notes. Access errors have JSON shape `{ "error": "<access error message>" }`: invalid/missing token `401`, non-loopback peer `403`, unconfigured token `503`, and production-disabled route `404`.

Create a random token locally:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Put the generated value in the ignored `.env` file as `OPERATOR_REVIEW_TOKEN=<your-generated-value>`, restart the API, and enter that value in the local operator review panel. Keep `.env` private; no token is included in the repository or browser storage. If the token is unset or shorter than 32 characters, the review routes remain unavailable. The local review safeguard is not production authentication; review is disabled when `NODE_ENV=production` and must not be exposed through a public deployment.

## Checks

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

`npm.cmd test` runs API and UI tests. ESLint checks JavaScript and JSX in both workspaces. The build command creates the production frontend bundle in the ignored `apps/web/dist` directory. For the API smoke check, run `curl.exe -i http://localhost:3001/api/health` while the API is running.

## Local SQLite data

By default, SQLite stores records at `.data/floora.sqlite3` in the repository root. Set `DATABASE_PATH` in `.env` to an absolute path or a repository-root-relative path to use another file. The API creates the directory, applies pending migrations, and seeds missing sample catalog rows on startup. It records the current schema in SQLite's `PRAGMA user_version` value. Version 1 contains quotation and activity tables; version 2 adds the catalog table. Existing version-0 quotation/activity databases are upgraded additively, retaining their records. The API refuses to open a database with a schema version newer than it supports. Do not commit or share the database file: it contains quotation contact details, even though operator review responses redact them. Activity events store only event type, request ID when applicable, stone summary, and UTC timestamp.

Catalog records are now read from SQLite. The code catalog is only the demonstration seed source. Startup uses each stone ID as a conflict key and inserts missing rows; it does not replace an existing row's name, prices, availability, image, or other catalog data. Seed rows are flagged as demo records, and manually added catalog rows can be identified with `is_demo = 0`. If a seeded row is deleted, startup may insert that missing demonstration row again.

For a local backup, stop the API first, then copy the database file to a private backup location. Stopping the API ensures SQLite has closed the file before the copy. To reset local demo/request data, stop the API and remove the configured database file (and its associated `-wal`/`-shm` files if present); the next API start creates a fresh database. Back up the file before resetting if any quotation records must be retained. This reset procedure is for local development and is not a production backup or migration plan.

To verify persistence locally, configure the local operator token, start the app with `npm.cmd run dev`, submit a quotation and select a stone, then stop and restart the API. Open the local operator review again: the quotation and activity should still appear, and the catalog should retain any database-maintained edits. `npm.cmd test` also exercises quote/activity/catalog persistence across a real API process restart using a temporary database.

### Database troubleshooting

- Relative `DATABASE_PATH` values resolve from the repository root, not the current terminal directory. The default is `.data/floora.sqlite3`.
- If the API exits before listening and `/api/health` cannot connect, inspect the API terminal for the initialization error. Check that the configured parent directory is writable, that the database file is writable, and that no other process has an incompatible lock on it. Choose another writable `DATABASE_PATH` if needed; do not delete the existing database as a troubleshooting step.
- Schema initialization runs before the API listens. If the database is newer than this API supports or a migration fails, startup stops rather than serving against an unknown schema. Preserve a backup, use a compatible application version, and follow the rollback steps below.
- For permission or path testing, set `DATABASE_PATH` to a new temporary file rather than the project's `.data/floora.sqlite3`. For example, in PowerShell: `$env:DATABASE_PATH = Join-Path $env:TEMP 'floora-check.sqlite3'`; then run `npm.cmd run dev:api`. Remove only that test file after stopping the API and confirming the path points to the temporary location.

### Upgrade and rollback

Schema migrations run automatically when the API starts. Before upgrading application code that may migrate a database, stop the API with `Ctrl+C` and create a verified private copy. For the default Windows path:

```powershell
Copy-Item .data\floora.sqlite3 .data\floora.before-upgrade.sqlite3
if ((Get-Item .data\floora.before-upgrade.sqlite3).Length -le 0) { throw 'Database backup is empty.' }
npm.cmd run dev:api
```

If `DATABASE_PATH` points elsewhere, substitute that configured path and choose a backup path on storage with enough space. Check that the copy exists and is non-empty before starting the new API. Keep the original backup unchanged until the upgraded application and stored records have been verified.

Migrations are forward-only; no automatic destructive down-migration is provided. The current migrations add tables/indexes and seed missing catalog rows. For an application rollback, stop the API and restore the previous application code. The earlier API version can continue using the quotation/activity tables and ignores the added catalog table, so a database restore is not normally needed. If you must restore the pre-upgrade database, first preserve the post-upgrade copy (which may contain newer quotations), then restore the backup:

```powershell
Copy-Item .data\floora.sqlite3 .data\floora.after-upgrade.sqlite3
Copy-Item .data\floora.before-upgrade.sqlite3 .data\floora.sqlite3 -Force
npm.cmd run dev:api
```

Restoring the earlier file discards records written after the backup. Retain both copies and reconcile any later requests before deleting either. Never delete or recreate the active database as a rollback shortcut. For a configured non-default path, substitute that path in both copy commands.

## Demo stone collection

The collection in `apps/api/src/data/stoneCatalog.js` is the initial demonstration seed. The API reads catalog records from SQLite through `apps/api/src/repositories/stoneRepository.js`. Existing database rows are not overwritten by startup seeding, so replace demo records only through a deliberate catalog maintenance process after backing up the database; the React components render the API's catalog shape rather than embedding product records.

| Stone | Category | Displayed price per sq. ft. | Price note |
| --- | --- | ---: | --- |
| Morchana White | Indian Marble | ₹60 | Supplier-provided price; confirm the exact slab and final quotation |
| Makrana White | Indian Marble | ₹80–350+ | Indicative online estimate |
| Rajnagar White | Indian Marble | ₹70–120 | Indicative online estimate |
| Morwad White | Indian Marble | ₹35–120 | Indicative online estimate |
| Banswara White | Indian Marble | ₹44–300 | Indicative online estimate |
| Wonder White | Indian Marble | ₹60–200 | Indicative online estimate |
| Indian Statuario | Indian Marble | ₹350–2,000+ | Indicative online estimate |
| Carrara White | Imported Marble | ₹180–2,000+ | Indicative online estimate |
| Calacatta Gold | Imported Marble | ₹400–6,000+ | Indicative online estimate |
| Nero Marquina Black | Imported Marble | ₹250–800+ | Indicative online estimate |

Except for Morchana White's supplier-provided ₹60 value, displayed prices are estimates, not verified quotations for exact slabs. Availability labels are illustrative sample statuses and do not represent live stock. The local SVG images are artistic placeholders, not confirmed photographs of the named stones. Finish information was not supplied, so cards currently show material category only.

## Room material estimate

Enter positive room length and width in feet and select a stone from the API-backed catalog. The estimator calculates square feet and multiplies by a selected rate per square foot. For finite catalog ranges, choose a rate within the displayed bounds; for ranges marked with `+`, choose a rate at or above the listed minimum because no confirmed upper bound is available. The optional wastage percentage adjusts the planning area. Every result is a preliminary material-only estimate: taxes, installation, transport, other charges, and final slab selection are excluded. A supplier must confirm the final price and required quantity.

## Project layout

- `apps/web` — React and Vite frontend
- `apps/api` — Express API
- `openspec/changes/floora-ar-discovery-quotation-platform` — proposal, behavior specifications, design, and implementation tasks
