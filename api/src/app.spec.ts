import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { Client } from 'pg';

// TEST_DB=postgres runs the whole suite against a real Postgres (set TEST_PG_URL); the default is in-memory SQLite.
const usePostgres = process.env.TEST_DB === 'postgres';
if (usePostgres) {
  process.env.DB_TYPE = 'postgres';
  process.env.DATABASE_URL = process.env.TEST_PG_URL;
} else {
  process.env.DB_PATH = ':memory:';
}
process.env.LOG_LEVEL = 'silent';
process.env.NODE_ENV = 'test';
process.env.UPLOAD_DIR = require('node:os').tmpdir() + '/areascout-test-uploads';
process.env.RATE_LIMIT = 'false';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'a-long-unique-password';

import { AppModule } from './app.module';
import { applyAppSettings } from './bootstrap';
import { MailerService } from './common/mail/mailer.service';
import { SeedService } from './database/seed.service';

describe('AreaScout API', () => {
  let app: INestApplication;
  let http: App;
  const PHOTOS = [1, 2, 3, 4, 5].map((n) => `https://example.com/p${n}.jpg`);
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  const signUp = async (role: string, email: string) =>
    (await request(http).post('/v1/auth/register').send({ name: role, email, role, password: 'correct-horse-battery' }).expect(201)).body.data
      .token as string;

  /** Raw SQL with `?` placeholders, translated to `$1, $2…` on Postgres. */
  const sql = (text: string, params: unknown[] = []) => {
    let n = 0;
    return app.get(DataSource).query(usePostgres ? text.replace(/\?/g, () => `$${++n}`) : text, params);
  };

  beforeAll(async () => {
    if (usePostgres) {
      // Start from an empty schema so migrations are exercised from scratch.
      const c = new Client({ connectionString: process.env.TEST_PG_URL });
      await c.connect();
      await c.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
      await c.end();
    }
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    applyAppSettings(app);
    await app.init();
    http = app.getHttpServer();
  });
  afterAll(() => app.close());

  it('serves seeded live listings publicly with a move-in total', async () => {
    const res = await request(http).get('/v1/listings').expect(200);
    expect(res.body.status).toBe('success');
    const listings = res.body.data.listings;
    expect(listings).toHaveLength(3);
    const yaba = listings.find((l: { area_slug: string }) => l.area_slug === 'yaba');
    expect(yaba.move_in_total).toBe(1_800_000 + 180_000 + 180_000 + 200_000);
    const filtered = await request(http).get('/v1/listings?beds=2&max_rent=3000000').expect(200);
    expect(filtered.body.data.listings).toHaveLength(1);
  });

  it('requires a session and enforces roles', async () => {
    await request(http).get('/v1/me').expect(401);
    const tenant = await signUp('tenant', 'ada@example.com');
    await request(http).get('/v1/me').set(auth(tenant)).expect(200);
    await request(http).get('/v1/admin/dashboard').set(auth(tenant)).expect(403);
    await request(http).post('/v1/auth/register').send({ name: 'x', email: 'ada@example.com', password: 'correct-horse-battery' }).expect(409);
    await request(http).post('/v1/auth/register').send({ name: 'x', email: 'short@example.com', password: 'short' }).expect(400);
  });

  it('runs the listing → moderation → inspection → message flow', async () => {
    const landlord = await signUp('landlord', 'owner@example.com');
    const tenant = await signUp('tenant', 'renter@example.com');
    const admin = (await request(http).post('/v1/auth/login').send({ email: 'admin@example.com', password: 'a-long-unique-password' }).expect(200)).body.data.token;

    const created = await request(http)
      .post('/v1/listings')
      .set(auth(landlord))
      .send({ title: 'Self-contain · Akoka', address: '7 University Road', area: 'Yaba', property_type: 'Self-contain', rent: 950_000, agency_fee: 95_000, photos: PHOTOS })
      .expect(201);
    const id = created.body.data.listing_id;

    // Pending listings are hidden from search and from strangers.
    expect((await request(http).get('/v1/listings')).body.data.listings).toHaveLength(3);
    await request(http).get(`/v1/listings/${id}`).expect(404);
    await request(http).get(`/v1/listings/${id}`).set(auth(landlord)).expect(200);
    await request(http).patch(`/v1/admin/listings/${id}`).set(auth(landlord)).send({ status: 'live' }).expect(403);

    await request(http).patch(`/v1/admin/listings/${id}`).set(auth(admin)).send({ status: 'live' }).expect(200);
    expect((await request(http).get('/v1/listings')).body.data.listings).toHaveLength(4);

    // Owner edits send it back to review.
    await request(http).patch(`/v1/listings/${id}`).set(auth(landlord)).send({ rent: 900_000 }).expect(200);
    const edited = (await request(http).get(`/v1/listings/${id}`).set(auth(landlord))).body.data.listing;
    expect(edited.rent).toBe(900_000);
    expect(edited.photos).toHaveLength(5); // a partial edit leaves other fields alone
    expect(edited.agency_fee).toBe(95_000);
    await request(http).get(`/v1/listings/${id}`).expect(404);
    await request(http).patch(`/v1/admin/listings/${id}`).set(auth(admin)).send({ status: 'live' }).expect(200);

    await request(http).post(`/v1/saved/${id}`).set(auth(tenant)).expect(200);
    expect((await request(http).get('/v1/saved').set(auth(tenant))).body.data.listings).toHaveLength(1);

    const when = new Date(Date.now() + 3 * 86_400_000).toISOString();
    await request(http).post('/v1/inspections').set(auth(tenant)).send({ listing_id: id, requested_at: new Date(Date.now() - 1000).toISOString() }).expect(400);
    const insp = await request(http).post('/v1/inspections').set(auth(tenant)).send({ listing_id: id, requested_at: when }).expect(201);
    const inspId = insp.body.data.inspection_id;
    await request(http).patch(`/v1/inspections/${inspId}`).set(auth(tenant)).send({ status: 'confirmed' }).expect(403);
    await request(http).patch(`/v1/inspections/${inspId}`).set(auth(landlord)).send({ status: 'confirmed' }).expect(200);
    expect((await request(http).get('/v1/inspections').set(auth(landlord))).body.data.inspections[0].status).toBe('confirmed');

    const convo = await request(http).post('/v1/conversations').set(auth(tenant)).send({ listing_id: id, message: 'Is it still available?' }).expect(201);
    const cid = convo.body.data.conversation_id;
    await request(http).post(`/v1/conversations/${cid}/messages`).set(auth(landlord)).send({ message: 'Yes it is.' }).expect(201);
    const stranger = await signUp('tenant', 'nosy@example.com');
    await request(http).get(`/v1/conversations/${cid}`).set(auth(stranger)).expect(403);
    const thread = await request(http).get(`/v1/conversations/${cid}`).set(auth(tenant)).expect(200);
    expect(thread.body.data.messages).toHaveLength(2);

    await request(http).post(`/v1/listings/${id}/report`).set(auth(tenant)).send({ reason: 'scam' }).expect(201);
    expect((await request(http).get('/v1/admin/dashboard').set(auth(admin))).body.data.open_reports).toBe(1);
  });

  it('lets owners save drafts, submit them with enough photos, and see a dashboard', async () => {
    const landlord = await signUp('landlord', 'draft-owner@example.com');
    const body = { title: 'Terrace · Gbagada', address: '18 Diya Street', area: 'Gbagada', property_type: 'Terrace', rent: 5_500_000 };

    await request(http).post('/v1/listings').set(auth(landlord)).send(body).expect(400); // no photos, not a draft
    const draft = await request(http).post('/v1/listings').set(auth(landlord)).send({ ...body, draft: true }).expect(201);
    expect(draft.body.data.status).toBe('draft');
    const id = draft.body.data.listing_id;

    await request(http).get(`/v1/listings/${id}`).expect(404);
    await request(http).patch(`/v1/listings/${id}`).set(auth(landlord)).send({ draft: false }).expect(400); // still < 5 photos
    await request(http).patch(`/v1/listings/${id}`).set(auth(landlord)).send({ photos: PHOTOS.slice(0, 2), draft: true }).expect(200);
    const submitted = await request(http).patch(`/v1/listings/${id}`).set(auth(landlord)).send({ photos: PHOTOS, area: 'Ikeja', draft: false }).expect(200);
    expect(submitted.body.data.status).toBe('pending');
    expect((await request(http).get(`/v1/listings/${id}`).set(auth(landlord))).body.data.listing.area_slug).toBe('ikeja');
    await request(http).patch(`/v1/listings/${id}`).set(auth(landlord)).send({ draft: true }).expect(400); // can't go back to draft

    const dash = (await request(http).get('/v1/my/dashboard').set(auth(landlord)).expect(200)).body.data;
    expect(dash).toMatchObject({ pending_review: 1, drafts: 0, live_listings: 0, unanswered_messages: 0 });
    const tenant = await signUp('tenant', 'dash-tenant@example.com');
    await request(http).get('/v1/my/dashboard').set(auth(tenant)).expect(403);
  });

  it('accepts only real images as uploads, from owners', async () => {
    const landlord = await signUp('landlord', 'uploader@example.com');
    const tenant = await signUp('tenant', 'no-upload@example.com');
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
    await request(http).post('/v1/uploads').set(auth(tenant)).attach('file', png, 'a.png').expect(403);
    await request(http).post('/v1/uploads').set(auth(landlord)).attach('file', Buffer.from('<script>alert(1)</script>'), { filename: 'a.png', contentType: 'image/png' }).expect(400);
    await request(http).post('/v1/uploads').set(auth(landlord)).expect(400);
    const ok = await request(http).post('/v1/uploads').set(auth(landlord)).attach('file', png, 'a.png').expect(201);
    expect(ok.body.data.url).toMatch(/\/uploads\/[0-9a-f]{32}\.png$/);
    await request(http).get(new URL(ok.body.data.url).pathname).expect(200);
  });

  it('hides a listing after several independent reports and lets admins resolve them', async () => {
    const admin = (await request(http).post('/v1/auth/login').send({ email: 'admin@example.com', password: 'a-long-unique-password' })).body.data.token;
    const landlord = await signUp('landlord', 'reported@example.com');
    const mk = async (title: string, address: string) => {
      const id = (await request(http).post('/v1/listings').set(auth(landlord)).send({ title, address, area: 'Yaba', property_type: 'Mini flat', rent: 650_000, photos: PHOTOS }).expect(201)).body.data.listing_id;
      await request(http).patch(`/v1/admin/listings/${id}`).set(auth(admin)).send({ status: 'live' }).expect(200);
      return id as number;
    };
    const id = await mk('Mini flat, Ojuelegba', '1 Ojuelegba Road');
    const reporters = await Promise.all([1, 2, 3].map((n) => signUp('tenant', `rep${n}@example.com`)));

    await request(http).post(`/v1/listings/${id}/report`).set(auth(landlord)).send({ reason: 'scam' }).expect(400); // own listing
    await request(http).post(`/v1/listings/${id}/report`).set(auth(reporters[0])).send({ reason: 'scam', details: 'Asked for a fee' }).expect(201);
    await request(http).post(`/v1/listings/${id}/report`).set(auth(reporters[0])).send({ reason: 'scam' }).expect(201); // same person again: not counted twice
    await request(http).get(`/v1/listings/${id}`).expect(200); // still live with one reporter
    await request(http).post(`/v1/listings/${id}/report`).set(auth(reporters[1])).send({ reason: 'inaccurate' }).expect(201);
    await request(http).post(`/v1/listings/${id}/report`).set(auth(reporters[2])).send({ reason: 'inaccurate' }).expect(201);
    await request(http).get(`/v1/listings/${id}`).expect(404); // hidden pending review

    const queue = (await request(http).get('/v1/admin/reports').set(auth(admin)).expect(200)).body.data.reports;
    const g = queue.find((x: { listing_id: number }) => x.listing_id === id);
    expect(g).toMatchObject({ report_count: 3, reporters: 3, urgent: true, hidden_by_reports: true });
    expect(g.owner).toMatchObject({ name: 'landlord', verified: false });
    expect((await request(http).get('/v1/admin/dashboard').set(auth(admin))).body.data.urgent_reports).toBeGreaterThanOrEqual(1);
    // Reported listings sit in the reports queue, not the generic listing queue.
    const pending = (await request(http).get('/v1/admin/listings').set(auth(admin))).body.data.listings;
    expect(pending.find((l: { id: number }) => l.id === id)).toBeUndefined();

    await request(http).post(`/v1/admin/reports/listing/${id}/resolve`).set(auth(admin)).send({ action: 'dismiss' }).expect(201);
    await request(http).get(`/v1/listings/${id}`).expect(200); // restored
    await request(http).post(`/v1/admin/reports/listing/${id}/resolve`).set(auth(admin)).send({ action: 'dismiss' }).expect(404); // nothing left open

    const other = await mk('Mini flat, Yaba', '2 Yaba Road');
    await request(http).post(`/v1/listings/${other}/report`).set(auth(reporters[0])).send({ reason: 'scam' }).expect(201);
    await request(http).post(`/v1/admin/reports/listing/${other}/resolve`).set(auth(admin)).send({ action: 'remove_and_suspend', note: 'Fee before inspection' }).expect(201);
    await request(http).get(`/v1/listings/${id}`).expect(404); // all of the owner's listings come down
    await request(http).get('/v1/me').set(auth(landlord)).expect(401); // existing sessions stop working
    await request(http).post('/v1/auth/login').send({ email: 'reported@example.com', password: 'correct-horse-battery' }).expect(403);
    expect((await request(http).get('/v1/admin/dashboard').set(auth(admin))).body.data.resolved_this_week).toBeGreaterThanOrEqual(4);
  });

  it('flags suspicious submissions, and lets admins verify and suspend users', async () => {
    const admin = (await request(http).post('/v1/auth/login').send({ email: 'admin@example.com', password: 'a-long-unique-password' })).body.data.token;
    const landlord = await signUp('landlord', 'flagged@example.com');
    const base = { area: 'Surulere', property_type: '2-bedroom flat', photos: PHOTOS };
    // The seeded live Surulere flat asks ₦3.2m; a second comparable lets the average be computed.
    const comp = (await request(http).post('/v1/listings').set(auth(landlord)).send({ ...base, title: 'Comp', address: '9 Comp Street', rent: 3_000_000 }).expect(201)).body.data.listing_id;
    await request(http).patch(`/v1/admin/listings/${comp}`).set(auth(admin)).send({ status: 'live' }).expect(200);
    await request(http).post('/v1/listings').set(auth(landlord)).send({ ...base, title: 'Too cheap', address: '4 Adeniran Ogunsanya, Surulere', rent: 900_000 }).expect(201);

    const flagged = (await request(http).get('/v1/admin/listings').set(auth(admin))).body.data.listings.find((l: { title: string }) => l.title === 'Too cheap');
    expect(flagged.flags.map((f: { type: string }) => f.type).sort()).toEqual(['duplicate', 'low_price']);

    const users = (await request(http).get('/v1/admin/users?q=flagged').set(auth(admin)).expect(200)).body.data.users;
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ role: 'landlord', verified: false, suspended: false, listing_count: 2 });
    await request(http).patch(`/v1/admin/users/${users[0].id}`).set(auth(admin)).send({ verified: true }).expect(200);
    expect((await request(http).get('/v1/me').set(auth(landlord))).body.data.user.verified).toBe(true);
    const adminUser = (await request(http).get('/v1/admin/users?role=admin').set(auth(admin))).body.data.users[0];
    await request(http).patch(`/v1/admin/users/${adminUser.id}`).set(auth(admin)).send({ suspended: true }).expect(400);
    await request(http).patch(`/v1/admin/users/${users[0].id}`).set(auth(admin)).send({ suspended: true }).expect(200);
    await request(http).get('/v1/me').set(auth(landlord)).expect(401);
    await request(http).patch(`/v1/admin/users/${users[0].id}`).set(auth(admin)).send({ suspended: false }).expect(200);
    await request(http).post('/v1/auth/login').send({ email: 'flagged@example.com', password: 'correct-horse-battery' }).expect(200);
  });

  it('tracks views, saves and inquiries per listing for the owner', async () => {
    const landlord = await signUp('landlord', 'stats-owner@example.com');
    const admin = (await request(http).post('/v1/auth/login').send({ email: 'admin@example.com', password: 'a-long-unique-password' })).body.data.token;
    const id = (await request(http).post('/v1/listings').set(auth(landlord)).send({ title: 'Stats flat', address: '3 Stats Road', area: 'Ikeja', property_type: 'Terrace', rent: 6_000_000, photos: PHOTOS }).expect(201)).body.data.listing_id;
    await request(http).patch(`/v1/admin/listings/${id}`).set(auth(admin)).send({ status: 'live' }).expect(200);
    const tenant = await signUp('tenant', 'stats-tenant@example.com');

    await request(http).get(`/v1/listings/${id}`).expect(200);
    await request(http).get(`/v1/listings/${id}`).set(auth(tenant)).expect(200);
    await request(http).get(`/v1/listings/${id}`).set(auth(landlord)).expect(200); // the owner's own views don't count
    await request(http).post(`/v1/saved/${id}`).set(auth(tenant)).expect(200);
    await request(http).post('/v1/conversations').set(auth(tenant)).send({ listing_id: id, message: 'Hello there' }).expect(201);

    const mine = (await request(http).get('/v1/my/listings').set(auth(landlord)).expect(200)).body.data.listings.find((l: { id: number }) => l.id === id);
    expect(mine.stats).toEqual({ views: 2, saves: 1, inquiries: 1 });
  });

  it('lets people edit their profile, change password, set preferences and manage saved searches', async () => {
    const email = 'account@example.com';
    const token = await signUp('tenant', email);
    const other = (await request(http).post('/v1/auth/login').send({ email, password: 'correct-horse-battery' }).expect(200)).body.data.token; // a second device

    const me = (await request(http).patch('/v1/me').set(auth(token)).send({ name: 'Ada Okafor', phone: '0803 214 7765' }).expect(200)).body.data.user;
    expect(me).toMatchObject({ name: 'Ada Okafor', phone: '0803 214 7765', email });
    await request(http).patch('/v1/me').set(auth(token)).send({ phone: 'call me' }).expect(400);
    await request(http).patch('/v1/me').set(auth(token)).send({}).expect(400);

    await request(http).post('/v1/me/password').set(auth(token)).send({ current_password: 'wrong-password-here', new_password: 'another-long-password' }).expect(400); // a wrong password must not look like an expired session
    await request(http).post('/v1/me/password').set(auth(token)).send({ current_password: 'correct-horse-battery', new_password: 'short' }).expect(400);
    await request(http).post('/v1/me/password').set(auth(token)).send({ current_password: 'correct-horse-battery', new_password: 'another-long-password' }).expect(200);
    await request(http).get('/v1/me').set(auth(token)).expect(200); // this device stays signed in
    await request(http).get('/v1/me').set(auth(other)).expect(401); // other devices are signed out
    await request(http).post('/v1/auth/login').send({ email, password: 'correct-horse-battery' }).expect(401);
    await request(http).post('/v1/auth/login').send({ email, password: 'another-long-password' }).expect(200);

    expect((await request(http).get('/v1/me/preferences').set(auth(token))).body.data.preferences).toEqual({ inspection_updates: true, messages: true, saved_search_alerts: true, area_report_updates: true });
    const prefs = (await request(http).put('/v1/me/preferences').set(auth(token)).send({ messages: false }).expect(200)).body.data.preferences;
    expect(prefs).toMatchObject({ messages: false, inspection_updates: true });
    expect((await request(http).get('/v1/me/preferences').set(auth(token))).body.data.preferences.messages).toBe(false);

    await request(http).post('/v1/saved-searches').set(auth(token)).send({ name: 'Nothing', filters: {} }).expect(400);
    const created = (await request(http).post('/v1/saved-searches').set(auth(token)).send({ name: '2-beds under ₦3m', filters: { beds: 2, max_rent: 3_000_000 } }).expect(201)).body.data.search;
    expect(created).toMatchObject({ match_count: 1, new_count: 0 });

    // A new matching listing appears after the search was saved.
    const admin = (await request(http).post('/v1/auth/login').send({ email: 'admin@example.com', password: 'a-long-unique-password' })).body.data.token;
    const landlord = await signUp('landlord', 'search-owner@example.com');
    const lid = (await request(http).post('/v1/listings').set(auth(landlord)).send({ title: 'New 2-bed', address: '5 New Street', area: 'Ikeja', property_type: '2-bedroom flat', bedrooms: 2, rent: 2_500_000, photos: PHOTOS }).expect(201)).body.data.listing_id;
    await request(http).patch(`/v1/admin/listings/${lid}`).set(auth(admin)).send({ status: 'live' }).expect(200);

    const list = (await request(http).get('/v1/saved-searches').set(auth(token)).expect(200)).body.data.searches;
    expect(list[0]).toMatchObject({ match_count: 2, new_count: 1 });
    expect((await request(http).post(`/v1/saved-searches/${created.id}/seen`).set(auth(token)).expect(200)).body.data.search.new_count).toBe(0);
    expect((await request(http).patch(`/v1/saved-searches/${created.id}`).set(auth(token)).send({ alerts: false }).expect(200)).body.data.search.alerts).toBe(false);
    await request(http).delete(`/v1/saved-searches/${created.id}`).set(auth(landlord)).expect(403); // renters only
    const stranger = await signUp('tenant', 'search-stranger@example.com');
    await request(http).delete(`/v1/saved-searches/${created.id}`).set(auth(stranger)).expect(404); // someone else's
    await request(http).delete(`/v1/saved-searches/${created.id}`).set(auth(token)).expect(200);
  });

  it('exports and deletes an account, scrubbing personal data', async () => {
    const admin = (await request(http).post('/v1/auth/login').send({ email: 'admin@example.com', password: 'a-long-unique-password' })).body.data.token;
    const landlord = await signUp('landlord', 'goodbye-owner@example.com');
    const lid = (await request(http).post('/v1/listings').set(auth(landlord)).send({ title: 'Goodbye flat', address: '1 Bye Road', area: 'Yaba', property_type: 'Mini flat', rent: 1_000_000, photos: PHOTOS }).expect(201)).body.data.listing_id;
    await request(http).patch(`/v1/admin/listings/${lid}`).set(auth(admin)).send({ status: 'live' }).expect(200);
    const tenant = await signUp('tenant', 'goodbye@example.com');
    await request(http).post(`/v1/saved/${lid}`).set(auth(tenant)).expect(200);
    await request(http).post('/v1/conversations').set(auth(tenant)).send({ listing_id: lid, message: 'Is it free?' }).expect(201);

    const data = (await request(http).get('/v1/me/export').set(auth(tenant)).expect(200)).body.data;
    expect(data.account.email).toBe('goodbye@example.com');
    expect(data.saved_homes).toHaveLength(1);
    expect(data.conversations[0].messages[0]).toMatchObject({ from_you: true, body: 'Is it free?' });
    expect(JSON.stringify(data)).not.toMatch(/password|hash/i);

    await request(http).delete('/v1/me').set(auth(tenant)).send({ password: 'wrong' }).expect(400);
    await request(http).delete('/v1/me').set(auth(admin)).send({ password: 'a-long-unique-password' }).expect(400); // admins can't
    await request(http).delete('/v1/me').set(auth(tenant)).send({ password: 'correct-horse-battery' }).expect(200);
    await request(http).get('/v1/me').set(auth(tenant)).expect(401);
    await request(http).post('/v1/auth/login').send({ email: 'goodbye@example.com', password: 'correct-horse-battery' }).expect(401);
    await request(http).post('/v1/auth/register').send({ name: 'x', email: 'goodbye@example.com', password: 'correct-horse-battery' }).expect(201); // the email is free again

    // The conversation survives for the lister, but the deleted person is anonymised.
    const convo = (await request(http).get('/v1/conversations').set(auth(landlord)).expect(200)).body.data.conversations[0];
    expect(convo.with).toBe('Deleted user');

    // A lister who deletes their account takes their listings down.
    await request(http).delete('/v1/me').set(auth(landlord)).send({ password: 'correct-horse-battery' }).expect(200);
    await request(http).get(`/v1/listings/${lid}`).expect(404);
  });

  it('lets renters browse any city and landlords list in places that are new', async () => {
    const cities = (await request(http).get('/v1/locations').expect(200)).body.data.cities;
    expect(cities[0]).toMatchObject({ city: 'Lagos' }); // busiest first
    expect(cities.map((c: { city: string }) => c.city)).toEqual(expect.arrayContaining(['Abuja', 'Port Harcourt', 'Ibadan']));
    expect(cities.find((c: { city: string }) => c.city === 'Abuja').listing_count).toBe(0);

    const abujaAreas = (await request(http).get('/v1/areas?city=abuja').expect(200)).body.data.areas;
    expect(abujaAreas.length).toBeGreaterThan(3);
    expect(abujaAreas.every((a: { city: string; power: string }) => a.city === 'Abuja' && a.power === 'No data')).toBe(true);
    expect((await request(http).get('/v1/listings?city=Abuja').expect(200)).body.data.listings).toHaveLength(0);

    const admin = (await request(http).post('/v1/auth/login').send({ email: 'admin@example.com', password: 'a-long-unique-password' })).body.data.token;
    const landlord = await signUp('landlord', 'abuja-owner@example.com');
    const base = { title: '3-bed in Wuse', address: '10 Aminu Kano Crescent', property_type: 'Flat', rent: 7_000_000, photos: PHOTOS };

    await request(http).post('/v1/listings').set(auth(landlord)).send(base).expect(400); // no place at all
    await request(http).post('/v1/listings').set(auth(landlord)).send({ ...base, city: 'Abuja', neighbourhood: '<script>' }).expect(400);
    // Same neighbourhood, different spelling and case: reuses the existing area rather than duplicating it.
    const id = (await request(http).post('/v1/listings').set(auth(landlord)).send({ ...base, city: 'abuja', neighbourhood: 'wuse  2' }).expect(201)).body.data.listing_id;
    await request(http).patch(`/v1/admin/listings/${id}`).set(auth(admin)).send({ status: 'live' }).expect(200);
    expect((await request(http).get('/v1/areas?city=Abuja').expect(200)).body.data.areas).toHaveLength(abujaAreas.length);
    expect((await request(http).get('/v1/listings?city=ABUJA').expect(200)).body.data.listings).toHaveLength(1);
    expect((await request(http).get('/v1/listings?city=Lagos').expect(200)).body.data.listings.some((l: { id: number }) => l.id === id)).toBe(false);

    // A town nobody has listed in yet is created on demand, and appears in the picker.
    const id2 = (await request(http).post('/v1/listings').set(auth(landlord)).send({ ...base, title: 'Kano flat', city: 'kano', neighbourhood: 'nassarawa gra' }).expect(201)).body.data.listing_id;
    const listing = (await request(http).get(`/v1/listings/${id2}`).set(auth(landlord))).body.data.listing;
    expect(listing).toMatchObject({ city: 'Kano', area: 'Nassarawa Gra', area_slug: 'kano-nassarawa-gra' });
    expect((await request(http).get('/v1/locations')).body.data.cities.some((c: { city: string }) => c.city === 'Kano')).toBe(true);

    // Moving an existing listing to another place.
    await request(http).patch(`/v1/listings/${id2}`).set(auth(landlord)).send({ city: 'Abuja', neighbourhood: 'Garki' }).expect(200);
    expect((await request(http).get(`/v1/listings/${id2}`).set(auth(landlord))).body.data.listing).toMatchObject({ city: 'Abuja', area: 'Garki' });

    // Saved searches can be about a city.
    const tenant = await signUp('tenant', 'abuja-renter@example.com');
    const search = (await request(http).post('/v1/saved-searches').set(auth(tenant)).send({ name: 'Abuja', filters: { city: 'Abuja' } }).expect(201)).body.data.search;
    expect(search.match_count).toBe(1);
  });

  it('starts neighbourhoods unrated and clears old invented demo ratings', async () => {
    const yaba = (await request(http).get('/v1/areas/yaba').expect(200)).body.data.area;
    expect(yaba).toMatchObject({ power: 'No data', flooding: 'No data', score: 0, community_reports: 0 });

    // A database seeded by the old version still holds the invented values; booting clears them.
    await sql("UPDATE areas SET power='Good', flooding='Fair', security='Good', water='Fair', transport='Good', internet='Good', score=82 WHERE slug='yaba'");
    await app.get(SeedService).onApplicationBootstrap();
    expect((await request(http).get('/v1/areas/yaba')).body.data.area).toMatchObject({ power: 'No data', score: 0 });

    // But ratings that residents have published are never touched.
    await sql("UPDATE areas SET power='Good', flooding='Fair', security='Good', water='Fair', transport='Good', internet='Good', score=82 WHERE slug='surulere'");
    await sql("UPDATE areas SET power='Fair', flooding='Good', security='Good', water='Good', transport='Good', internet='Fair', score=78 WHERE slug='gbagada'");
    await app.get(SeedService).onApplicationBootstrap();
    expect((await request(http).get('/v1/areas/surulere')).body.data.area.power).toBe('Good'); // not the legacy values for that area
  });

  it('lets renters rate a lister only after a confirmed visit, and shows the lister\'s phone to signed-in renters', async () => {
    const admin = (await request(http).post('/v1/auth/login').send({ email: 'admin@example.com', password: 'a-long-unique-password' })).body.data.token;
    const landlord = (await request(http).post('/v1/auth/register').send({ name: 'Tunde Bakare', email: 'rated-owner@example.com', phone: '0803 214 7765', role: 'agent', password: 'correct-horse-battery' })).body.data.token;
    const id = (await request(http).post('/v1/listings').set(auth(landlord)).send({ title: 'Rated flat', address: '9 Rating Road', area: 'Yaba', property_type: 'Mini flat', rent: 1_200_000, photos: PHOTOS }).expect(201)).body.data.listing_id;
    await request(http).patch(`/v1/admin/listings/${id}`).set(auth(admin)).send({ status: 'live' }).expect(200);
    const tenant = await signUp('tenant', 'rater@example.com');
    const other = await signUp('tenant', 'not-there@example.com');

    // Phone: hidden from anonymous visitors and from the lister themself, shown to signed-in renters.
    expect((await request(http).get(`/v1/listings/${id}`).expect(200)).body.data.listing.owner_phone).toBeNull();
    expect((await request(http).get(`/v1/listings/${id}`).set(auth(tenant)).expect(200)).body.data.listing.owner_phone).toBe('0803 214 7765');
    expect((await request(http).get(`/v1/listings/${id}`).set(auth(landlord)).expect(200)).body.data.listing.owner_phone).toBeNull();
    expect((await request(http).get(`/v1/listings/${id}`).expect(200)).body.data.listing.owner_rating).toEqual({ average: null, count: 0 });

    const when = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const iid = (await request(http).post('/v1/inspections').set(auth(tenant)).send({ listing_id: id, requested_at: when }).expect(201)).body.data.inspection_id;
    await request(http).post('/v1/lister-reviews').set(auth(tenant)).send({ inspection_id: iid, rating: 5 }).expect(400); // not confirmed, not happened
    await request(http).patch(`/v1/inspections/${iid}`).set(auth(landlord)).send({ status: 'confirmed' }).expect(200);
    await request(http).post('/v1/lister-reviews').set(auth(tenant)).send({ inspection_id: iid, rating: 5 }).expect(400); // confirmed but still in the future
    await sql('UPDATE inspections SET requested_at=? WHERE id=?', [new Date(Date.now() - 3_600_000).toISOString(), iid]);

    expect((await request(http).get('/v1/inspections').set(auth(tenant))).body.data.inspections[0]).toMatchObject({ can_review: true, reviewed: false, owner_name: 'Tunde Bakare' });
    await request(http).post('/v1/lister-reviews').set(auth(other)).send({ inspection_id: iid, rating: 5 }).expect(404); // someone else's visit
    await request(http).post('/v1/lister-reviews').set(auth(tenant)).send({ inspection_id: iid, rating: 6 }).expect(400);
    await request(http).post('/v1/lister-reviews').set(auth(landlord)).send({ inspection_id: iid, rating: 5 }).expect(403); // renters only
    const review = await request(http).post('/v1/lister-reviews').set(auth(tenant)).send({ inspection_id: iid, rating: 4, comment: 'On time and honest about the fees.' }).expect(201);
    await request(http).post('/v1/lister-reviews').set(auth(tenant)).send({ inspection_id: iid, rating: 1 }).expect(409); // once per visit

    expect((await request(http).get('/v1/inspections').set(auth(tenant))).body.data.inspections[0]).toMatchObject({ can_review: false, reviewed: true });
    expect((await request(http).get(`/v1/listings/${id}`).expect(200)).body.data.listing.owner_rating).toEqual({ average: 4, count: 1 });
    const ownerId = (await request(http).get(`/v1/listings/${id}`)).body.data.listing.owner_id;
    const list = (await request(http).get(`/v1/listers/${ownerId}/reviews`).expect(200)).body.data;
    expect(list.reviews[0]).toMatchObject({ rating: 4, reviewer: 'tenant', comment: 'On time and honest about the fees.' });

    // Admins can hide an abusive review; it stops counting.
    await request(http).patch(`/v1/admin/lister-reviews/${review.body.data.review_id}`).set(auth(tenant)).send({ status: 'hidden' }).expect(403);
    await request(http).patch(`/v1/admin/lister-reviews/${review.body.data.review_id}`).set(auth(admin)).send({ status: 'hidden' }).expect(200);
    expect((await request(http).get(`/v1/listings/${id}`)).body.data.listing.owner_rating).toEqual({ average: null, count: 0 });
  });

  it('resets a forgotten password with an emailed one-time code', async () => {
    const mail: string[] = [];
    const spy = jest.spyOn(app.get(MailerService), 'send').mockImplementation(async (m) => { mail.push(m.text); });
    const email = 'forgot@example.com';
    const old = await signUp('tenant', email);

    await request(http).post('/v1/auth/forgot-password').send({ email: 'nobody@example.com' }).expect(200); // same answer for unknown emails
    expect(mail).toHaveLength(0);
    await request(http).post('/v1/auth/forgot-password').send({ email }).expect(200);
    const code = mail[0].match(/\b(\d{8})\b/)![1];

    await request(http).post('/v1/auth/reset-password').send({ email, code: '00000000', new_password: 'a-brand-new-password' }).expect(400);
    await request(http).post('/v1/auth/reset-password').send({ email, code, new_password: 'short' }).expect(400);
    await request(http).post('/v1/auth/reset-password').send({ email, code, new_password: 'a-brand-new-password' }).expect(200);
    await request(http).post('/v1/auth/reset-password').send({ email, code, new_password: 'yet-another-password' }).expect(400); // single use
    await request(http).get('/v1/me').set(auth(old)).expect(401); // old sessions are gone
    await request(http).post('/v1/auth/login').send({ email, password: 'correct-horse-battery' }).expect(401);
    await request(http).post('/v1/auth/login').send({ email, password: 'a-brand-new-password' }).expect(200);

    // Five wrong guesses burn the code, even if the sixth is right.
    await request(http).post('/v1/auth/forgot-password').send({ email }).expect(200);
    const code2 = mail[1].match(/\b(\d{8})\b/)![1];
    for (let i = 0; i < 5; i++) await request(http).post('/v1/auth/reset-password').send({ email, code: code2 === '11111111' ? '22222222' : '11111111', new_password: 'a-brand-new-password' }).expect(400);
    await request(http).post('/v1/auth/reset-password').send({ email, code: code2, new_password: 'a-brand-new-password' }).expect(400);
    spy.mockRestore();
  });

  it('only counts published area reports in community averages', async () => {
    const tenant = await signUp('tenant', 'reviewer@example.com');
    const admin = (await request(http).post('/v1/auth/login').send({ email: 'admin@example.com', password: 'a-long-unique-password' })).body.data.token;
    const review = await request(http).post('/v1/area-reviews').set(auth(tenant)).send({ area: 'surulere', power: 2, flooding: 4, comment: 'Light goes out most evenings.' }).expect(201);

    const before = await request(http).get('/v1/areas/surulere').expect(200);
    expect(before.body.data.area.community_reports).toBe(0);

    await request(http).patch(`/v1/admin/area-reviews/${review.body.data.review_id}`).set(auth(admin)).send({ status: 'published' }).expect(200);
    const after = (await request(http).get('/v1/areas/surulere').expect(200)).body.data;
    expect(after.area.community_reports).toBe(1);
    expect(after.area.rating_averages).toEqual({ power: 2, flooding: 4 });
    expect(after.reviews).toHaveLength(1);
  });

  it('reports health', async () => {
    await request(http).get('/health').expect(200);
  });
});

describe('rate limiting', () => {
  it('slows down repeated sign-in attempts', async () => {
    process.env.RATE_LIMIT = 'true';
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const limited = mod.createNestApplication();
    applyAppSettings(limited);
    await limited.init();
    try {
      const codes: number[] = [];
      for (let i = 0; i < 12; i++) codes.push((await request(limited.getHttpServer()).post('/v1/auth/login').send({ email: 'x@example.com', password: 'wrong-password' })).status);
      expect(codes.slice(0, 10).every((c) => c === 401)).toBe(true);
      expect(codes.slice(10)).toEqual([429, 429]);
      expect((await request(limited.getHttpServer()).get('/health')).status).toBe(200); // ordinary traffic is unaffected
    } finally {
      await limited.close();
      process.env.RATE_LIMIT = 'false';
    }
  });
});
