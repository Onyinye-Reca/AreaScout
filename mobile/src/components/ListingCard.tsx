import { useRouter } from 'expo-router';
import { Heart, ShieldCheck } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { naira } from '../lib/format';
import { colors, font, radius, shadow, space } from '../lib/theme';
import type { Listing } from '../lib/types';
import { Photo } from './Photo';
import { Mono } from './ui';

export function ListingCard({ listing: l, saved, onToggleSave, selected, onSelect }: {
  listing: Listing; saved: boolean; onToggleSave(): void; selected?: boolean; onSelect?: () => void;
}) {
  const router = useRouter();
  const meta = [`${l.bedrooms} ${l.bedrooms === 1 ? 'bed' : 'beds'}`, `${l.bathrooms} ${l.bathrooms === 1 ? 'bath' : 'baths'}`, l.features[0]].filter(Boolean).join(' · ');
  return (
    <Pressable onPress={onSelect ?? (() => router.push(`/listing/${l.id}`))}
      accessibilityLabel={`${l.title}, ${naira(l.rent)} per year`} style={[s.card, selected && { borderColor: colors.navy800, borderWidth: 2 }]}>
      <View>
        <Photo uri={l.photos[0]} tint={l.id} style={s.photo} />
        {l.verified ? (
          <View style={s.verified}><ShieldCheck size={16} color={colors.teal700} strokeWidth={2} /><Text style={s.verifiedText}>Verified</Text></View>
        ) : null}
        <Pressable onPress={onToggleSave} hitSlop={8} accessibilityRole="button" accessibilityLabel={saved ? 'Remove from saved' : 'Save home'} style={s.heart}>
          <Heart size={20} color={saved ? colors.teal700 : colors.navy900} fill={saved ? colors.teal700 : 'none'} strokeWidth={1.8} />
        </Pressable>
      </View>
      <View style={s.body}>
        <Text style={s.price}>{naira(l.rent)}<Text style={s.per}> /year</Text></Text>
        <Text style={s.title}>{l.title}</Text>
        <Text style={s.meta}>{meta}</Text>
        <View style={s.divider} />
        <View style={s.total}><Text style={s.totalLabel}>Move-in total</Text><Mono style={{ fontSize: 15 }}>{naira(l.move_in_total)}</Mono></View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card + 4, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', ...shadow.card },
  photo: { height: 190, width: '100%' },
  verified: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.input },
  verifiedText: { fontFamily: font.bold, fontSize: 14, color: colors.teal700 },
  heart: { position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  body: { padding: space.lg },
  price: { fontFamily: font.extrabold, fontSize: 24, color: colors.navy900 },
  per: { fontFamily: font.regular, fontSize: 15, color: colors.muted },
  title: { fontFamily: font.bold, fontSize: 18, color: colors.navy900, marginTop: 4 },
  meta: { fontFamily: font.regular, fontSize: 15, color: colors.muted, marginTop: 4 },
  divider: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.line, marginVertical: space.md },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: font.regular, fontSize: 15, color: colors.muted },
});
