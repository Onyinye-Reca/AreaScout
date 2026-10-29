/* ---- Admin pages: overview, reports, listings to review, users, reviews ----
   Loaded after host.js (it reuses pageLoad, withData, tag, tile and the page registries). */

const REASON = {
  scam: ['Possible scam', 'poor'], inaccurate: ['Wrong price or details', 'fair'], unavailable: ['No longer available', 'fair'],
  duplicate: ['Duplicate listing', 'fair'], other: ['Something else', 'fair'],
};
const shortAgo = (iso) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso)) / 60000));
  if (m < 60) return m + ' min';
  if (m < 1440) { const h = Math.round(m / 60); return h + (h === 1 ? ' hr' : ' hrs'); }
  const d = Math.round(m / 1440);
  return d + (d === 1 ? ' day' : ' days');
};
const topReason = (g) => [...g.reports].sort((a, b) => (b.reason === 'scam') - (a.reason === 'scam'))[0].reason;
const reportCard = (g) => {
  const [label, tone] = REASON[topReason(g)];
  return `<button class="row-card column" data-report="${g.listing_id}"><div class="row-top">${tag(label, tone)}<span class="grow"></span><small>${shortAgo(g.oldest_at)}</small></div><b>${esc(g.listing_title)}</b><small>${g.report_count} ${g.report_count === 1 ? 'report' : 'reports'} · ${g.owner.verified ? 'verified' : 'unverified'} ${esc(g.owner.role)}: “${esc(g.owner.name)}”</small></button>`;
};

/* ---- Overview ---- */
PAGE_LOADERS.admin = () => pageLoad('admin', async () => {
  const [dashboard, reports, listings] = await Promise.all([api('/admin/dashboard'), api('/admin/reports'), api('/admin/listings')]);
  return { d: dashboard, reports: reports.reports, listings: listings.listings };
});
EXTRA_CRUMBS.admin = 'Overview';
EXTRA_PAGES.admin = () => withData('admin', ({ d, reports, listings }) => {
  const urgent = reports.filter((r) => r.urgent);
  const link = (page, value, label) => `<button class="stat-tile link" data-page="${page}"><b>${value}</b><span>${label}</span></button>`;
  return `${heading('ADMIN · MODERATION', 'Overview', 'What needs a decision today.')}
    <div class="stat-tiles four">
      ${link('admin-reports', d.open_reports, `Open reports${d.urgent_reports ? ` · ${d.urgent_reports} urgent` : ''}`)}
      ${link('admin-listings', d.pending_listings, 'Listings to review')}
      ${link('admin-reviews', d.pending_area_reviews, 'Area reviews to moderate')}
      ${tile(d.resolved_this_week, 'Resolved this week')}
    </div>
    <section class="section"><div class="section-head"><h2>Urgent reports</h2>${reports.length ? `<button class="text-link" data-page="admin-reports">All ${reports.length}</button>` : ''}</div>
      <div class="row-list">${urgent.length ? urgent.slice(0, 3).map(reportCard).join('') : `<p class="hint">${reports.length ? 'Nothing urgent. Open reports are under Reports.' : 'No open reports. Nice and quiet.'}</p>`}</div></section>
    <section class="section"><div class="section-head"><h2>Listings to review</h2>${listings.length > 3 ? `<button class="text-link" data-page="admin-listings">All ${listings.length}</button>` : ''}</div>
      ${listings.length ? `<div class="row-list">${listings.slice(0, 3).map((l) => `<button class="row-card" data-page="admin-listings"><div class="grow"><b>${esc(l.title)}</b><small>${esc(l.flags[0]?.detail || `${l.owner_name} · submitted ${ago(l.updated_at)}`)}</small></div>${tag(l.flags.length ? 'Auto-flagged' : 'New', l.flags.length ? 'neutral' : 'good')}</button>`).join('')}</div>` : '<p class="hint">No listings waiting.</p>'}</section>`;
});

/* ---- Reports, grouped by listing ---- */
PAGE_LOADERS['admin-reports'] = () => pageLoad('admin-reports', async () => (await api('/admin/reports')).reports);
EXTRA_CRUMBS['admin-reports'] = 'Reports';
EXTRA_PAGES['admin-reports'] = () => withData('admin-reports', (groups) => `${heading('REPORTS', 'Reports', 'Grouped by listing, most urgent first.')}
  ${groups.length ? `<div class="row-list">${groups.map(reportCard).join('')}</div>` : '<div class="empty-state"><h2>No open reports</h2><p>When renters report a listing, it shows up here.</p></div>'}`);

const REPORT_ACTIONS = (g) => [
  ...(g.owner.role !== 'admin' ? [['remove_and_suspend', 'Remove listing and suspend lister', `Hides all ${g.owner.listing_count} ${g.owner.listing_count === 1 ? 'listing' : 'listings'}, blocks sign-in`, true]] : []),
  ['remove', 'Remove this listing only', 'The lister can still list other properties', true],
  ['request_info', 'Ask lister for more information', 'Listing stays hidden while we wait', false],
  ['dismiss', 'Dismiss reports', g.hidden_by_reports ? 'Listing goes back live' : 'Listing stays as it is', false],
];
function openReportReview(id) {
  state.reportReview = { id, action: null };
  setPage('report-review');
  PAGE_LOADERS['report-review']();
}
PAGE_LOADERS['report-review'] = () => pageLoad('report-review', () => api('/admin/reports/listing/' + state.reportReview.id));
EXTRA_CRUMBS['report-review'] = 'Report';
EXTRA_PAGES['report-review'] = () => withData('report-review', (g) => {
  const o = g.owner;
  const chosen = state.reportReview?.action;
  const status = g.listing_status === 'live' ? tag('Live', 'good') : g.listing_status === 'removed' ? tag('Removed') : tag('Hidden pending review', 'poor');
  return `<button class="detail-back" data-page="admin-reports">← Back to reports</button>
    ${heading('REPORT', esc(g.listing_title), `Opened ${shortAgo(g.oldest_at)} ago · ${g.reporters} ${g.reporters === 1 ? 'reporter' : 'reporters'}`)}
    <div class="editor">
      <section class="card"><div class="row-top"><div class="row-thumb" style="${photoStyle(g.photo)}"></div><div class="grow"><b>${esc(g.listing_title)}</b><small>${money(g.rent)} /yr</small>${status}</div></div></section>
      <section class="card"><h2>What reporters said</h2>${g.reports.map((r) => `<blockquote class="said"><b class="${REASON[r.reason][1]}-text">${REASON[r.reason][0]}</b><p>${r.details ? '“' + esc(r.details) + '”' : 'No details given.'}</p></blockquote>`).join('')}</section>
      <section class="card"><h2>${o.role === 'agent' ? 'Agent' : 'Landlord'}: ${esc(o.name)}</h2><dl class="facts">
        <dt>Account age</dt><dd>${o.account_age_days === 0 ? 'Today' : o.account_age_days + (o.account_age_days === 1 ? ' day' : ' days')}</dd>
        <dt>Verification</dt><dd class="${o.verified ? '' : 'bad'}">${o.verified ? 'Verified' : 'Not verified'}</dd>
        <dt>Listings</dt><dd>${o.listing_count}</dd>
        <dt>Past reports</dt><dd class="${o.past_reports ? 'bad' : ''}">${o.past_reports ? o.past_reports + ' on other listings' : 'None'}</dd></dl></section>
      <section class="card"><h2>Action</h2><div class="radio-list" role="radiogroup">${REPORT_ACTIONS(g).map(([v, t, sub]) => `<label class="radio-card ${chosen === v ? 'on' : ''}"><input type="radio" name="report-action" value="${v}" ${chosen === v ? 'checked' : ''}><span><b>${t}</b><small>${sub}</small></span></label>`).join('')}</div>
        <div class="fld"><label for="report-note">Note (optional)</label><textarea id="report-note" rows="2" placeholder="Recorded with the reports">${esc(state.reportReview?.note || '')}</textarea></div></section>
      <div class="editor-actions"><button class="btn btn-primary" data-action="apply-report" ${chosen ? '' : 'disabled'}>Apply action</button></div>
    </div>`;
});
async function applyReportAction() {
  const rv = state.reportReview;
  const g = pd['report-review']?.data;
  if (!rv?.action || !g) return;
  const run = async (root) => {
    try {
      await api(`/admin/reports/listing/${g.listing_id}/resolve`, { method: 'POST', body: { action: rv.action, note: document.querySelector('#report-note')?.value.trim() || '' } });
      if (root) root.innerHTML = '';
      toast('Reports resolved');
      setPage('admin-reports');
      PAGE_LOADERS['admin-reports']();
    } catch (e) { toast(e.message); }
  };
  const [, title, , danger] = REPORT_ACTIONS(g).find((a) => a[0] === rv.action);
  if (danger) modal(title + '?', '<p>This closes all open reports on this listing.</p>', 'Confirm', run);
  else run();
}

/* ---- Listings to review ---- */
PAGE_LOADERS['admin-listings'] = () => pageLoad('admin-listings', async () => (await api('/admin/listings')).listings);
EXTRA_CRUMBS['admin-listings'] = 'Listings to review';
EXTRA_PAGES['admin-listings'] = () => withData('admin-listings', (list) => `${heading('LISTINGS', 'Listings to review', 'Oldest first. Flagged ones need a closer look.')}
  ${list.length ? `<div class="row-list">${list.map((l) => `<div class="row-card static column">
      <div class="row-top"><div class="grow"><b>${esc(l.title)}</b><small>${esc(l.owner_name)}${l.owner_verified ? ' · verified' : ''} · submitted ${ago(l.updated_at)}</small></div>${l.flags.length ? l.flags.map((f) => tag(f.detail, 'fair')).join(' ') : tag('New', 'good')}</div>
      <small>${esc(l.property_type)} · ${l.bedrooms} bed · ${l.bathrooms} bath · ${money(l.rent)}/yr · move-in ${money(l.move_in_total)}</small>
      <small>${esc(l.address)}, ${esc(l.area)}, ${esc(l.city)}</small>
      <p class="quote">${esc(l.description || 'No description.')}</p>
      <div class="thumbs">${l.photos.map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener" class="row-thumb" style="${photoStyle(u)}" aria-label="Open photo"></a>`).join('') || '<small>No photos</small>'}</div>
      <div class="row-actions-inline"><button class="btn btn-outline" data-moderate="${l.id}" data-status="rejected" data-title="${esc(l.title)}">Reject</button><button class="btn btn-primary" data-moderate="${l.id}" data-status="live">Approve</button></div></div>`).join('')}</div>` : '<div class="empty-state"><h2>All caught up</h2><p>New listings appear here for review before renters see them.</p></div>'}`);

/* ---- Users ---- */
PAGE_LOADERS['admin-users'] = () => pageLoad('admin-users', async () => {
  const q = new URLSearchParams();
  if (state.userQuery) q.set('q', state.userQuery);
  if (state.userRole) q.set('role', state.userRole);
  return (await api('/admin/users?' + q)).users;
});
EXTRA_CRUMBS['admin-users'] = 'Users';
EXTRA_PAGES['admin-users'] = () => `${heading('PEOPLE', 'Users', 'Verify trusted listers, or suspend an account that breaks the rules.')}
  <form class="toolbar" id="user-search"><input id="user-q" placeholder="Search name or email" value="${esc(state.userQuery || '')}" aria-label="Search users"><select id="user-role" aria-label="Role">${[['', 'All roles'], ['tenant', 'Renters'], ['landlord', 'Landlords'], ['agent', 'Agents']].map(([v, t]) => `<option value="${v}" ${(state.userRole || '') === v ? 'selected' : ''}>${t}</option>`).join('')}</select><button class="btn btn-primary">Search</button></form>
  ${withData('admin-users', (users) => users.length ? `<div class="row-list">${users.map((u) => `<div class="row-card static"><span class="message-avatar">${esc(initials(u.name))}</span><div class="grow"><b>${esc(u.name)}</b><small>${esc(u.email)}</small><span>${tag(u.role[0].toUpperCase() + u.role.slice(1))} ${u.verified ? tag('Verified', 'good') : ''} ${u.suspended ? tag('Suspended', 'poor') : ''} ${u.listing_count ? tag(u.listing_count + ' listings') : ''}</span></div>${u.role === 'admin' ? '' : `<div class="row-actions"><button class="btn btn-outline" data-user="verify" data-id="${u.id}" data-on="${u.verified}">${u.verified ? 'Remove verification' : 'Verify'}</button><button class="text-link ${u.suspended ? '' : 'danger'}" data-user="suspend" data-id="${u.id}" data-on="${u.suspended}" data-name="${esc(u.name)}" data-count="${u.listing_count}">${u.suspended ? 'Lift suspension' : 'Suspend'}</button></div>`}</div>`).join('')}</div>` : '<div class="empty-state"><h2>No users found</h2><p>Try a different name or filter.</p></div>')}`;

/* ---- Area reports and lister reviews ---- */
PAGE_LOADERS['admin-reviews'] = () => pageLoad('admin-reviews', async () => {
  const [areas, listers] = await Promise.all([api('/admin/area-reviews'), api('/admin/lister-reviews')]);
  return { areas: areas.area_reviews, listers: listers.reviews };
});
EXTRA_CRUMBS['admin-reviews'] = 'Reviews';
const RATED = ['power', 'flooding', 'security', 'water', 'transport', 'internet'];
EXTRA_PAGES['admin-reviews'] = () => withData('admin-reviews', ({ areas, listers }) => `${heading('REVIEWS', 'Reviews', 'Approve only what’s accurate and free of personal details.')}
  <section class="section"><div class="section-head"><h2>Area reports to approve</h2></div>${areas.length ? `<div class="row-list">${areas.map((r) => `<div class="row-card static column"><div class="row-top"><b>${esc(r.area)}</b><span class="grow"></span><small>${ago(r.created_at)}</small></div><small>${esc(r.reviewer)} · ${RATED.filter((k) => r[k] != null).map((k) => `${k} ${r[k]}/5`).join(', ')}</small><p class="quote">${esc(r.comment)}</p><div class="row-actions-inline"><button class="btn btn-outline" data-area-review="${r.id}" data-status="rejected">Reject</button><button class="btn btn-primary" data-area-review="${r.id}" data-status="published">Approve</button></div></div>`).join('')}</div>` : '<p class="hint">Nothing to moderate.</p>'}</section>
  <section class="section"><div class="section-head"><h2>Reviews of landlords and agents</h2></div>${listers.length ? `<div class="row-list">${listers.slice(0, 30).map((r) => `<div class="row-card static column"><div class="row-top"><b>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</b>${r.status === 'hidden' ? tag('Hidden', 'poor') : ''}<span class="grow"></span><small>${ago(r.created_at)}</small></div><small>${esc(r.reviewer)}</small>${r.comment ? `<p class="quote">${esc(r.comment)}</p>` : ''}<div class="row-actions-inline"><button class="btn btn-outline" data-lister-review="${r.id}" data-status="${r.status === 'hidden' ? 'published' : 'hidden'}">${r.status === 'hidden' ? 'Show again' : 'Hide review'}</button></div></div>`).join('')}</div>` : '<p class="hint">No reviews yet.</p>'}</section>`);

/* ---- Events for the admin pages ---- */
async function adminCall(path, method, body, done, message) {
  try { await api(path, { method, body }); toast(message); done(); } catch (e) { toast(e.message); }
}
document.addEventListener('click', (e) => {
  const act = e.target.closest('[data-action]')?.dataset.action;
  if (act === 'apply-report') applyReportAction();

  const rep = e.target.closest('[data-report]');
  if (rep) { openReportReview(Number(rep.dataset.report)); return; }

  const mod = e.target.closest('[data-moderate]');
  if (mod) {
    const id = mod.dataset.moderate, status = mod.dataset.status;
    const run = (root) => adminCall('/admin/listings/' + id, 'PATCH', { status }, () => { if (root) root.innerHTML = ''; PAGE_LOADERS['admin-listings'](); }, status === 'live' ? 'Listing approved — it’s now live' : 'Listing rejected');
    if (status === 'rejected') modal('Reject this listing?', `<p>“${mod.dataset.title}” won’t be shown to renters.</p>`, 'Reject', run);
    else run();
    return;
  }
  const u = e.target.closest('[data-user]');
  if (u) {
    const id = u.dataset.id, on = u.dataset.on === 'true';
    const reload = (root) => { if (root) root.innerHTML = ''; PAGE_LOADERS['admin-users'](); };
    if (u.dataset.user === 'verify') adminCall('/admin/users/' + id, 'PATCH', { verified: !on }, reload, on ? 'Verification removed' : 'Account verified');
    else if (on) adminCall('/admin/users/' + id, 'PATCH', { suspended: false }, reload, 'Suspension lifted');
    else modal('Suspend this account?', `<p>${u.dataset.name} will be signed out and their ${u.dataset.count} active ${u.dataset.count === '1' ? 'listing is' : 'listings are'} removed.</p>`, 'Suspend', (root) => adminCall('/admin/users/' + id, 'PATCH', { suspended: true }, () => reload(root), 'Account suspended'));
    return;
  }
  const ar = e.target.closest('[data-area-review]');
  if (ar) { adminCall('/admin/area-reviews/' + ar.dataset.areaReview, 'PATCH', { status: ar.dataset.status }, () => PAGE_LOADERS['admin-reviews'](), ar.dataset.status === 'published' ? 'Report published' : 'Report rejected'); return; }
  const lr = e.target.closest('[data-lister-review]');
  if (lr) adminCall('/admin/lister-reviews/' + lr.dataset.listerReview, 'PATCH', { status: lr.dataset.status }, () => PAGE_LOADERS['admin-reviews'](), lr.dataset.status === 'hidden' ? 'Review hidden' : 'Review visible again');
});
document.querySelector('#view').addEventListener('submit', (e) => {
  if (e.target.id !== 'user-search') return;
  e.preventDefault();
  state.userQuery = document.querySelector('#user-q').value.trim();
  state.userRole = document.querySelector('#user-role').value;
  PAGE_LOADERS['admin-users']();
});
document.querySelector('#view').addEventListener('change', (e) => {
  if (e.target.name === 'report-action' && state.reportReview) {
    state.reportReview.action = e.target.value;
    state.reportReview.note = document.querySelector('#report-note')?.value || '';
    render();
  }
});
