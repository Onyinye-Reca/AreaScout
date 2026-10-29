import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space } from '../lib/theme';
import type { ReportReason } from '../lib/types';
import { Tag } from './ui';

export const REASON: Record<ReportReason, { label: string; tone: 'poor' | 'fair' }> = {
  scam: { label: 'Possible scam', tone: 'poor' },
  inaccurate: { label: 'Wrong price or details', tone: 'fair' },
  unavailable: { label: 'No longer available', tone: 'fair' },
  duplicate: { label: 'Duplicate listing', tone: 'fair' },
  other: { label: 'Something else', tone: 'fair' },
};

export const reasonColor = (r: ReportReason) => (REASON[r].tone === 'poor' ? colors.poorText : colors.fairText);

export function ReasonTag({ reason }: { reason: ReportReason }) {
  return <Tag label={REASON[reason].label} tone={REASON[reason].tone} />;
}

export function DarkTile({ value, label, accent }: { value?: number; label: string; accent?: boolean }) {
  return (
    <View style={s.tile}>
      <Text style={[s.num, accent && { color: colors.teal400 }]}>{value ?? '–'}</Text>
      <Text style={s.label}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  tile: { flex: 1, backgroundColor: '#FFFFFF14', borderRadius: radius.card + 2, padding: space.lg, minHeight: 112, justifyContent: 'space-between' },
  num: { fontFamily: font.extrabold, fontSize: 34, color: '#fff' },
  label: { fontFamily: font.regular, fontSize: 16, color: '#D5DCEA' },
});
