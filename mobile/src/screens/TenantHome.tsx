import { useRouter } from 'expo-router';
import { Bell, ChevronDown, MapPin, Search, SlidersHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SignalLine } from '../components/AreaSignal';
import { ListingCard } from '../components/ListingCard';
import { ErrorState, Loading } from '../components/States';
import { Button, Chip, Mono } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useLoad } from '../lib/hooks';
import { useCity } from '../lib/location';
import { useSaved } from '../lib/saved';
import { colors, font, radius, shadow, space } from '../lib/theme';
import type { Area, Listing } from '../lib/types';

const QUICK = [
  { label: 'Self-contain', params: 'type=Self-contain' },
  { label: 'Mini flat', params: 'type=Mini%20flat' },
  { label: '2 bedrooms', params: 'beds=2' },
  { label: 'Verified', params: 'verified=1' },
];

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

export default function TenantHome() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { user } = useAuth();
  const { ids, toggle } = useSaved();
  const { city } = useCity();
  const [q, setQ] = useState('');
  const data = useLoad(async () => {
    const c = `?city=${encodeURIComponent(city)}`;
    const [areas, listings] = await Promise.all([api<{ areas: Area[] }>(`/areas${c}`), api<{ listings: Listing[] }>(`/listings${c}`)]);
    return { areas: areas.areas, listings: listings.listings };
  }, [city]);

  const search = () => router.push(`/results?q=${encodeURIComponent(q.trim())}`);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={data.reload} />} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.xxxl }}>
        <View style={[s.hero, { paddingTop: top + space.xl }]}>
          <View style={s.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.greet}>{greeting()}, {user?.name.split(' ')[0]}</Text>
              <Text style={s.title}>Find your next place</Text>
              <Pressable onPress={() => router.push('/location')} accessibilityRole="button" accessibilityLabel={`Searching in ${city}. Change city`} style={s.cityBtn}>
                <MapPin size={16} color={colors.teal400} strokeWidth={2} /><Text style={s.cityText}>{city}</Text><ChevronDown size={16} color="#B9C5D9" />
              </Pressable>
            </View>
            <Pressable onPress={() => router.push('/notifications')} accessibilityLabel="Notifications" style={s.bell}><Bell size={22} color="#fff" strokeWidth={1.8} /></Pressable>
          </View>
          <View style={s.searchRow}>
            <View style={s.search}>
              <Search size={20} color={colors.navy900} strokeWidth={1.8} />
              <TextInput style={s.searchInput} placeholder="Area, street or landmark" placeholderTextColor="#8A93A5" value={q} onChangeText={setQ} returnKeyType="search" onSubmitEditing={search} />
            </View>
            <Pressable onPress={() => router.push('/filters')} accessibilityLabel="Filters" style={s.filterBtn}><SlidersHorizontal size={22} color={colors.navy900} strokeWidth={2} /></Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {QUICK.map((c) => <Chip key={c.label} label={c.label} onPress={() => router.push(`/results?${c.params}`)} />)}
        </ScrollView>

        {data.loading && !data.data ? <View style={{ height: 300 }}><Loading /></View> :
          data.error && !data.data ? <View style={{ height: 360 }}><ErrorState error={data.error} onRetry={data.reload} /></View> : data.data ? (
            <>
              <View style={s.sectionHead}><Text style={s.h2}>Scout an area</Text><Text style={s.seeAll} onPress={() => router.push('/results')}>See all</Text></View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.md }}>
                {data.data.areas.map((a) => (
                  <Pressable key={a.id} onPress={() => router.push(`/area/${a.slug}`)} style={s.areaCard} accessibilityLabel={`${a.name} area report`}>
                    <Text style={s.areaName}>{a.name}</Text>
                    <Mono style={s.areaCount}>{a.listing_count} {a.listing_count === 1 ? 'LISTING' : 'LISTINGS'}</Mono>
                    <SignalLine label="Power" grade={a.power} /><SignalLine label="Flooding" grade={a.flooding} /><SignalLine label="Security" grade={a.security} />
                  </Pressable>
                ))}
              </ScrollView>

              <View style={s.sectionHead}><Text style={s.h2}>Homes in {city}</Text><Text style={s.seeAll} onPress={() => router.push('/results')}>See all</Text></View>
              <View style={{ paddingHorizontal: space.xl, gap: space.lg }}>
                {data.data.listings.length === 0 ? (
                  <View style={{ gap: space.md }}>
                    <Text style={s.empty}>No homes in {city} yet. We’re growing city by city.</Text>
                    <Button label="Choose another city" variant="outline" onPress={() => router.push('/location')} />
                  </View>
                ) :
                  data.data.listings.slice(0, 5).map((l) => <ListingCard key={l.id} listing={l} saved={ids.has(l.id)} onToggleSave={() => toggle(l.id)} />)}
              </View>
            </>
          ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: colors.navy900, paddingHorizontal: space.xl, paddingBottom: space.xxl, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start' },
  greet: { fontFamily: font.regular, fontSize: 17, color: '#B9C5D9' },
  title: { fontFamily: font.extrabold, fontSize: 30, color: '#fff', letterSpacing: -0.6, marginTop: 2 },
  bell: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFFFFF1F', alignItems: 'center', justifyContent: 'center' },
  cityBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: space.sm, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: '#FFFFFF1F' },
  cityText: { fontFamily: font.semibold, fontSize: 15, color: '#fff' },
  searchRow: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  search: { flex: 1, height: 56, borderRadius: radius.card, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.lg },
  searchInput: { flex: 1, fontFamily: font.regular, fontSize: 17, color: colors.navy900 },
  filterBtn: { width: 56, height: 56, borderRadius: radius.card, backgroundColor: colors.teal400, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: space.sm, paddingHorizontal: space.xl, paddingVertical: space.lg },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: space.xl, marginTop: space.lg, marginBottom: space.md },
  h2: { fontFamily: font.extrabold, fontSize: 22, color: colors.navy900 },
  seeAll: { fontFamily: font.bold, fontSize: 16, color: colors.teal700, textDecorationLine: 'underline' },
  areaCard: { width: 210, backgroundColor: '#fff', borderRadius: radius.card + 4, borderWidth: 1, borderColor: colors.line, padding: space.lg, ...shadow.card },
  areaName: { fontFamily: font.bold, fontSize: 20, color: colors.navy900 },
  areaCount: { fontSize: 12, letterSpacing: 1, color: colors.muted, marginTop: 6, marginBottom: 4 },
  empty: { fontFamily: font.regular, fontSize: 15, color: colors.muted },
});
