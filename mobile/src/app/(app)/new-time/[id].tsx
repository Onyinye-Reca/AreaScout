import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DayTimePicker, slotDate, slotSummary, useDays } from '../../../components/DayTimePicker';
import { BottomBar, Button, Field, Header } from '../../../components/ui';
import { api, errorMessage } from '../../../lib/api';
import { colors, font, space } from '../../../lib/theme';

/** The lister suggests a different slot; the renter sees it under their inspection updates. */
export default function NewTime() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const days = useDays();
  const [day, setDay] = useState(0);
  const [hour, setHour] = useState(10);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const when = slotDate(days[day], hour);

  async function send() {
    setBusy(true); setError('');
    try {
      await api(`/inspections/${id}`, { method: 'PATCH', body: { status: 'new_time', requested_at: when.toISOString(), owner_note: note.trim() } });
      router.back();
    } catch (e) { setError(errorMessage(e)); setBusy(false); }
  }

  return (
    <View style={{ flex: 1 }}>
      <Header title="Suggest a new time" />
      <ScrollView contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
        <DayTimePicker days={days} day={day} hour={hour} onDay={setDay} onHour={setHour} />
        <View style={{ height: space.xl }} />
        <Field label="Message to the renter" optional multiline value={note} onChangeText={setNote} placeholder="e.g. I’m not free then, but this works." />
        {error ? <Text style={s.err}>{error}</Text> : null}
      </ScrollView>
      <BottomBar><Button label={`Send · ${slotSummary(when)}`} loading={busy} onPress={send} style={{ flex: 1 }} /></BottomBar>
    </View>
  );
}

const s = StyleSheet.create({ err: { color: colors.poorText, fontFamily: font.medium, fontSize: 14 } });
