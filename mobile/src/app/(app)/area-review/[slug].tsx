import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleCheck } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SIGNALS, type SignalKey } from '../../../components/AreaSignal';
import { BottomBar, Button, Chip, Field, Header } from '../../../components/ui';
import { api, errorMessage } from '../../../lib/api';
import { colors, font, space } from '../../../lib/theme';

const LABEL = ['Poor', 'Not good', 'Okay', 'Good', 'Great'];

export default function AreaReview() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [field, setField] = useState<SignalKey>('power');
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function send() {
    setBusy(true); setError('');
    try { await api('/area-reviews', { method: 'POST', body: { area: slug, [field]: rating, comment: comment.trim() } }); setSent(true); }
    catch (e) { setError(errorMessage(e)); }
    setBusy(false);
  }

  if (sent) {
    return (
      <View style={{ flex: 1 }}>
        <Header title="Add your report" />
        <View style={s.done}>
          <View style={s.doneIcon}><CircleCheck size={36} color={colors.teal700} strokeWidth={1.8} /></View>
          <Text style={s.doneTitle}>Thanks for sharing</Text>
          <Text style={s.doneBody}>Reports are checked before they appear, so yours may take a little while to show up.</Text>
          <Button label="Done" onPress={() => router.back()} style={{ alignSelf: 'stretch', marginTop: space.xl }} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Header title="Add your report" subtitle="Help renters who come after you" />
      <ScrollView contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
        <Text style={s.h}>What would you like to report?</Text>
        <View style={s.wrap}>{SIGNALS.map((x) => <Chip key={x.key} label={x.label} on={field === x.key} onPress={() => setField(x.key)} />)}</View>
        <Text style={s.h}>How is it? <Text style={{ color: colors.teal700 }}>{LABEL[rating - 1]}</Text></Text>
        <View style={s.wrap}>{[1, 2, 3, 4, 5].map((n) => <Chip key={n} label={String(n)} on={rating === n} onPress={() => setRating(n)} />)}</View>
        <Text style={s.hint}>1 is poor, 5 is great.</Text>
        <View style={{ height: space.lg }} />
        <Field label="Your experience" multiline value={comment} onChangeText={setComment} placeholder="What should someone moving here know?" />
        <Text style={s.hint}>Please don’t include personal information.</Text>
        {error ? <Text style={s.err}>{error}</Text> : null}
      </ScrollView>
      <BottomBar><Button label="Submit report" loading={busy} disabled={comment.trim().length < 10} onPress={send} style={{ flex: 1 }} /></BottomBar>
    </View>
  );
}

const s = StyleSheet.create({
  h: { fontFamily: font.bold, fontSize: 18, color: colors.navy900, marginTop: space.lg, marginBottom: space.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  hint: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginTop: space.sm },
  err: { color: colors.poorText, fontFamily: font.medium, fontSize: 14, marginTop: space.md },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxxl },
  doneIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.teal100, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  doneTitle: { fontFamily: font.extrabold, fontSize: 26, color: colors.navy900 },
  doneBody: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: colors.muted, textAlign: 'center', marginTop: space.sm },
});
