# AreaScout API (NestJS)

NestJS 11 + TypeORM, structured like `revenue-service`: zod DTOs (`nestjs-zod`), a `{status,message,data,requestId,timestamp}` response envelope, pino logging, Swagger at `/docs`, `/v1` controller prefixes and a global auth/roles guard.

```sh
nvm use 20            # Node 20+
npm install
cp .env.example .env  # optional; defaults work
npm run start:dev     # http://localhost:8000, Swagger at /docs
npm test
```

Local default is SQLite (`data/areascout.sqlite3`, schema auto-synchronised). For anything hosted use Postgres: set `DB_TYPE=postgres` plus `DATABASE_URL` (and `DB_SSL=true` for most providers). With Postgres the schema changes only through migrations (`src/database/migrations`), applied automatically on start. After changing an entity, create the next migration with `npm run migration:generate -- src/database/migrations/<Name>` (against a database already at the current schema), and review it before committing. `migration:run`, `migration:revert` and `migration:show` are also available. Photos are stored on disk by default; set `STORAGE_DRIVER=s3` (plus the `S3_*` values in `.env.example`) to use S3-compatible storage. The tests run on SQLite by default, and on Postgres with `TEST_DB=postgres TEST_PG_URL=postgresql://…` (this wipes that database's `public` schema). See `../DEPLOYMENT.md` for putting it online. First run seeds the cities and neighbourhoods (and, unless `SEED_DEMO_DATA=false`, three demo listings). Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` to create the admin.

Auth: `POST /v1/auth/register|login`, `POST /v1/auth/forgot-password` and `/reset-password` (8-digit code, 30 minutes, five wrong guesses burns it) return a bearer token (7-day session; only its SHA-256 is stored). Passwords are PBKDF2-SHA256.

| Area | Routes |
| --- | --- |
| Auth | `POST /v1/auth/register`, `/login`, `/logout`; `GET /v1/me` |
| Locations | `GET /v1/locations` (cities and how many live homes each has), `GET /v1/areas?city=` and `GET /v1/listings?city=` (case-insensitive). Landlords can list in any place: send `city` and `neighbourhood` and a new area is created on demand (names are tidied; areas start with "No data" ratings until residents report). Saved searches can include a `city`. |
| Areas | `GET /v1/areas`, `/v1/areas/:slug`; `POST /v1/area-reviews` (tenant, moderated) |
| Listings | `GET /v1/listings?area&type&beds&min_rent&max_rent&verified&q`, `GET /v1/listings/:id`, `POST/PATCH/DELETE /v1/listings` (landlord/agent; `draft: true` saves without submitting; submitting needs 5+ photos; edits re-enter review), `GET /v1/my/listings` |
| Saved | `GET /v1/saved`, `POST/DELETE /v1/saved/:id` (tenant) |
| Inspections | `POST/GET /v1/inspections`, `PATCH /v1/inspections/:id` |
| Messages | `POST/GET /v1/conversations`, `GET /v1/conversations/:id`, `POST /v1/conversations/:id/messages` |
| Reviews of landlords and agents | `POST /v1/lister-reviews` (a renter, once per confirmed visit that has already happened), `GET /v1/listers/:id/reviews` (public), `GET/PATCH /v1/admin/lister-reviews` (admins can hide one). Single-listing responses include `owner_rating` and, for signed-in renters only, `owner_phone`. |
| Landlords | `GET /v1/my/dashboard` (counts for the lister home), `POST /v1/uploads` (JPEG/PNG/WebP up to 5 MB, returns a public URL; served from `/uploads/`) |
| Reports | `POST /v1/listings/:id/report` |
| Admin | `GET /v1/admin/dashboard` (open/urgent reports, listings and area reviews to moderate, resolved this week), `GET /v1/admin/reports` (open reports grouped per listing, urgent first) and `.../reports/listing/:id`, `POST /v1/admin/reports/listing/:id/resolve` (`remove_and_suspend`, `remove`, `request_info` or `dismiss`), `GET /v1/admin/listings` (with `flags` for possible duplicates and unusually low prices), `GET /v1/admin/users`, `PATCH /v1/admin/users/:id` (verify, suspend) |
| Admin (older) | `GET /v1/admin/dashboard|listings|area-reviews|reports`, `PATCH /v1/admin/listings|area-reviews|reports/:id` |

Before public deployment: HTTPS, a specific `CORS_ORIGIN`, rate limiting, account recovery, migrations, backups, and verified data in place of the seed.

## Security notes

- Sign-in, registration and password reset are limited to 10 requests a minute per client address; everything else to 300. Set `RATE_LIMIT=false` only for tests. Behind a reverse proxy set `TRUST_PROXY=true` so each user is counted separately.
- **Email is not connected.** Reset codes are written to the server log (in development; in production only the recipient and subject are). Replace `MailerService.send` with a real provider before relying on password reset.
- **HTTPS is not terminated here.** Put the API behind a TLS-terminating proxy or platform; the API already sends the HSTS header. Mobile production builds need an `https://` API address.
- New neighbourhoods start with every condition at "No data"; the old invented demo ratings are cleared on start-up unless residents have published reports for that area.

## Moderation rules

- A live listing goes back into review automatically once **three different people** have an open report on it (one person reporting repeatedly counts once). Dismissing the reports restores it.
- Suspending an account signs it out, blocks login and removes its live and pending listings.
- Area reports only affect the public ratings once an admin publishes them.
- Listing views count visits from anyone except the owner and admins; saves and inquiries are counted from saved homes and conversations.

## Frontend

The static app in the repo root (`index.html`, `app.js`) talks to this API at `http://localhost:8000` (override with `window.AREASCOUT_API`). Serve it with any static server, e.g. `npx serve .`. If the API is unreachable it falls back to sample homes.
