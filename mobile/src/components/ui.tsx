import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius, space } from '../lib/theme';

export function Button({ label, onPress, variant = 'primary', disabled, loading, style }: {
  label: string; onPress?: () => void; variant?: 'primary' | 'outline' | 'teal' | 'ghost';
  disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const off = disabled || loading;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!off }} onPress={off ? undefined : onPress}
      style={({ pressed }) => [s.btn, variant === 'primary' && { backgroundColor: colors.navy800 }, variant === 'teal' && { backgroundColor: colors.teal700 },
        variant === 'outline' && { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.navy800 },
        variant === 'ghost' && { backgroundColor: 'transparent' },
        off && { backgroundColor: colors.line, borderColor: colors.line }, pressed && { opacity: 0.85 }, style]}>
      {loading ? <ActivityIndicator color={variant === 'outline' ? colors.navy800 : '#fff'} /> :
        <Text style={[s.btnText, (variant === 'outline' || variant === 'ghost') && { color: colors.navy800 }, off && { color: colors.muted }]}>{label}</Text>}
    </Pressable>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!on }}
      style={[s.chip, on && { backgroundColor: colors.navy800, borderColor: colors.navy800 }]}>
      <Text style={[s.chipText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Tag({ label, tone = 'good' }: { label: string; tone?: 'good' | 'fair' | 'poor' | 'neutral' }) {
  const t = { good: [colors.teal100, colors.teal700], fair: [colors.fairBg, colors.fairText], poor: [colors.poorBg, colors.poorText], neutral: [colors.canvas, colors.muted] }[tone];
  return <View style={[s.tag, { backgroundColor: t[0] }]}><Text style={[s.tagText, { color: t[1] }]}>{label}</Text></View>;
}

export function Field({ label, error, optional, ...input }: TextInputProps & { label: string; error?: string; optional?: boolean }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={s.label}>{label}{optional ? <Text style={{ fontFamily: font.regular, color: colors.muted }}> (optional)</Text> : null}</Text>
      <TextInput placeholderTextColor="#8A93A5" {...input}
        style={[s.input, error ? { borderColor: colors.poor } : null, input.multiline && { minHeight: 96, textAlignVertical: 'top', paddingTop: 14 }]} />
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

/** Title bar with a back arrow, used by every pushed screen. */
export function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  return (
    <View style={[s.header, { paddingTop: top + space.sm }]}>
      <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Go back" style={s.back}><ChevronLeft size={24} color={colors.navy900} strokeWidth={1.8} /></Pressable>
      <View style={{ flex: 1 }}>
        <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={s.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Mono({ children, style }: { children: ReactNode; style?: StyleProp<any> }) {
  return <Text style={[{ fontFamily: font.mono, color: colors.navy900 }, style]}>{children}</Text>;
}

/** Sticky bottom action bar that respects the home indicator. */
export function BottomBar({ children }: { children: ReactNode }) {
  const { bottom } = useSafeAreaInsets();
  return <View style={[s.bottomBar, { paddingBottom: Math.max(bottom, space.md) }]}>{children}</View>;
}

const s = StyleSheet.create({
  btn: { height: 52, borderRadius: radius.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  btnText: { color: '#fff', fontFamily: font.bold, fontSize: 16 },
  chip: { height: 40, paddingHorizontal: 18, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: font.medium, fontSize: 15, color: colors.navy900 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  tagText: { fontFamily: font.semibold, fontSize: 13 },
  label: { fontFamily: font.semibold, fontSize: 15, color: colors.navy900, marginBottom: 8 },
  input: { height: 52, borderRadius: radius.input, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 16, fontFamily: font.regular, fontSize: 16, color: colors.navy900 },
  error: { color: colors.poorText, fontFamily: font.medium, fontSize: 13, marginTop: 6 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: font.bold, fontSize: 18, color: colors.navy900 },
  headerSub: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  bottomBar: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line },
});
