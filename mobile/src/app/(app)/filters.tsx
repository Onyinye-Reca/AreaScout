import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { BottomBar, Button, Chip, Field, Header } from '../../components/ui';
import { colors, font, space } from '../../lib/theme';

const TYPES = ['Self-contain', 'Mini flat', '2-bedroom flat', 'Terrace'];
const BEDS = [{ label: 'Any', v: 0 }, { label: '1+', v: 1 }, { label: '2+', v: 2 }, { label: '3+', v: 3 }];

export default function Filters() {
  const router = useRouter();
  const [type, setType] = useState<string>();
  const [beds, setBeds] = useState(0);
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [verified, setVerified] = useState(false);

  function apply() {
    const q = new URLSearchParams();
    if (type) q.set('type', type);
    if (beds) q.set('beds', String(beds));
    const digits = (v: string) => v.replace(/[^0-9]/g, '');
    if (digits(min)) q.set('minRent', digits(min));
    if (digits(max)) q.set('maxRent', digits(max));
    if (verified) q.set('verified', '1');
    router.replace(`/results?${q.toString()}`);
  }

  return (
    <View style={{ flex: 1 }}>
      <Header title="Filters" />
      <ScrollView contentContainerStyle={{ padding: space.xl }} keyboardShouldPersistTaps="handled">
        <Text style={s.h}>Home type</Text>
        <View style={s.wrap}>{TYPES.map((t) => <Chip key={t} label={t} on={type === t} onPress={() => setType(type === t ? undefined : t)} />)}</View>
        <Text style={s.h}>Bedrooms</Text>
        <View style={s.wrap}>{BEDS.map((b) => <Chip key={b.label} label={b.label} on={beds === b.v} onPress={() => setBeds(b.v)} />)}</View>
        <Text style={s.h}>Yearly rent (₦)</Text>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}><Field label="Min" placeholder="0" keyboardType="number-pad" value={min} onChangeText={setMin} /></View>
          <View style={{ flex: 1 }}><Field label="Max" placeholder="No limit" keyboardType="number-pad" value={max} onChangeText={setMax} /></View>
        </View>
        <View style={s.switchRow}>
          <View style={{ flex: 1 }}><Text style={s.h2}>Verified listings only</Text><Text style={s.hint}>Checked by the AreaScout team</Text></View>
          <Switch value={verified} onValueChange={setVerified} trackColor={{ true: colors.teal500, false: colors.line }} />
        </View>
      </ScrollView>
      <BottomBar>
        <Button label="Reset" variant="outline" style={{ flex: 1 }} onPress={() => { setType(undefined); setBeds(0); setMin(''); setMax(''); setVerified(false); }} />
        <Button label="Show homes" style={{ flex: 2 }} onPress={apply} />
      </BottomBar>
    </View>
  );
}

const s = StyleSheet.create({
  h: { fontFamily: font.bold, fontSize: 18, color: colors.navy900, marginTop: space.lg, marginBottom: space.md },
  h2: { fontFamily: font.bold, fontSize: 16, color: colors.navy900 },
  hint: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.lg, padding: space.lg, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.line },
});
