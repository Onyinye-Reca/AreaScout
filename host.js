/* ---- Landlord and agent pages: dashboard, listing editor, inspection requests ----
   Loaded before app.js; it uses app.js's helpers (api, esc, heading, modal, toast, state, render, setPage)
   at call time, and registers its pages in EXTRA_PAGES. */

const EXTRA_PAGES = {};
const EXTRA_CRUMBS = {};
const PAGE_LOADERS = {};

/* Data for pages that load from the API: pd[key] is {loading} | {error} | {data}. */
const pd = {};
function pageLoad(key, fetcher) {
  pd[key] = { loading: true };
  render();
  fetcher()
    .then((data) => { pd[key] = { data }; })
    .catch((e) => { pd[key] = { error: e.message }; })
    .then(() => { if (state.page === key) render(); });
}
function withData(key, build) {
  const p = pd[key];
  if (!p || p.loading) return '<div class="empty-state"><h2>Loading…</h2></div>';
  if (p.error) return `<div class="empty-state"><h2>Couldn’t load this</h2><p>${esc(p.error)}</p><button class="btn btn-primary" data-action="retry-page">Try again</button></div>`;
  return build(p.data);
}
const tag = (label, tone = 'neutral') => `<span class="tag tag-${tone}">${esc(label)}</span>`;
const tile = (value, label) => `<div class="stat-tile"><b>${value ?? '–'}</b><span>${label}</span></div>`;
const photoStyle = (url) => (/^https?:\/\//.test(url || '') ? `background-image:url('${encodeURI(url).replace(/'/g, '%27')}')` : '');
const greetingName = () => (state.user ? esc(state.user.name.split(' ')[0]) : '');

/* ---- Dashboard ---- */
const LISTING_STATUS = {
  live: ['Live', 'good'], pending: ['Under review', 'fair'], draft: ['Draft', 'neutral'],
  rejected: ['Not approved', 'poor'], removed: ['Removed', 'neutral'],
};
PAGE_LOADERS.host = () => pageLoad('host', async () => {
  const [d, mine] = await Promise.all([api('/my/dashboard'), api('/my/listings')]);
  return { d, listings: mine.listings.filter((l) => l.status !== 'removed') };
});
EXTRA_CRUMBS.host = 'Dashboard';
EXTRA_PAGES.host = () => withData('host', ({ d, listings }) => {
  const draft = listings.find((l) => l.status === 'draft');
  const attention = [
    d.pending_inspections > 0 && `<button class="row-card" data-page="host-inspections"><div><b>${d.pending_inspections} inspection ${d.pending_inspections === 1 ? 'request' : 'requests'}</b><small>Waiting for you to confirm</small></div><span class="arrow">›</span></button>`,
    d.unanswered_messages > 0 && `<button class="row-card" data-page="messages"><div><b>${d.unanswered_messages} unanswered ${d.unanswered_messages === 1 ? 'message' : 'messages'}</b><small>${d.oldest_unanswered_at ? 'Oldest from ' + ago(d.oldest_unanswered_at) : ''}</small></div><span class="arrow">›</span></button>`,
    draft && `<button class="row-card" data-edit-listing="${draft.id}"><div><b>Finish your draft</b><small>${esc(draft.title)}</small></div><span class="arrow">›</span></button>`,
  ].filter(Boolean);
  const phoneNote = state.user.phone ? '' : '<div class="notice">Add your phone number so renters can call or WhatsApp you once you’re approved. <button class="text-link" data-action="edit-profile">Add it now</button></div>';
  return `${heading('YOUR LISTINGS', `Hello, ${greetingName()}`, 'Manage your homes, inspection requests and messages.', '<button class="btn btn-primary" data-action="new-listing">＋ New listing</button>')}
    ${phoneNote}
    <div class="stat-tiles">${tile(d.live_listings, 'Live listings')}${tile(d.unanswered_messages, 'Unanswered messages')}${tile(d.upcoming_inspections, 'Inspections this week')}</div>
    ${attention.length ? `<section class="section"><div class="section-head"><h2>Needs your attention</h2></div><div class="row-list">${attention.join('')}</div></section>` : ''}
    <section class="section"><div class="section-head"><h2>Your listings</h2></div>
    ${listings.length ? `<div class="row-list">${listings.map((l) => {
      const [label, tone] = LISTING_STATUS[l.status];
      const sub = l.status === 'live' && l.stats ? `${l.stats.views} views · ${l.stats.saves} saves · ${l.stats.inquiries} inquiries` : `Updated ${ago(l.updated_at)}`;
      return `<div class="row-card static"><div class="row-thumb" style="${photoStyle(l.photos[0])}"></div><div class="grow"><b>${esc(l.title)}</b><small>${esc(l.area)}, ${esc(l.city)} · ${money(l.rent)}/yr</small><small>${sub}</small>${tag(label, tone)}</div><div class="row-actions"><button class="btn btn-outline" data-edit-listing="${l.id}">Edit</button><button class="text-link danger" data-remove-listing="${l.id}" data-title="${esc(l.title)}">Remove</button></div></div>`;
    }).join('')}</div>` : '<div class="empty-state"><h2>No listings yet</h2><p>Add your first home. We check every listing before renters see it.</p><button class="btn btn-primary" data-action="new-listing">＋ New listing</button></div>'}
    </section>`;
});

/* ---- Listing editor ---- */
const MIN_PHOTOS = 5; // keep in step with the API
const HOME_TYPES = ['Self-contain', 'Mini flat', '2-bedroom flat', '3-bedroom flat', 'Terrace', 'Duplex'];
const loc = { cities: [], areas: {} }; // cached city list and neighbourhoods per city

const blankForm = () => ({ title: '', type: '', city: state.city || '', neighbourhood: '', address: '', bedrooms: 1, bathrooms: 1, rent: '', features: '', description: '', photos: [], agency: '', legal: '', caution: '', service: '' });
const formFromListing = (l) => ({
  title: l.title, type: l.property_type, city: l.city, neighbourhood: l.area, address: l.address, bedrooms: l.bedrooms, bathrooms: l.bathrooms,
  rent: String(l.rent), features: l.features.join(', '), description: l.description, photos: l.photos,
  agency: String(l.agency_fee), legal: String(l.legal_fee), caution: String(l.caution_deposit), service: String(l.service_charge),
});
const digitsOnly = (v) => String(v).replace(/[^0-9]/g, '');
const amount = (v) => Number(digitsOnly(v) || 0);

/** Problems per section; an empty list means the section is complete. */
function validateForm(f) {
  const details = [];
  if (!f.title.trim()) details.push('Add a title');
  if (!f.type) details.push('Choose a home type');
  if (!f.city.trim()) details.push('Choose a city');
  if (!f.neighbourhood.trim()) details.push('Choose a neighbourhood');
  if (!f.address.trim()) details.push('Add the street address');
  if (!amount(f.rent)) details.push('Enter the yearly rent');
  if (f.description.trim().length < 20) details.push('Describe the home in at least 20 characters');
  const photos = f.photos.length < MIN_PHOTOS ? [`Add at least ${MIN_PHOTOS - f.photos.length} more photo${MIN_PHOTOS - f.photos.length === 1 ? '' : 's'} (bathroom and kitchen photos are required)`] : [];
  const draftOk = details.filter((x) => !x.startsWith('Describe')).length === 0;
  const missing = ['agency', 'legal', 'caution', 'service'].filter((k) => String(f[k]).trim() === '');
  const costs = missing.length ? ['Fill in every cost. Enter 0 if one doesn’t apply'] : [];
  return { details, photos, costs, draftOk, all: [...details, ...photos, ...costs] };
}

async function loadLocations(city) {
  try {
    if (!loc.cities.length) loc.cities = (await api('/locations')).cities.map((c) => c.city);
    const key = (city || '').trim().toLowerCase();
    if (key && !loc.areas[key]) loc.areas[key] = (await api('/areas?city=' + encodeURIComponent(city.trim()))).areas.map((a) => a.name);
    paintDatalists(city);
  } catch { /* suggestions are optional */ }
}
function paintDatalists(city) {
  const cities = document.querySelector('#dl-cities');
  const areasEl = document.querySelector('#dl-areas');
  if (cities) cities.innerHTML = loc.cities.map((c) => `<option value="${esc(c)}">`).join('');
  if (areasEl) areasEl.innerHTML = (loc.areas[(city || '').trim().toLowerCase()] || []).map((a) => `<option value="${esc(a)}">`).join('');
}

function openEditor(id) {
  if (id === 'new') {
    state.editor = { id: 'new', status: 'draft', form: blankForm(), loaded: true, confirmed: false };
    setPage('editor');
    loadLocations(state.editor.form.city);
    return;
  }
  state.editor = { id, loaded: false, confirmed: false };
  setPage('editor');
  api('/listings/' + id)
    .then((r) => {
      state.editor.form = formFromListing(r.listing);
      state.editor.status = r.listing.status;
      state.editor.loaded = true;
      render();
      loadLocations(state.editor.form.city);
    })
    .catch((e) => { state.editor.error = e.message; render(); });
}

EXTRA_CRUMBS.editor = 'Listing';
EXTRA_PAGES.editor = () => {
  const ed = state.editor;
  if (!ed) return '<div class="empty-state"><h2>Nothing to edit</h2><button class="btn btn-primary" data-page="host">Back to dashboard</button></div>';
  if (ed.error) return `<div class="empty-state"><h2>Couldn’t open this listing</h2><p>${esc(ed.error)}</p><button class="btn btn-primary" data-page="host">Back to dashboard</button></div>`;
  if (!ed.loaded) return '<div class="empty-state"><h2>Loading…</h2></div>';
  const f = ed.form;
  const p = validateForm(f);
  const shown = ed.showErrors;
  const canDraft = ed.id === 'new' || ed.status === 'draft';
  const input = (key, label, attrs = '') => `<div class="fld"><label for="ef-${key}">${label}</label><input id="ef-${key}" data-ef="${key}" value="${esc(f[key])}" ${attrs}></div>`;
  const costField = (key, label) => input(key, label, 'inputmode="numeric" placeholder="₦ 0"');
  return `<button class="detail-back" data-action="editor-cancel">← Back to dashboard</button>
    ${heading(ed.id === 'new' ? 'NEW LISTING' : 'EDIT LISTING', ed.id === 'new' ? 'Add a home' : 'Edit your listing', ed.id !== 'new' && ed.status !== 'draft' ? 'Saving sends this listing back for review. Renters won’t see it until it’s approved again.' : 'Tell renters what they need to decide. We check every listing before it goes live.')}
    ${shown && p.all.length ? `<div class="notice bad" role="alert"><b>${p.all.length} ${p.all.length === 1 ? 'thing' : 'things'} to fix before you can submit:</b><ul>${p.all.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    ${state.user.phone ? '' : '<div class="notice">Add your phone number so renters can call you once you’re approved. <button class="text-link" data-action="edit-profile">Add it now</button></div>'}
    <div class="editor">
      <section class="card"><h2>Details</h2>
        <div class="form-grid">
          ${input('title', 'Title', 'placeholder="e.g. 2-bedroom flat, Surulere" maxlength="120"')}
          <div class="fld"><label for="ef-type">Home type</label><select id="ef-type" data-ef="type"><option value="">Choose…</option>${HOME_TYPES.map((t) => `<option ${f.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          ${input('city', 'City', 'list="dl-cities" autocomplete="off" placeholder="Choose or type any city"')}
          ${input('neighbourhood', 'Neighbourhood', 'list="dl-areas" autocomplete="off" placeholder="Choose or type a new one"')}
          ${input('address', 'Street address', 'placeholder="e.g. 18 Diya Street"')}
          ${input('rent', 'Rent per year (₦)', 'inputmode="numeric" placeholder="e.g. 3200000"')}
          <div class="fld"><label for="ef-bedrooms">Bedrooms</label><input id="ef-bedrooms" data-ef="bedrooms" type="number" min="0" max="20" value="${f.bedrooms}"></div>
          <div class="fld"><label for="ef-bathrooms">Bathrooms</label><input id="ef-bathrooms" data-ef="bathrooms" type="number" min="0" max="20" value="${f.bathrooms}"></div>
        </div>
        <datalist id="dl-cities">${loc.cities.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
        <datalist id="dl-areas">${(loc.areas[f.city.trim().toLowerCase()] || []).map((a) => `<option value="${esc(a)}">`).join('')}</datalist>
        ${input('features', 'Features (comma separated)', 'placeholder="Prepaid meter, Gated compound, Borehole"')}
        <div class="fld"><label for="ef-description">Description</label><textarea id="ef-description" data-ef="description" rows="4" placeholder="What makes this home a good place to live?">${esc(f.description)}</textarea></div>
        ${shown && p.details.length ? `<ul class="errs">${p.details.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      </section>
      <section class="card ${shown && p.photos.length ? 'invalid' : ''}"><div class="card-head"><h2>Photos</h2><span class="count ${p.photos.length ? 'bad' : ''}">${f.photos.length} of ${MIN_PHOTOS} minimum</span></div>
        <p class="hint">The first photo is the cover. JPEG, PNG or WebP, up to 5 MB each.</p>
        <div class="photo-grid">${f.photos.map((u, i) => `<div class="photo-cell"><div class="photo-img" style="${photoStyle(u)}" role="img" aria-label="Photo ${i + 1}"></div>${i === 0 ? '<span class="cover-tag">COVER</span>' : ''}<div class="photo-actions">${i > 0 ? `<button class="text-link" data-photo-cover="${i}">Make cover</button>` : ''}<button class="text-link danger" data-photo-remove="${i}">Remove</button></div></div>`).join('')}
          <label class="photo-add" for="photo-input"><span>＋</span>${ed.uploading ? `Uploading ${ed.uploading}…` : 'Add photos'}</label>
          <input id="photo-input" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden>
        </div>
        ${ed.photoError ? `<ul class="errs"><li>${esc(ed.photoError)}</li></ul>` : ''}
        ${shown && p.photos.length ? `<ul class="errs">${p.photos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      </section>
      <section class="card ${shown && p.costs.length ? 'invalid' : ''}"><h2>Costs to move in</h2>
        <p class="hint">Renters see these totals before they decide. Enter 0 if a charge doesn’t apply.</p>
        <div class="form-grid">${costField('agency', 'Agency fee')}${costField('legal', 'Legal fee')}${costField('caution', 'Caution deposit')}${costField('service', 'Service charge (per year)')}</div>
        <p class="total">Renters will see a move-in total of <b>${money_(amount(f.rent) + amount(f.agency) + amount(f.legal) + amount(f.caution) + amount(f.service))}</b></p>
        ${shown && p.costs.length ? `<ul class="errs">${p.costs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      </section>
      <label class="confirm"><input type="checkbox" id="ef-confirm" ${ed.confirmed ? 'checked' : ''}> <span>I confirm I’m authorised to let this property and the details are accurate. Listings are checked before going live.</span></label>
      <div class="editor-actions">
        ${canDraft ? `<button class="btn btn-outline" data-action="editor-draft" ${ed.busy ? 'disabled' : ''}>Save draft</button>` : ''}
        <button class="btn btn-primary" data-action="editor-submit" ${ed.busy ? 'disabled' : ''}>${ed.busy === 'submit' ? 'Submitting…' : 'Submit for review'}</button>
      </div>
    </div>`;
};
/* `money` is shadowed by the cost-field helper above, so keep a handle on the currency formatter. */
const money_ = (n) => '₦' + Number(n).toLocaleString('en-NG');

async function uploadPhotos(files) {
  const ed = state.editor;
  ed.photoError = '';
  const good = [...files].filter((f) => {
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { ed.photoError = `“${f.name}” isn’t a JPEG, PNG or WebP image`; return false; }
    if (f.size > 5 * 1024 * 1024) { ed.photoError = `“${f.name}” is over 5 MB`; return false; }
    return true;
  }).slice(0, 20 - ed.form.photos.length);
  ed.uploading = good.length;
  render();
  for (const file of good) {
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(API + '/uploads', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || 'Couldn’t upload that photo');
      ed.form.photos.push(json.data.url);
    } catch (e) { ed.photoError = e.message; }
    ed.uploading--;
    render();
  }
}

async function saveEditor(asDraft) {
  const ed = state.editor;
  const f = ed.form;
  const p = validateForm(f);
  if (asDraft ? !p.draftOk : p.all.length || !ed.confirmed) {
    ed.showErrors = true;
    if (asDraft) toast('To save a draft, add a title, home type, city, neighbourhood, address and rent first');
    if (!asDraft && !p.all.length) toast('Tick the box to confirm you’re authorised to let this property');
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  ed.busy = asDraft ? 'draft' : 'submit';
  render();
  const body = {
    title: f.title.trim(), description: f.description.trim(), address: f.address.trim(), property_type: f.type,
    bedrooms: Number(f.bedrooms) || 0, bathrooms: Number(f.bathrooms) || 0, rent: amount(f.rent),
    agency_fee: amount(f.agency), legal_fee: amount(f.legal), caution_deposit: amount(f.caution), service_charge: amount(f.service),
    features: f.features.split(',').map((x) => x.trim()).filter(Boolean), photos: f.photos,
    city: f.city.trim(), neighbourhood: f.neighbourhood.trim(), draft: asDraft,
  };
  try {
    if (ed.id === 'new') await api('/listings', { method: 'POST', body });
    else await api('/listings/' + ed.id, { method: 'PATCH', body });
    state.editor = null;
    toast(asDraft ? 'Draft saved' : 'Submitted for review — we’ll check it before renters see it');
    setPage('host');
  } catch (e) {
    ed.busy = null;
    toast(e.message);
    render();
  }
}

/* ---- Inspection requests ---- */
PAGE_LOADERS['host-inspections'] = () => pageLoad('host-inspections', async () => (await api('/inspections')).inspections);
EXTRA_CRUMBS['host-inspections'] = 'Inspections';
const inspBucket = (i) => {
  if (i.status === 'pending') return 'requests';
  const future = new Date(i.requested_at).getTime() >= Date.now();
  return (i.status === 'confirmed' || i.status === 'new_time') && future ? 'upcoming' : 'past';
};
const INSP_TAG = { pending: ['Pending', 'fair'], confirmed: ['Confirmed', 'good'], declined: ['Declined', 'poor'], new_time: ['New time sent', 'fair'], cancelled: ['Cancelled', 'neutral'] };
const whenText = (iso) => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
EXTRA_PAGES['host-inspections'] = () => withData('host-inspections', (all) => {
  const tab = state.hostTab || 'requests';
  const count = (t) => all.filter((i) => inspBucket(i) === t).length;
  const shown = all.filter((i) => inspBucket(i) === tab).sort((a, b) => (tab === 'past' ? b.requested_at.localeCompare(a.requested_at) : a.requested_at.localeCompare(b.requested_at)));
  return `${heading('VISITS', 'Inspections', 'Confirm, reschedule or decline the visits renters ask for.')}
    <div class="tabs" role="tablist">${['requests', 'upcoming', 'past'].map((t) => `<button role="tab" aria-selected="${tab === t}" class="${tab === t ? 'on' : ''}" data-host-tab="${t}">${t[0].toUpperCase() + t.slice(1)}${t === 'requests' && count('requests') ? ` <span class="badge-dark">${count('requests')}</span>` : ''}</button>`).join('')}</div>
    ${shown.length ? `<div class="row-list">${shown.map((i) => {
      const [label, tone] = INSP_TAG[i.status];
      return `<div class="row-card static column"><div class="row-top"><span class="message-avatar">${esc(initials(i.tenant_name || '?'))}</span><div class="grow"><b>${esc(i.tenant_name)}</b><small>${esc(i.listing_title || '')}</small></div>${tag(label, tone)}</div>
        <div class="when">📅 ${whenText(i.requested_at)}</div>${i.note ? `<p class="quote">“${esc(i.note)}”</p>` : ''}
        ${i.status === 'pending' ? `<div class="row-actions-inline"><button class="btn btn-outline" data-insp="newtime" data-id="${i.id}">New time</button><button class="btn btn-primary" data-insp="confirm" data-id="${i.id}">Confirm</button><button class="text-link danger" data-insp="decline" data-id="${i.id}" data-name="${esc(i.tenant_name || 'The renter')}">Decline request</button></div>` : ''}</div>`;
    }).join('')}</div>` : `<div class="empty-state"><h2>${tab === 'requests' ? 'No requests waiting' : tab === 'upcoming' ? 'Nothing coming up' : 'No past inspections'}</h2><p>${tab === 'requests' ? 'When a renter asks to see one of your homes, it shows up here.' : 'Confirmed visits appear here.'}</p></div>`}`;
});

async function respondInspection(id, status, extra = {}) {
  try {
    await api('/inspections/' + id, { method: 'PATCH', body: { status, ...extra } });
    document.querySelector('#modal-root').innerHTML = '';
    toast(status === 'confirmed' ? 'Confirmed — the renter has been told' : status === 'declined' ? 'Request declined' : 'New time sent');
    PAGE_LOADERS['host-inspections']();
  } catch (e) { toast(e.message); }
}
function newTimeModal(id) {
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  modal('Suggest a new time', `<p>The renter will see your suggestion under their inspection updates.</p><label for="nt-date">Day</label><input id="nt-date" type="date" min="${tomorrow}" value="${tomorrow}"><label for="nt-time">Time</label><select id="nt-time">${[9, 10, 11, 12, 14, 15, 16].map((h) => `<option value="${h}">${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'pm' : 'am'}</option>`).join('')}</select><label for="nt-note">Message to the renter (optional)</label><textarea id="nt-note" placeholder="e.g. I’m not free then, but this works."></textarea>`, 'Send suggestion', (root) => {
    const day = root.querySelector('#nt-date').value;
    if (!day) { toast('Choose a day'); return; }
    const at = new Date(`${day}T${String(root.querySelector('#nt-time').value).padStart(2, '0')}:00:00`);
    respondInspection(id, 'new_time', { requested_at: at.toISOString(), owner_note: root.querySelector('#nt-note').value.trim() });
  });
}

/* ---- Events for the host pages ---- */
document.querySelector('#view').addEventListener('input', (e) => {
  const key = e.target.dataset?.ef;
  if (key && state.editor?.form) {
    state.editor.form[key] = e.target.value;
    state.editor.dirty = true;
    if (key === 'rent' || key === 'agency' || key === 'legal' || key === 'caution' || key === 'service') {
      const total = document.querySelector('.editor .total b');
      const f = state.editor.form;
      if (total) total.textContent = money_(amount(f.rent) + amount(f.agency) + amount(f.legal) + amount(f.caution) + amount(f.service));
    }
  }
});
document.querySelector('#view').addEventListener('change', (e) => {
  if (e.target.id === 'photo-input' && state.editor) { uploadPhotos(e.target.files); e.target.value = ''; return; }
  if (e.target.id === 'ef-confirm' && state.editor) { state.editor.confirmed = e.target.checked; return; }
  if (e.target.dataset?.ef === 'city' && state.editor) loadLocations(e.target.value);
});
document.addEventListener('click', (e) => {
  const act = e.target.closest('[data-action]')?.dataset.action;
  if (act === 'new-listing') openEditor('new');
  if (act === 'editor-cancel') {
    const done = () => { state.editor = null; setPage('host'); };
    if (state.editor?.dirty) modal('Leave without saving?', '<p>Your changes will be lost.</p>', 'Leave', (r) => { r.innerHTML = ''; done(); });
    else done();
  }
  if (act === 'editor-draft') saveEditor(true);
  if (act === 'editor-submit') saveEditor(false);
  if (act === 'retry-page') PAGE_LOADERS[state.page]?.();

  const edit = e.target.closest('[data-edit-listing]');
  if (edit) {
    const id = Number(edit.dataset.editListing);
    const l = pd.host?.data?.listings.find((x) => x.id === id);
    if (l && (l.status === 'live' || l.status === 'pending')) {
      modal('Edit this listing?', '<p>Changes send the listing back for review, and it won’t show to renters until it’s approved again.</p>', 'Edit anyway', (r) => { r.innerHTML = ''; openEditor(id); });
    } else openEditor(id);
    return;
  }
  const rm = e.target.closest('[data-remove-listing]');
  if (rm) {
    modal('Remove this listing?', `<p>“${rm.dataset.title}” will no longer be visible to renters.</p>`, 'Remove listing', async (r) => {
      try { await api('/listings/' + rm.dataset.removeListing, { method: 'DELETE' }); r.innerHTML = ''; toast('Listing removed'); PAGE_LOADERS.host(); } catch (err) { toast(err.message); }
    });
    return;
  }
  const cover = e.target.closest('[data-photo-cover]');
  if (cover && state.editor) { const i = Number(cover.dataset.photoCover); const p = state.editor.form.photos; state.editor.form.photos = [p[i], ...p.filter((_, j) => j !== i)]; render(); return; }
  const del = e.target.closest('[data-photo-remove]');
  if (del && state.editor) { const i = Number(del.dataset.photoRemove); state.editor.form.photos = state.editor.form.photos.filter((_, j) => j !== i); render(); return; }
  const tab = e.target.closest('[data-host-tab]');
  if (tab) { state.hostTab = tab.dataset.hostTab; render(); return; }
  const insp = e.target.closest('[data-insp]');
  if (insp) {
    const id = Number(insp.dataset.id);
    if (insp.dataset.insp === 'confirm') respondInspection(id, 'confirmed');
    if (insp.dataset.insp === 'newtime') newTimeModal(id);
    if (insp.dataset.insp === 'decline') modal('Decline this request?', `<p>${esc(insp.dataset.name)} will be told you can’t host this visit.</p>`, 'Decline', () => respondInspection(id, 'declined'));
  }
});
