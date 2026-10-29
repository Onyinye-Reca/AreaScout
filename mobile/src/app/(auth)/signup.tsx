import { useRouter } from 'expo-router';
import { Check, House, Search } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, Field, Header } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors, font, radius, space } from '../../lib/theme';

export default function SignUp() {
  const { signUp } = useAuth();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const [f, setF] = useState({ name: '', phone: '', email: '', password: '' });
  const [host, setHost] = useState(false);
  const [hostRole, setHostRole] = useState<'landlord' | 'agent'>('landlord');
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Enter your full name';
    if (f.phone && !/^\+?[0-9 ]{7,15}$/.test(f.phone.trim())) e.phone = 'Enter a valid phone number';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email address';
    if (f.password.length < 10) e.password = 'Use at least 10 characters';
    if (!agreed) e.agreed = 'Please accept the terms to continue';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try { await signUp({ name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim().toLowerCase(), password: f.password, role: host ? hostRole : 'tenant' }); }
    catch (err) { setErrors({ form: errorMessage(err) }); setBusy(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="" />
      <ScrollView contentContainerStyle={{ padding: space.xxl, paddingBottom: bottom + space.xxxl }} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Create your account</Text>
        <Text style={s.sub}>First, how will you use AreaScout?</Text>

        <Pressable onPress={() => setHost(false)} accessibilityRole="radio" accessibilityState={{ selected: !host }} style={[s.role, !host && s.roleOn]}>
          <View style={s.roleIcon}><Search size={20} color={colors.navy900} strokeWidth={1.8} /></View>
          <View style={{ flex: 1 }}><Text style={s.roleTitle}>I’m looking to rent</Text><Text style={s.roleSub}>Search, compare and inspect homes</Text></View>
          <View style={!host ? s.radioOn : s.radio}>{!host ? <View style={s.radioDot} /> : null}</View>
        </Pressable>
        <Pressable onPress={() => setHost(true)} accessibilityRole="radio" accessibilityState={{ selected: host }} style={[s.role, host && s.roleOn]}>
          <View style={s.roleIcon}><House size={20} color={colors.navy900} strokeWidth={1.8} /></View>
          <View style={{ flex: 1 }}><Text style={s.roleTitle}>I list properties</Text><Text style={s.roleSub}>Landlord or agent</Text></View>
          <View style={host ? s.radioOn : s.radio}>{host ? <View style={s.radioDot} /> : null}</View>
        </Pressable>
        {host ? (
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
            <Chip label="I’m a landlord" on={hostRole === 'landlord'} onPress={() => setHostRole('landlord')} />
            <Chip label="I’m an agent" on={hostRole === 'agent'} onPress={() => setHostRole('agent')} />
          </View>
        ) : null}

        <View style={{ height: space.lg }} />
        <Field label="Full name" placeholder="As it appears on your ID" value={f.name} onChangeText={set('name')} error={errors.name} autoComplete="name" />
        <Field label="Phone number" placeholder="0803 000 0000" value={f.phone} onChangeText={set('phone')} error={errors.phone} keyboardType="phone-pad" autoComplete="tel" optional />
        <Field label="Email" placeholder="you@email.com" value={f.email} onChangeText={set('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <Field label="Password" placeholder="At least 10 characters" value={f.password} onChangeText={set('password')} error={errors.password} secureTextEntry autoComplete="new-password" />

        <Pressable onPress={() => setAgreed(!agreed)} style={s.terms} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }}>
          <View style={[s.box, agreed && { backgroundColor: colors.navy800, borderColor: colors.navy800 }]}>{agreed ? <Check size={16} color="#fff" strokeWidth={3} /> : null}</View>
          <Text style={s.termsText}>I agree to the <Text style={s.link}>Terms</Text> and <Text style={s.link}>Privacy Policy</Text>, and understand that area information is a guide and I should still inspect before paying.</Text>
        </Pressable>
        {errors.agreed ? <Text style={s.err}>{errors.agreed}</Text> : null}
        {errors.form ? <Text style={s.err}>{errors.form}</Text> : null}

        <Button label="Create account" onPress={submit} loading={busy} style={{ marginTop: space.xl }} />
        <Text style={s.foot}>Already have an account? <Text style={s.link} onPress={() => router.replace('/login')}>Log in</Text></Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: font.extrabold, fontSize: 32, color: colors.navy900, letterSpacing: -0.8 },
  sub: { fontFamily: font.regular, fontSize: 17, color: colors.muted, marginTop: 6, marginBottom: space.xl },
  role: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.card + 4, borderWidth: 1, borderColor: colors.line, marginBottom: space.md },
  roleOn: { borderWidth: 2, borderColor: colors.navy800, backgroundColor: '#F4F7FC' },
  roleIcon: { width: 44, height: 44, borderRadius: radius.input, backgroundColor: colors.navy100, alignItems: 'center', justifyContent: 'center' },
  roleTitle: { fontFamily: font.bold, fontSize: 18, color: colors.navy900 },
  roleSub: { fontFamily: font.regular, fontSize: 15, color: colors.muted, marginTop: 2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#B7BFCD' },
  radioOn: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.navy800, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#fff' },
  terms: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: '#9AA3B5', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  termsText: { flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.muted },
  link: { color: colors.teal700, fontFamily: font.semibold, textDecorationLine: 'underline' },
  err: { color: colors.poorText, fontFamily: font.medium, fontSize: 13, marginTop: 8 },
  foot: { textAlign: 'center', marginTop: space.lg, fontFamily: font.regular, fontSize: 16, color: colors.muted },
});
