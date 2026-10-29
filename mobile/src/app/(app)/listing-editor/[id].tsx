import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, CircleAlert, CircleCheck, Plus, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorState, Loading } from '../../../components/States';
import { BottomBar, Button, Chip, Field, Mono } from '../../../components/ui';
import { api, errorMessage, uploadPhoto } from '../../../lib/api';
import { naira } from '../../../lib/format';
import { useLoad } from '../../../lib/hooks';
import { colors, font, radius, space } from '../../../lib/theme';
import { useAuth } from '../../../lib/auth';
import { useCity } from '../../../lib/location';
import type { Area, CityInfo, Listing } from '../../../lib/types';

const MIN_PHOTOS = 5; // keep in step with the API
const TYPES = ['Self-contain', 'Mini flat', '2-bedroom flat', '3-bedroom flat', 'Terrace', 'Duplex'];
const STEPS = ['Details', 'Photos', 'Costs', 'Review'] as const;

interface Form {
  title: string; type: string; city: string; neighbourhood: string; address: string;
  bedrooms: number; bathrooms: number; rent: string;
  features: string; description: string; photos: string[];
  agency: string; legal: string; caution: string; service: string;
}

const EMPTY: Form = { title: '', type: '', city: '', neighbourhood: '', address: '', bedrooms: 1, bathrooms: 1, rent: '', features: '', description: '', photos: [], agency: '', legal: '', caution: '', service: '' };
const digits = (v: string) => v.replace(/[^0-9]/g, '');
const num = (v: string) => Number(digits(v) || 0);

function fromListing(l: Listing): Form {
  return {
    title: l.title, type: l.property_type, city: l.city, neighbourhood: l.area, address: l.address, bedrooms: l.bedrooms, bathrooms: l.bathrooms,
    rent: String(l.rent), features: l.features.join(', '), description: l.description, photos: l.photos,
    agency: String(l.agency_fee), legal: String(l.legal_fee), caution: String(l.caution_deposit), service: String(l.service_charge),
  };
}

/** Problems per section; an empty list means the section is complete. */
function validate(f: Form) {
  const details: string[] = [];
  if (!f.title.trim()) details.push('Add a title');
  if (!f.type) details.push('Choose a home type');
  if (!f.city.trim()) details.push('Choose a city');
  if (!f.neighbourhood.trim()) details.push('Choose a neighbourhood');
  if (!f.address.trim()) details.push('Add the street address');
  if (!num(f.rent)) details.push('Enter the yearly rent');
  const photos = f.photos.length < MIN_PHOTOS ? [`Add at least ${MIN_PHOTOS - f.photos.length} more: bathroom and kitchen photos are required.`] : [];
  const missing = (['agency', 'legal', 'caution', 'service'] as const).filter((k) => f[k].trim() === '');
  const costs = missing.length ? [`${missing.length} missing`] : [];
  const description = f.description.trim().length < 20 ? ['Describe the home in at least 20 characters'] : [];
  return { details, photos, costs, description };
}

export default function ListingEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { city: searchCity } = useCity();
  const { user } = useAuth();
  const cities = useLoad(() => api<{ cities: CityInfo[] }>('/locations').then((r) => r.cities));
  const [placeCity, setPlaceCity] = useState(isNew ? searchCity : ''); // the city whose neighbourhoods are suggested; updates on pick or when typing ends
  const areas = useLoad(() => (placeCity ? api<{ areas: Area[] }>(`/areas?city=${encodeURIComponent(placeCity)}`).then((r) => r.areas) : Promise.resolve([] as Area[])), [placeCity]);
  const existing = useLoad(async () => (isNew ? null : api<{ listing: Listing }>(`/listings/${id}`).then((r) => r.listing)), [id]);

  const [form, setForm] = useState<Form>({ ...EMPTY, city: searchCity });
  const [loadedFrom, setLoadedFrom] = useState<Listing | null>(null);
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0); // furthest step seen; errors only show for steps the user has been through
  const [dirty, setDirty] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<'draft' | 'submit' | null>(null);
  const [uploading, setUploading] = useState(0);
  const [done, setDone] = useState<'draft' | 'submit' | null>(null);

  // Fill the form once when an existing listing arrives (setting state while rendering, guarded, is React's pattern for this).
  if (existing.data && !loadedFrom) {
    const f = fromListing(existing.data);
    setForm(f);
    setPlaceCity(f.city);
    setLoadedFrom(existing.data);
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((p) => ({ ...p, [k]: v })); setDirty(true); };
  const problems = useMemo(() => validate(form), [form]);
  const issueCount = problems.details.length + (problems.photos.length ? 1 : 0) + (problems.costs.length ? 1 : 0) + problems.description.length;
  const canDraft = isNew || loadedFrom?.status === 'draft';
  const go = (n: number) => { setStep(n); setReached((r) => Math.max(r, n)); };

  function close() {
    if (!dirty) return router.back();
    Alert.alert('Leave without saving?', canDraft ? 'Your changes will be lost unless you save a draft.' : 'Your changes will be lost.', [
      { text: 'Keep editing', style: 'cancel' }, { text: 'Leave', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  async function addPhotos() {
    const room = 20 - form.photos.length;
    if (room <= 0) return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: Math.min(room, 10), quality: 0.8 });
    if (r.canceled) return;
    setUploading(r.assets.length);
    const urls: string[] = [];
    for (const a of r.assets) {
      try { urls.push(await uploadPhoto(a.uri)); }
      catch (e) { Alert.alert('A photo didn’t upload', errorMessage(e)); }
      setUploading((n) => n - 1);
    }
    if (urls.length) set('photos', [...form.photos, ...urls]);
  }

  const photoMenu = (i: number) =>
    Alert.alert('Photo', undefined, [
      ...(i > 0 ? [{ text: 'Make cover photo', onPress: () => set('photos', [form.photos[i], ...form.photos.filter((_, j) => j !== i)]) }] : []),
      { text: 'Remove', style: 'destructive' as const, onPress: () => set('photos', form.photos.filter((_, j) => j !== i)) },
      { text: 'Cancel', style: 'cancel' as const },
    ]);

  async function save(asDraft: boolean) {
    if (asDraft && (problems.details.length > 0)) {
      Alert.alert('Almost there', 'To save a draft, add a title, home type, city, neighbourhood, address and rent first.');
      return;
    }
    setBusy(asDraft ? 'draft' : 'submit');
    const body = {
      title: form.title.trim(), description: form.description.trim(), address: form.address.trim(), property_type: form.type,
      bedrooms: form.bedrooms, bathrooms: form.bathrooms, rent: num(form.rent),
      agency_fee: num(form.agency), legal_fee: num(form.legal), caution_deposit: num(form.caution), service_charge: num(form.service),
      features: form.features.split(',').map((x) => x.trim()).filter(Boolean), photos: form.photos, city: form.city.trim(), neighbourhood: form.neighbourhood.trim(), draft: asDraft,
    };
    try {
      if (isNew) await api('/listings', { method: 'POST', body });
      else await api(`/listings/${id}`, { method: 'PATCH', body });
      setDone(asDraft ? 'draft' : 'submit');
    } catch (e) { Alert.alert(asDraft ? 'Couldn’t save the draft' : 'Couldn’t submit', errorMessage(e)); }
    setBusy(null);
  }

  if (!isNew && existing.loading && !existing.data) return <Loading />;
  if (!isNew && existing.error && !existing.data) return <ErrorState error={existing.error} onRetry={existing.reload} />;

  if (done) {
    return (
      <View style={s.done}>
        <View style={s.doneIcon}><CircleCheck size={36} color={colors.teal700} strokeWidth={1.8} /></View>
        <Text style={s.doneTitle}>{done === 'draft' ? 'Draft saved' : 'Submitted for review'}</Text>
        <Text style={s.doneBody}>{done === 'draft' ? 'Finish it any time from your dashboard.' : 'We check every listing before renters see it. You’ll see its status on your dashboard.'}</Text>
        <Button label="Back to dashboard" onPress={() => router.back()} style={{ alignSelf: 'stretch', marginTop: space.xl }} />
      </View>
    );
  }

  const barColor = (i: number) => {
    if (i === step) return colors.navy800;
    if (i > reached) return colors.line;
    const bad = i === 0 ? problems.details.length + problems.description.length : i === 1 ? problems.photos.length : i === 2 ? problems.costs.length : 0;
    return bad ? colors.poor : colors.teal700;
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.top, { paddingTop: top + space.sm }]}>
        <Pressable onPress={close} hitSlop={12} accessibilityLabel="Close" style={s.close}><X size={24} color={colors.navy900} /></Pressable>
        <Text style={s.topTitle}>{step === 3 ? 'Review and publish' : isNew ? 'New listing' : 'Edit listing'}</Text>
        {canDraft ? <Text onPress={busy ? undefined : () => save(true)} style={s.draft} accessibilityRole="button">Save draft</Text> : <View style={{ width: 80 }} />}
      </View>
      <View style={s.steps}>
        {STEPS.map((label, i) => (
          <Pressable key={label} style={{ flex: 1 }} onPress={() => go(i)} accessibilityRole="button" accessibilityLabel={`${label} step`}>
            <View style={[s.bar, { backgroundColor: barColor(i) }]} />
            <Text style={[s.stepLabel, { color: barColor(i) === colors.line ? colors.muted : barColor(i) }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <>
            <Field label="Title" placeholder="e.g. 2-bedroom flat, Surulere" value={form.title} onChangeText={(v) => set('title', v)} error={reached > 0 && !form.title.trim() ? 'Add a title' : undefined} />
            <Text style={s.label}>Home type</Text>
            <View style={s.wrap}>{TYPES.map((t) => <Chip key={t} label={t} on={form.type === t} onPress={() => set('type', t)} />)}</View>
            <Text style={[s.label, { marginTop: space.lg }]}>City</Text>
            <View style={s.wrap}>
              {(cities.data ?? []).map((c) => <Chip key={c.city} label={c.city} on={form.city.toLowerCase() === c.city.toLowerCase()} onPress={() => { set('city', c.city); setPlaceCity(c.city); }} />)}
            </View>
            <View style={{ height: space.md }} />
            <Field label="Or type another city or town" placeholder="e.g. Kaduna" value={form.city} onChangeText={(v) => set('city', v)} onEndEditing={() => setPlaceCity(form.city.trim())} autoCapitalize="words" />
            <Text style={s.label}>Neighbourhood</Text>
            <View style={s.wrap}>
              {(areas.data ?? []).map((a) => <Chip key={a.slug} label={a.name} on={form.neighbourhood.toLowerCase() === a.name.toLowerCase()} onPress={() => set('neighbourhood', a.name)} />)}
            </View>
            {areas.error ? <Text style={s.err}>Couldn’t load neighbourhoods. <Text style={s.link} onPress={areas.reload}>Try again</Text></Text> : null}
            <View style={{ height: space.md }} />
            <Field label="Or type another neighbourhood" placeholder="e.g. Nassarawa GRA" value={form.neighbourhood} onChangeText={(v) => set('neighbourhood', v)} autoCapitalize="words" />
            <View style={{ height: space.lg }} />
            <Field label="Street address" placeholder="e.g. 18 Diya Street" value={form.address} onChangeText={(v) => set('address', v)} />
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Stepper label="Bedrooms" value={form.bedrooms} onChange={(v) => set('bedrooms', v)} />
              <Stepper label="Bathrooms" value={form.bathrooms} onChange={(v) => set('bathrooms', v)} />
            </View>
            <Field label="Rent per year (₦)" placeholder="e.g. 3200000" keyboardType="number-pad" value={form.rent} onChangeText={(v) => set('rent', digits(v))} />
            <Field label="Features" optional placeholder="Prepaid meter, Gated compound, Borehole" value={form.features} onChangeText={(v) => set('features', v)} />
            <Field label="Description" multiline placeholder="What makes this home a good place to live?" value={form.description} onChangeText={(v) => set('description', v)} />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <View style={s.rowBetween}><Text style={s.h}>Photos</Text><Text style={[s.count, problems.photos.length > 0 && { color: colors.poorText }]}>{form.photos.length} of {MIN_PHOTOS} minimum</Text></View>
            <Text style={s.hint}>Tap a photo to remove it or make it the cover. The first photo is the cover.</Text>
            <View style={s.grid}>
              {form.photos.map((u, i) => (
                <Pressable key={u} onPress={() => photoMenu(i)} style={s.cell} accessibilityLabel={`Photo ${i + 1}`}>
                  <Image source={{ uri: u }} style={s.img} />
                  {i === 0 ? <View style={s.cover}><Text style={s.coverText}>COVER</Text></View> : null}
                </Pressable>
              ))}
              {Array.from({ length: uploading }).map((_, i) => <View key={`u${i}`} style={[s.cell, s.add, { borderStyle: 'solid', borderColor: colors.line, backgroundColor: colors.canvas }]}><ActivityIndicator color={colors.teal500} /></View>)}
              <Pressable onPress={addPhotos} style={[s.cell, s.add, problems.photos.length === 0 && { borderColor: colors.line, backgroundColor: colors.canvas }]} accessibilityRole="button" accessibilityLabel="Add photos">
                <Plus size={24} color={problems.photos.length ? colors.poor : colors.muted} /><Text style={[s.addText, problems.photos.length === 0 && { color: colors.muted }]}>Add</Text>
              </Pressable>
            </View>
            {reached > 1 && problems.photos.length ? <Text style={s.err}>{problems.photos[0]}</Text> : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={s.h}>Costs to move in</Text>
            <Text style={s.hint}>Renters see these totals before they decide. Enter 0 if a charge doesn’t apply.</Text>
            <View style={{ height: space.md }} />
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1 }}><Field label="Agency fee" keyboardType="number-pad" placeholder="₦ 0" value={form.agency} onChangeText={(v) => set('agency', digits(v))} error={reached > 2 && form.agency === '' ? 'Required. Enter 0 if none.' : undefined} /></View>
              <View style={{ flex: 1 }}><Field label="Legal fee" keyboardType="number-pad" placeholder="₦ 0" value={form.legal} onChangeText={(v) => set('legal', digits(v))} error={reached > 2 && form.legal === '' ? 'Required. Enter 0 if none.' : undefined} /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1 }}><Field label="Caution deposit" keyboardType="number-pad" placeholder="₦ 0" value={form.caution} onChangeText={(v) => set('caution', digits(v))} error={reached > 2 && form.caution === '' ? 'Required. Enter 0 if none.' : undefined} /></View>
              <View style={{ flex: 1 }}><Field label="Service charge /yr" keyboardType="number-pad" placeholder="₦ 0" value={form.service} onChangeText={(v) => set('service', digits(v))} error={reached > 2 && form.service === '' ? 'Required. Enter 0 if none.' : undefined} /></View>
            </View>
            <View style={s.total}><Text style={s.totalLabel}>Renters will see a move-in total of</Text><Mono style={s.totalVal}>{naira(num(form.rent) + num(form.agency) + num(form.legal) + num(form.caution) + num(form.service))}</Mono></View>
          </>
        ) : null}

        {step === 3 ? (
          <>
            {issueCount > 0 ? (
              <View style={s.banner}><CircleAlert size={22} color={colors.poorText} strokeWidth={1.8} /><View style={{ flex: 1 }}>
                <Text style={s.bannerTitle}>{issueCount} {issueCount === 1 ? 'thing' : 'things'} to fix before you can publish.</Text>
                <Text style={s.bannerBody}>Tenants need these to trust and compare your listing.</Text></View></View>
            ) : null}

            {!user?.phone ? (
              <Pressable onPress={() => router.push('/account/edit-profile')} style={s.phoneNote} accessibilityRole="button">
                <Text style={s.phoneNoteText}>Add your phone number so renters can call or WhatsApp you after you’re approved. <Text style={s.link}>Add it now</Text></Text>
              </Pressable>
            ) : null}

            <Section title="Details" ok={problems.details.length === 0} onEdit={() => go(0)}>
              <Row k="Type" v={`${form.type || '—'} · ${form.bedrooms} ${form.bedrooms === 1 ? 'bedroom' : 'bedrooms'}, ${form.bathrooms} ${form.bathrooms === 1 ? 'bath' : 'baths'}`} />
              <Row k="Location" v={`${[form.address, form.neighbourhood, form.city].map((x) => x.trim()).filter(Boolean).join(', ') || '—'}`} />
              <Row k="Rent" v={form.rent ? `${naira(num(form.rent))} /yr` : '—'} mono />
              {problems.details.map((p) => <Text key={p} style={s.err}>{p}</Text>)}
            </Section>

            <Section title="Photos" ok={problems.photos.length === 0} status={`${form.photos.length} of ${MIN_PHOTOS} minimum`} onEdit={() => go(1)}>
              <View style={s.grid}>{form.photos.slice(0, 3).map((u, i) => <View key={u} style={s.cell}><Image source={{ uri: u }} style={s.img} />{i === 0 ? <View style={s.cover}><Text style={s.coverText}>COVER</Text></View> : null}</View>)}</View>
              {problems.photos.map((p) => <Text key={p} style={s.err}>{p}</Text>)}
            </Section>

            <Section title="Costs to move in" ok={problems.costs.length === 0} status={problems.costs[0]} onEdit={() => go(2)}>
              {([['Agency fee', form.agency], ['Legal fee', form.legal], ['Caution deposit', form.caution], ['Service charge /yr', form.service]] as const).map(([k, v]) =>
                <Row key={k} k={k} v={v === '' ? 'Missing' : naira(num(v))} mono bad={v === ''} />)}
            </Section>

            <Section title="Description" ok={problems.description.length === 0} onEdit={() => go(0)}>
              <Text style={s.body}>{form.description.trim() || 'Not added yet'}</Text>
              {problems.description.map((p) => <Text key={p} style={s.err}>{p}</Text>)}
            </Section>

            <Pressable onPress={() => setConfirm(!confirm)} style={s.confirm} accessibilityRole="checkbox" accessibilityState={{ checked: confirm }}>
              <View style={[s.box, confirm && { backgroundColor: colors.navy800, borderColor: colors.navy800 }]}>{confirm ? <Check size={16} color="#fff" strokeWidth={3} /> : null}</View>
              <Text style={s.confirmText}>I confirm I’m authorised to let this property and the details are accurate. Listings are checked before going live.</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>

      <BottomBar>
        {step > 0 ? <Button label="Back" variant="outline" style={{ flex: 1 }} onPress={() => go(step - 1)} /> : null}
        {step < 3 ? <Button label="Continue" style={{ flex: 2 }} onPress={() => go(step + 1)} />
          : <Button label="Submit for review" style={{ flex: 2 }} disabled={issueCount > 0 || !confirm} loading={busy === 'submit'} onPress={() => save(false)} />}
      </BottomBar>
    </KeyboardAvoidingView>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange(v: number): void }) {
  return (
    <View style={{ flex: 1, marginBottom: space.lg }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.stepper}>
        <Pressable onPress={() => onChange(Math.max(0, value - 1))} hitSlop={8} accessibilityLabel={`Fewer ${label.toLowerCase()}`} style={s.stepBtn}><Text style={s.stepGlyph}>−</Text></Pressable>
        <Text style={s.stepValue}>{value}</Text>
        <Pressable onPress={() => onChange(Math.min(20, value + 1))} hitSlop={8} accessibilityLabel={`More ${label.toLowerCase()}`} style={s.stepBtn}><Text style={s.stepGlyph}>+</Text></Pressable>
      </View>
    </View>
  );
}

function Section({ title, ok, status, onEdit, children }: { title: string; ok: boolean; status?: string; onEdit(): void; children: React.ReactNode }) {
  return (
    <View style={[s.section, !ok && { borderColor: colors.poor, borderWidth: 2 }]}>
      <View style={s.rowBetween}>
        <Text style={s.h}>{title}</Text>
        {ok ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Check size={16} color={colors.teal700} strokeWidth={2.4} /><Text style={s.okText}>Complete</Text></View> : <Text style={s.badText}>{status ?? 'Needs attention'}</Text>}
      </View>
      <View style={{ gap: 8, marginTop: space.sm }}>{children}</View>
      <Text onPress={onEdit} style={s.link} accessibilityRole="button">Edit {title.toLowerCase()}</Text>
    </View>
  );
}

function Row({ k, v, mono, bad }: { k: string; v: string; mono?: boolean; bad?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.md }}>
      <Text style={s.k}>{k}</Text>
      {mono ? <Mono style={[s.v, bad && { color: colors.poorText }]}>{v}</Mono> : <Text style={s.v}>{v}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingBottom: space.md, backgroundColor: '#fff' },
  close: { width: 80, height: 36, justifyContent: 'center' },
  topTitle: { fontFamily: font.bold, fontSize: 18, color: colors.navy900 },
  draft: { width: 80, textAlign: 'right', fontFamily: font.bold, fontSize: 16, color: colors.teal700 },
  steps: { flexDirection: 'row', gap: 6, paddingHorizontal: space.lg, paddingBottom: space.md, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.line },
  bar: { height: 4, borderRadius: 2 },
  stepLabel: { fontFamily: font.semibold, fontSize: 14, marginTop: 8 },
  label: { fontFamily: font.semibold, fontSize: 15, color: colors.navy900, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  h: { fontFamily: font.extrabold, fontSize: 20, color: colors.navy900 },
  hint: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  count: { fontFamily: font.bold, fontSize: 14, color: colors.teal700 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  cell: { width: '31.5%', aspectRatio: 1, borderRadius: radius.input, overflow: 'hidden', backgroundColor: colors.navy100 },
  img: { width: '100%', height: '100%' },
  cover: { position: 'absolute', left: 8, bottom: 8, backgroundColor: colors.navy900, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  coverText: { color: '#fff', fontFamily: font.bold, fontSize: 11 },
  add: { alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.poor, backgroundColor: colors.poorBg },
  addText: { fontFamily: font.bold, fontSize: 15, color: colors.poorText },
  err: { color: colors.poorText, fontFamily: font.medium, fontSize: 14, lineHeight: 20, marginTop: space.sm },
  link: { color: colors.teal700, fontFamily: font.bold, fontSize: 15, textDecorationLine: 'underline', marginTop: space.md },
  total: { backgroundColor: colors.navy100, borderRadius: radius.card, padding: space.lg, marginTop: space.sm, gap: 4 },
  totalLabel: { fontFamily: font.regular, fontSize: 15, color: colors.navy900 },
  totalVal: { fontSize: 22 },
  phoneNote: { backgroundColor: colors.navy100, borderRadius: radius.card, padding: space.lg, marginBottom: space.lg },
  phoneNoteText: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.navy900 },
  banner: { flexDirection: 'row', gap: space.md, backgroundColor: colors.poorBg, borderRadius: radius.card, padding: space.lg, marginBottom: space.lg },
  bannerTitle: { fontFamily: font.bold, fontSize: 16, color: colors.poorText },
  bannerBody: { fontFamily: font.regular, fontSize: 15, color: colors.poorText, marginTop: 2 },
  section: { backgroundColor: '#fff', borderRadius: radius.card + 4, borderWidth: 1, borderColor: colors.line, padding: space.lg, marginBottom: space.lg },
  okText: { fontFamily: font.bold, fontSize: 15, color: colors.teal700 },
  badText: { fontFamily: font.bold, fontSize: 14, color: colors.poorText },
  k: { width: 96, fontFamily: font.regular, fontSize: 15, color: colors.muted },
  v: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors.navy900 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 24, color: colors.navy900 },
  confirm: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
  box: { width: 26, height: 26, borderRadius: 6, borderWidth: 1.5, borderColor: '#9AA3B5', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  confirmText: { flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.muted },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52, borderRadius: radius.input, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', paddingHorizontal: 6 },
  stepBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.navy100, alignItems: 'center', justifyContent: 'center' },
  stepGlyph: { fontFamily: font.bold, fontSize: 22, color: colors.navy800, lineHeight: 26 },
  stepValue: { fontFamily: font.bold, fontSize: 18, color: colors.navy900 },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxxl, backgroundColor: colors.canvas },
  doneIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.teal100, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  doneTitle: { fontFamily: font.extrabold, fontSize: 26, color: colors.navy900 },
  doneBody: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: colors.muted, textAlign: 'center', marginTop: space.sm },
});
