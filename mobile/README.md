# AreaScout mobile (Expo / React Native)

Expo SDK 58, Expo Router (`src/app`), TypeScript. Talks to the NestJS API in `../api`.

```sh
# terminal 1: the API
cd ../api && nvm use 20 && npm run start:dev

# terminal 2: the app
cd mobile && nvm use 20 && npm start     # scan the QR code with Expo Go, or press i / a
```

The app finds the API automatically at `http://<your computer's IP>:8000` (the same host Metro runs on), so the phone and computer must share a Wi-Fi network. Override with `EXPO_PUBLIC_API_URL`.

Renters and landlords/agents share one app; the role picked at sign-up decides which tabs appear.

Location: renters pick any city (a list of cities that have areas, or type any city or town); the choice is remembered and scopes the home screen, areas and results. Landlords choose a city and neighbourhood when listing, including ones that don't exist yet.

Renter screens: welcome, sign up, log in · home search, filters, results · listing detail, move-in cost calculator, area report and "add your report", request inspection, report listing, message agent · saved homes and compare, inbox and chat, inspection updates, profile.

`npm run typecheck` runs the TypeScript check.

Profile tab (all roles): edit profile, notification preferences, change password, and privacy (export your data, delete your account). Renters also get saved searches, created with "Save search" on the results screen.

Landlord/agent screens: dashboard (counts, what needs attention, your listings with status), four-step listing editor (details, photos, costs, review and submit) with drafts, inspection requests (confirm, suggest a new time, decline), and the shared messages and profile tabs.

Admin screens (sign in with the admin account): overview, reports grouped by listing with a review screen (remove and suspend, remove, ask for information, dismiss), listings to review with approve/reject, users with verify/suspend, and area report approval. Admin accounts are created with `ADMIN_EMAIL` / `ADMIN_PASSWORD` in the API settings.

Also: call and WhatsApp buttons on a listing (signed-in renters only), a rating shown for each lister, rate a lister after a confirmed visit (Profile → Inspections & updates), and forgot-password with an emailed code (the code appears in the API's log until an email provider is connected).

Not yet done: push notifications, HTTPS (needed for production builds).
