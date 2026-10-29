# Putting AreaScout online (free-tier staging)

Treat the first deployment as **staging**: demo data, no real users. Free plans change their terms often, so check each provider's current pricing page before signing up.

## What goes where

| Part | What it is | Free-tier options |
| --- | --- | --- |
| API | `api/`, a Node 20+ NestJS app | Render, Koyeb (free web services sleep when idle: the first request after a break is slow) |
| Database | Postgres (not SQLite — free hosts wipe local files) | Neon, Supabase |
| Photos | S3-compatible bucket | Cloudflare R2, Backblaze B2, Supabase Storage |
| Website | static files in the repo root (`index.html`, `app.js`, `host.js`, `admin.js`, `styles.css`, `config.js`). Renters, landlords/agents and admins all use it | Netlify, Cloudflare Pages, Vercel, GitHub Pages |
| Mobile app | `mobile/` | Runs in Expo Go against the hosted API. Installing on iPhones without Expo Go needs an Apple Developer account (about $99/year) |
| Email | password-reset codes | Resend, Brevo — **not connected yet**; see "Still missing" |

## 1. Database

Create a Postgres database and copy its connection string. You'll set `DATABASE_URL` to it. The API creates all tables itself on start (it applies the migrations in `api/src/database/migrations`).

## 2. Photo bucket

Create a bucket, turn on public reads for it (or a public custom domain), and create an access key limited to that bucket. You'll need the bucket name, the S3 endpoint, the key pair, and the public address files are served from.

## 3. API

Build and start commands (Node 20 or newer). `--include=dev` matters: hosts set `NODE_ENV=production`, which would otherwise skip the compiler needed to build.

```
npm ci --include=dev && npm run build
npm run start:prod
```

Health check path: `/health`. Set these environment variables on the host (never commit them):

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DB_TYPE` | `postgres` |
| `DATABASE_URL` | your connection string |
| `DB_SSL` | `true` |
| `DB_SSL_CA` | Supabase's certificate authority, base64-encoded (see below). Without it the API stops with `self-signed certificate in certificate chain` |
| `STORAGE_DRIVER` | `s3` |
| `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` | from step 2 |
| `CORS_ORIGIN` | the website's address, e.g. `https://areascout.netlify.app` |
| `TRUST_PROXY` | `true` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | the first admin (use a long, unique password) |
| `SEED_DEMO_DATA` | `true` for staging with sample homes, `false` otherwise |

The host provides `PORT` and HTTPS. Cities and neighbourhoods are added automatically; sample listings only when `SEED_DEMO_DATA=true`.

### Supabase certificate

Supabase's database certificate isn't signed by a public authority, so the API must be told to trust it. In Supabase go to Project Settings → Database → SSL Configuration and download the certificate, then on a Mac run
`base64 -i ~/Downloads/<file>.crt | tr -d '\n' | pbcopy` and paste the result as `DB_SSL_CA`. For a quick first test only, `DB_SSL_REJECT_UNAUTHORIZED=false` also works (the connection is encrypted but the server's identity isn't checked); remove it once `DB_SSL_CA` is set.

## 4. Website

Edit `config.js` so it points at the API (`window.AREASCOUT_API = 'https://…'`), then deploy the repo root as a static site (no build step).

## 5. Mobile app

```
cd mobile
EXPO_PUBLIC_API_URL=https://your-api.example.com npm start
```

Then open it in Expo Go as before. It no longer needs your Mac to run the API, only to serve the app to Expo Go.

## Checks after deploying

- `GET <api>/health` returns `"status":"ok"`
- `GET <api>/v1/locations` lists cities
- Sign up on the website, then in the mobile app, with the same API
- Create a listing as a landlord and add a photo: the photo address should start with `S3_PUBLIC_URL` and open in a browser
- Log in as the admin and approve it

## Still missing before real users

- **Email**: reset codes are only written to the server log (`MailerService`); connect a provider.
- **Terms and Privacy pages**, and a check against Nigeria's data protection rules.
- **Backups** of the database and a way to monitor errors.
- **Not tested here**: a real hosted deployment and a real S3 provider. The upload code was tested against a stand-in S3 server, and the API against a real local Postgres.
