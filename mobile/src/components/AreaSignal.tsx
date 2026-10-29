import { Droplet, Shield, Waves, Wifi, Zap, Bus, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, space } from '../lib/theme';
import type { Grade } from '../lib/types';

export type SignalKey = 'power' | 'flooding' | 'security' | 'water' | 'transport' | 'internet';

export const SIGNALS: { key: SignalKey; label: string; icon: LucideIcon }[] = [
  { key: 'power', label: 'Power', icon: Zap },
  { key: 'flooding', label: 'Flooding', icon: Waves },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'transport', label: 'Traffic', icon: Bus },
  { key: 'water', label: 'Water', icon: Droplet },
  { key: 'internet', label: 'Internet', icon: Wifi },
];

const SEGMENTS: Record<Grade, number> = { Good: 4, Fair: 3, Poor: 1, 'No data': 0 };
const TONE: Record<Grade, string> = { Good: colors.teal500, Fair: colors.fair, Poor: colors.poor, 'No data': colors.line };
export const gradeText = (g: Grade) => ({ Good: colors.teal700, Fair: colors.fairText, Poor: colors.poorText, 'No data': colors.muted })[g];

/**
 * The design's signature component: five segments plus a plain-language verdict,
 * so colour is never the only cue.
 */
export function AreaSignal({ label, grade, icon: Icon, note }: { label: string; grade: Grade; icon: LucideIcon; note?: string }) {
  const filled = SEGMENTS[grade] ?? 0;
  return (
    <View style={s.row} accessible accessibilityLabel={`${label}: ${grade}${note ? `. ${note}` : ''}`}>
      <View style={s.icon}><Icon size={18} color={colors.navy800} strokeWidth={1.8} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{label} · <Text style={{ color: gradeText(grade) }}>{grade === 'No data' ? 'No data' : grade}</Text></Text>
        {note ? <Text style={s.note}>{note}</Text> : null}
      </View>
      <View style={s.bars}>
        {[0, 1, 2, 3, 4].map((i) => <View key={i} style={[s.bar, { backgroundColor: i < filled ? TONE[grade] : colors.line }]} />)}
      </View>
    </View>
  );
}

/** Compact label/verdict pair used on area cards. */
export function SignalLine({ label, grade }: { label: string; grade: Grade }) {
  return (
    <View style={s.line}>
      <Text style={s.lineLabel}>{label}</Text>
      <Text style={[s.lineGrade, { color: gradeText(grade) }]}>{grade}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  icon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.navy100, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.bold, fontSize: 16, color: colors.navy900 },
  note: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  bars: { flexDirection: 'row', gap: 3 },
  bar: { width: 14, height: 6, borderRadius: 3 },
  line: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  lineLabel: { fontFamily: font.regular, fontSize: 15, color: colors.muted },
  lineGrade: { fontFamily: font.bold, fontSize: 15 },
});
