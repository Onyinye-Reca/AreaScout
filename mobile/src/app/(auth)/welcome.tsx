import { useRouter } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui';
import { colors, font, radius, space } from '../../lib/theme';

function Logo({ onNavy = true }: { onNavy?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={[s.mark, { backgroundColor: onNavy ? colors.teal400 : colors.navy900 }]}>
        <MapPin size={22} color={onNavy ? colors.navy900 : colors.teal400} strokeWidth={2} />
      </View>
      <Text style={[s.word, { color: onNavy ? '#fff' : colors.navy900 }]}>Area<Text style={{ color: onNavy ? colors.teal400 : colors.teal500 }}>Scout</Text></Text>
    </View>
  );
}

export default function Welcome() {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  return (
    <View style={[s.root, { paddingTop: top + space.xxl, paddingBottom: Math.max(bottom, space.xl) }]}>
      <Logo />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={s.eyebrow}>A BETTER WAY TO RENT</Text>
        <Text style={s.title}>Know the area before you sign.</Text>
        <Text style={s.lead}>Find a home, understand the real move-in cost, and see what living there is like.</Text>
      </View>
      <Button label="Create account" variant="teal" onPress={() => router.push('/signup')} />
      <Button label="Log in" variant="ghost" onPress={() => router.push('/login')} style={{ marginTop: space.sm }} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy900, paddingHorizontal: space.xxl },
  mark: { width: 40, height: 40, borderRadius: radius.input, alignItems: 'center', justifyContent: 'center' },
  word: { fontFamily: font.extrabold, fontSize: 26 },
  eyebrow: { fontFamily: font.mono, fontSize: 12, letterSpacing: 1.5, color: colors.teal400, marginBottom: space.md },
  title: { fontFamily: font.extrabold, fontSize: 40, lineHeight: 42, color: '#fff', letterSpacing: -1 },
  lead: { fontFamily: font.regular, fontSize: 17, lineHeight: 25, color: '#B9C5D9', marginTop: space.lg },
});
