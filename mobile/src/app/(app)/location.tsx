import { useRouter } from 'expo-router';
import { Check, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ErrorState, Loading } from '../../components/States';
import { Button, Field, Header } from '../../components/ui';
import { api } from '../../lib/api';
import { useLoad } from '../../lib/hooks';
import { tidyCity, useCity } from '../../lib/location';
import { colors, font, radius, space } from '../../lib/theme';
import type { CityInfo } from '../../lib/types';

/** Pick a city from the ones that have areas, or type any other city or town. */
export default function Location() {
  const router = useRouter();
  const { city, setCity } = useCity();
  const data = useLoad(() => api<{ cities: CityInfo[] }>('/locations').then((r) => r.cities));
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');

  const choose = (name: string) => { setCity(name); router.back(); };
  const useTyped = () => {
    if (tidyCity(typed).length < 2) { setError('Enter a city or town'); return; }
    choose(typed);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Where are you looking?" subtitle={`Now searching in ${city}`} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.sm }} keyboardShouldPersistTaps="handled">
        {data.loading && !data.data ? <View style={{ height: 200 }}><Loading /></View> : data.error && !data.data ? <View style={{ height: 260 }}><ErrorState error={data.error} onRetry={data.reload} /></View> : (
          (data.data ?? []).map((c) => {
            const on = c.city.toLowerCase() === city.toLowerCase();
            return (
              <Pressable key={c.city} onPress={() => choose(c.city)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[s.row, on && s.rowOn]}>
                <MapPin size={20} color={on ? colors.navy800 : colors.muted} strokeWidth={1.8} />
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{c.city}</Text>
                  <Text style={s.sub}>{c.listing_count} {c.listing_count === 1 ? 'home' : 'homes'} · {c.area_count} {c.area_count === 1 ? 'area' : 'areas'}</Text>
                </View>
                {on ? <Check size={20} color={colors.navy800} strokeWidth={2.4} /> : null}
              </Pressable>
            );
          })
        )}

        <Text style={s.h}>Somewhere else?</Text>
        <Field label="Another city or town" placeholder="e.g. Kaduna" value={typed} onChangeText={(v) => { setTyped(v); setError(''); }} error={error} autoCapitalize="words" returnKeyType="go" onSubmitEditing={useTyped} />
        <Button label="Search here" variant="outline" onPress={useTyped} />
        <Text style={s.hint}>If there aren’t any homes there yet, you’ll see that straight away, and you can ask to be told when some are listed.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  rowOn: { borderWidth: 2, borderColor: colors.navy800, backgroundColor: '#F4F7FC' },
  name: { fontFamily: font.bold, fontSize: 17, color: colors.navy900 },
  sub: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginTop: 2 },
  h: { fontFamily: font.extrabold, fontSize: 20, color: colors.navy900, marginTop: space.xl, marginBottom: space.sm },
  hint: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: space.md },
});
