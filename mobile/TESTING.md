# Testing AreaScout on a real iPhone

Nothing in the mobile app has been run on a device yet. This list is meant to find what's wrong, so write down anything that looks off, even small things.

## Setup (once)

1. API running: `cd api && nvm use 20 && npm run start:dev`
2. Expo running: `cd mobile && nvm use 24 && npm start`
3. iPhone: install **Expo Go**, join the **same Wi‑Fi** as the Mac, then open Expo Go and enter the `exp://…:8081` address Expo prints (or scan the QR code; if it says "no usable data", type the address instead).
4. Allow **Local Network** when iOS asks.
5. Sanity check in Safari: `http://<mac-ip>:8000/health` shows `"status":"ok"`.

The Mac's address changes when the network changes. Check it with `ipconfig getifaddr en0`.

For the admin tests, put `ADMIN_EMAIL=admin@example.com` and `ADMIN_PASSWORD=<a long password>` in `api/.env` and restart the API.

## A. Renter

- [ ] Welcome → Create account (fill every field; try a 5-character password first — it should be refused)
- [ ] Home shows **Lagos** with three sample homes and area cards reading "No data" (no invented ratings)
- [ ] Tap the city chip → pick **Abuja** → "No homes in Abuja yet" appears → back to Lagos
- [ ] Type a city that isn't listed (e.g. Kaduna) → empty state, no crash
- [ ] Search "gbagada" → results; sort chips work; **☆ Save search** works
- [ ] Filters screen: type, bedrooms, rent range → results match
- [ ] Open a home: photos area, price, move-in total, area signals, agent card
- [ ] **See breakdown and adjust**: switch 1/2 years, toggle moving costs, **Share**
- [ ] Heart a home; open **Saved**; select 2–3 and **Compare**
- [ ] **Request inspection**: pick a day/time, add a note, send
- [ ] **Message**: send a message; it appears under Messages
- [ ] **Report this listing** (pick a reason, send)
- [ ] Area report → **Add your report** (one rating + comment, 10+ characters)
- [ ] Profile → Edit profile, Notifications (toggle and come back), Password (try a wrong current password: it must NOT sign you out), Saved searches, Privacy & data → Export (share sheet opens)
- [ ] Log out, then **Forgot password** (the 8-digit code is printed in the API terminal)
- [ ] Airplane mode on → open a screen → "No connection" with **Try again**; turn it off and retry

## B. Landlord or agent (second account: "I list properties")

- [ ] Dashboard loads with zero counts
- [ ] **New listing**: all four steps; **Photos → Add** opens your photo library and uploads (add 5)
- [ ] Review step shows red sections until complete; **Submit for review** stays disabled until it's all done
- [ ] Try a brand-new city and neighbourhood (e.g. Kaduna / Barnawa)
- [ ] Close mid-way and **Save draft**; reopen it from the dashboard
- [ ] Add a phone number in Profile → Edit profile
- [ ] After admin approval (section C), the listing shows **Live**; tap the ⋮ menu → Edit warns it returns to review
- [ ] Inspections tab: requests from the renter appear; **Confirm**, **New time**, **Decline**
- [ ] Messages tab: reply to the renter

## C. Admin (log in with the admin account)

- [ ] Overview counts; **Listings** tab → open the landlord's listing → **Approve**
- [ ] Report that listing from three different renter accounts → it disappears from search and shows under **Reports** as urgent
- [ ] Open the report: pick **Dismiss** (listing comes back) and, on another listing, **Remove and suspend**
- [ ] **Users** tab: verify an account; suspend and un-suspend one
- [ ] Overview → **Area reviews** tile: approve/reject the renter's area report

## D. Back as renter

- [ ] After a confirmed visit time has passed, Profile → Inspections & updates shows **Rate …**
  (To test sooner, change that inspection's time in the database.)
- [ ] A listing shows **Call** and **WhatsApp** only when the lister added a phone number

## What to send back

For each problem: the screen, what you did, what you expected, what happened, and a screenshot. A photo of the Expo error screen or the red box is ideal.

Things worth watching closely because they've only been tested in simulation: keyboard covering inputs, text cut off on a small screen, buttons hidden under the home indicator, slow or janky scrolling, and the photo picker.
