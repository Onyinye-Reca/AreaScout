import { useLocalSearchParams, useRouter } from 'expo-router';
import { BedDouble, Bath, ChevronLeft, ChevronRight, Flag, Heart, MapPin, ShieldCheck, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AreaSignal, SIGNALS } from '../../../components/AreaSignal';
import { ErrorState, Loading } from '../../../components/States';
import { Photo } from '../../../components/Photo';
import { BottomBar, Button, Card, Mono } from '../../../components/ui';
import { api, errorMessage } from '../../../lib/api';
import { naira, plain, timeAgo, initials } from '../../../lib/format';
import { callNumber, openWhatsApp } from '../../../lib/phone';
import { useLoad } from '../../../lib/hooks';
import { useAuth } from '../../../lib/auth';
import { useSaved } from '../../../lib/saved';
import { colors, font, radius, space } from '../../../lib/theme';
import type { Area, Listing } from '../../../lib/types';

/** Admins review a submitted listing in the same view renters will see. */
function AdminBar({ listing, onDone }: { listing: Listing; onDone(): void }) {
  const [busy, setBusy] = useState<string | null>(null);
  async function set(status: 'live' | 'rejected' | 'removed') {
    setBusy(status);
    try { await api(`/admin/listings/${listing.id}`, { method: 'PATCH', body: { status } }); onDone(); }
    catch (e) { Alert.alert('Couldn’t update the listing', errorMessage(e)); setBusy(null); }
  }
  const confirm = (status: 'rejected' | 'removed', title: string) =>
    Alert.alert(title, listing.title, [{ text: 'Cancel', style: 'cancel' }, { text: title.split(' ')[0], style: 'destructive', onPress: () => set(status) }]);
  return (
    <BottomBar>
      {listing.status === 'live'
        ? <Button label="Remove listing" variant="outline" style={{ flex: 1 }} loading={busy === 'removed'} onPress={() => confirm('removed', 'Remove this listing?')} />
        : <>
            <Button label="Reject" variant="outline" style={{ flex: 1 }} disabled={!!busy} onPress={() => confirm('rejected', 'Reject this listing?')} />
            <Button label="Approve" variant="teal" style={{ flex: 1.4 }} loading={busy === 'live'} onPress={() => set('live')} />
          </>}
    </BottomBar>
  );
}

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { ids, toggle } = useSaved();
  const { user } = useAuth();
  const data = useLoad(async () => {
    const { listing } = await api<{ listing: Listing }>(`/listings/${id}`);
    const { area } = await api<{ area: Area }>(`/areas/${listing.area_slug}`);
    return { listing, area };
  }, [id]);

  if (data.loading && !data.data) return <Loading />;
  if (data.error && !data.data) return <ErrorState error={data.error} onRetry={data.reload} />;
  if (!data.data) return null;
  const { listing: l, area } = data.data;
  const saved = ids.has(l.id);
  const mine = user?.id === l.owner_id || user?.role === 'admin'; // listers see their own listing as renters do, without the renter actions
  const fees = l.agency_fee + l.legal_fee;
  const other = l.caution_deposit + l.service_charge + l.utilities;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxxl }}>
        <View>
          <Photo uri={l.photos[0]} tint={l.id} style={{ height: 300 }} />
          <View style={[s.topRow, { top: top + space.sm }]}>
            <Pressable onPress={() => router.back()} style={s.round} accessibilityLabel="Go back"><ChevronLeft size={22} color={colors.navy900} /></Pressable>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Pressable onPress={() => Share.share({ message: `${l.title} — ${naira(l.rent)}/year on AreaScout` })} style={s.round} accessibilityLabel="Share"><Text style={s.shareGlyph}>↗</Text></Pressable>
              <Pressable onPress={() => toggle(l.id)} style={s.round} accessibilityLabel={saved ? 'Remove from saved' : 'Save home'}>
                <Heart size={20} color={saved ? colors.teal700 : colors.navy900} fill={saved ? colors.teal700 : 'none'} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={s.sheet}>
          <View style={s.metaRow}>
            {l.verified ? <View style={s.verified}><ShieldCheck size={16} color={colors.teal700} strokeWidth={2} /><Text style={s.verifiedText}>Verified listing</Text></View> : null}
            <Text style={s.listed}>Listed {timeAgo(l.created_at)}</Text>
          </View>
          <Text style={s.title}>{l.title}</Text>
          <View style={s.addr}><MapPin size={18} color={colors.muted} strokeWidth={1.8} /><Text style={s.addrText}>{l.address}, {l.area}</Text></View>
          <Text style={s.price}>{naira(l.rent)} <Text style={s.per}>rent per {l.rent_period}</Text></Text>

          <View style={s.grid}>
            <View style={s.cell}><BedDouble size={20} color={colors.navy800} strokeWidth={1.8} /><Text style={s.cellText}>{l.bedrooms} {l.bedrooms === 1 ? 'bedroom' : 'bedrooms'}</Text></View>
            <View style={s.cell}><Bath size={20} color={colors.navy800} strokeWidth={1.8} /><Text style={s.cellText}>{l.bathrooms} {l.bathrooms === 1 ? 'bathroom' : 'bathrooms'}</Text></View>
            <View style={s.cell}><Zap size={20} color={colors.navy800} strokeWidth={1.8} /><Text style={s.cellText}>{l.features[0] ?? l.property_type}</Text></View>
          </View>
        </View>

        <View style={s.cost}>
          <View style={s.costTop}><Text style={s.costTitle}>Total to move in</Text><Mono style={s.est}>ESTIMATE</Mono></View>
          <Text style={s.costTotal}>{naira(l.move_in_total)}</Text>
          {([['1 year rent', l.rent], ['Agency + legal fees', fees], ['Caution + other charges', other]] as const).map(([k, v]) => (
            <View key={k} style={s.costRow}><Text style={s.costLabel}>{k}</Text><Mono style={s.costVal}>{plain(v)}</Mono></View>
          ))}
          <Pressable onPress={() => router.push(`/cost/${l.id}`)} style={s.costBtn} accessibilityRole="button">
            <Text style={s.costBtnText}>See breakdown and adjust</Text><ChevronRight size={18} color="#fff" />
          </Pressable>
        </View>

        <Card style={s.section}>
          <View style={s.secHead}><Text style={s.h2}>Living in {area.name}</Text><Mono style={s.reports}>{area.community_reports} {area.community_reports === 1 ? 'REPORT' : 'REPORTS'}</Mono></View>
          {SIGNALS.slice(0, 4).map((sig) => (
            <AreaSignal key={sig.key} label={sig.label} icon={sig.icon} grade={area[sig.key]}
              note={area.rating_averages[sig.key] ? `Residents rate this ${area.rating_averages[sig.key]}/5` : undefined} />
          ))}
          <Mono style={s.source}>SOURCE · RESIDENT REPORTS AND LOCAL SOURCES</Mono>
          <Button label={`Full area report · ${SIGNALS.length} signals`} variant="outline" onPress={() => router.push(`/area/${area.slug}`)} />
        </Card>

        <Card style={s.section}>
          <Text style={s.h2}>About this home</Text>
          <Text style={s.body}>{l.description || `${l.property_type} in ${l.area}. Ask the agent anything you need to feel confident, and see it in person before you pay.`}</Text>
          {l.features.length ? <View style={s.features}>{l.features.map((f) => <View key={f} style={s.feature}><Text style={s.featureText}>{f}</Text></View>)}</View> : null}
        </Card>

        <Card style={s.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={s.agentAvatar}><Text style={s.agentInitials}>{initials(l.owner_name)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.agentName}>{l.owner_name}</Text>
              <Text style={s.agentSub}>
                {l.owner_verified ? 'Verified · ' : ''}
                {l.owner_rating?.count ? `★ ${l.owner_rating.average} · ${l.owner_rating.count} ${l.owner_rating.count === 1 ? 'review' : 'reviews'}` : 'No reviews yet'}
              </Text>
            </View>
          </View>
          {l.owner_phone && !mine ? (
            <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg }}>
              <Button label="Call" variant="outline" style={{ flex: 1, height: 46 }} onPress={() => callNumber(l.owner_phone!)} />
              <Button label="WhatsApp" variant="outline" style={{ flex: 1, height: 46 }} onPress={() => openWhatsApp(l.owner_phone!, `Hi, I’m interested in “${l.title}” on AreaScout.`)} />
            </View>
          ) : null}
          <View style={s.warn}><Text style={s.warnText}>Never pay before inspecting. AreaScout will never ask you to pay a fee through chat.</Text></View>
        </Card>

        {mine ? null : (
          <Pressable onPress={() => router.push(`/report-listing/${l.id}`)} style={s.report} accessibilityRole="button">
            <Flag size={18} color={colors.muted} strokeWidth={1.8} /><Text style={s.reportText}>Report this listing</Text>
          </Pressable>
        )}
      </ScrollView>
      {user?.role === 'admin' ? <AdminBar listing={l} onDone={() => router.back()} /> : mine ? null : (
        <BottomBar>
          <Button label="Message" variant="outline" style={{ flex: 1 }} onPress={() => router.push(`/chat/new?listingId=${l.id}&title=${encodeURIComponent(l.title)}`)} />
          <Button label="Request inspection" style={{ flex: 1.6 }} onPress={() => router.push(`/inspect/${l.id}`)} />
        </BottomBar>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  topRow: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between' },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shareGlyph: { fontSize: 20, color: colors.navy900, fontFamily: font.bold },
  sheet: { backgroundColor: '#fff', marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: space.xl },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.teal100, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.tag },
  verifiedText: { fontFamily: font.bold, fontSize: 13, color: colors.teal700 },
  listed: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  title: { fontFamily: font.extrabold, fontSize: 26, color: colors.navy900, marginTop: space.md, letterSpacing: -0.4 },
  addr: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 6 },
  addrText: { flex: 1, fontFamily: font.regular, fontSize: 15, color: colors.muted },
  price: { fontFamily: font.extrabold, fontSize: 28, color: colors.navy900, marginTop: space.md },
  per: { fontFamily: font.regular, fontSize: 15, color: colors.muted },
  grid: { flexDirection: 'row', marginTop: space.lg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.card },
  cell: { flex: 1, padding: space.md, gap: 8, minHeight: 84 },
  cellText: { fontFamily: font.bold, fontSize: 14, color: colors.navy900 },
  cost: { margin: space.lg, backgroundColor: colors.navy900, borderRadius: radius.card + 4, padding: space.xl },
  costTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costTitle: { fontFamily: font.bold, fontSize: 18, color: '#fff' },
  est: { fontSize: 11, letterSpacing: 1, color: '#9AA8C2' },
  costTotal: { fontFamily: font.extrabold, fontSize: 38, color: colors.teal400, marginVertical: space.sm },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  costLabel: { fontFamily: font.regular, fontSize: 15, color: '#D5DCEA' },
  costVal: { color: '#fff', fontSize: 15 },
  costBtn: { marginTop: space.lg, height: 52, borderRadius: radius.card, backgroundColor: '#FFFFFF14', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  costBtnText: { color: '#fff', fontFamily: font.bold, fontSize: 16 },
  section: { marginHorizontal: space.lg, marginBottom: space.lg },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xs },
  h2: { fontFamily: font.extrabold, fontSize: 20, color: colors.navy900 },
  reports: { fontSize: 11, color: colors.muted, letterSpacing: 1 },
  source: { fontSize: 11, color: colors.muted, letterSpacing: 0.8, marginVertical: space.md },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 24, color: colors.navy900, marginTop: space.sm },
  features: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  feature: { backgroundColor: colors.navy100, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  featureText: { fontFamily: font.medium, fontSize: 14, color: colors.navy800 },
  agentAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.navy800, alignItems: 'center', justifyContent: 'center' },
  agentInitials: { color: '#fff', fontFamily: font.bold, fontSize: 18 },
  agentName: { fontFamily: font.bold, fontSize: 18, color: colors.navy900 },
  agentSub: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  warn: { backgroundColor: colors.navy100, borderRadius: radius.input, padding: space.md, marginTop: space.lg },
  warnText: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.navy900 },
  report: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', height: 48 },
  reportText: { fontFamily: font.semibold, fontSize: 15, color: colors.muted },
});
