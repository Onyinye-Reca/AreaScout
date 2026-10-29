import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleCheck, Star } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomBar, Button, Field, Header } from '../../../components/ui';
import { api, errorMessage } from '../../../lib/api';
import { colors, font, space } from '../../../lib/theme';

const WORDS = ['Poor', 'Not great', 'Okay', 'Good', 'Excellent'];

/** Rate the landlord or agent after a confirmed visit. The id is the inspection's. */
export default function Rate() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const who = name ? decodeURIComponent(name) : 'your lister';

  async function send() {
    setBusy(true); setError('');
    try { await api('/lister-reviews', { method: 'POST', body: { inspection_id: Number(id), rating, comment: comment.trim() } }); setDone(true); }
    catch (e) { setError(errorMessage(e)); }
    setBusy(false);
  }

  if (done) {
    return (
      <View style={{ flex: 1 }}>
        <Header title="Rate your visit" />
        <View style={s.done}>
          <View style={s.doneIcon}><CircleCheck size={36} color={colors.teal700} strokeWidth={1.8} /></View>
          <Text style={s.doneTitle}>Thanks for rating</Text>
          <Text style={s.doneBody}>Your review helps the next renter decide.</Text>
          <Button label="Done" onPress={() => router.back()} style={{ alignSelf: 'stretch', marginTop: space.xl }} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Rate your visit" subtitle={`with ${who}`} />
      <ScrollView contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
        <Text style={s.h}>How was it?</Text>
        <View style={s.stars} accessibilityRole="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} hitSlop={6} accessibilityRole="radio" accessibilityLabel={`${n} ${n === 1 ? 'star' : 'stars'}`} accessibilityState={{ selected: rating === n }}>
              <Star size={44} color={n <= rating ? colors.fair : colors.line} fill={n <= rating ? colors.fair : 'none'} strokeWidth={1.6} />
            </Pressable>
          ))}
        </View>
        <Text style={s.word}>{rating ? WORDS[rating - 1] : 'Tap a star'}</Text>
        <View style={{ height: space.lg }} />
        <Field label="Tell others more" optional multiline value={comment} onChangeText={setComment} placeholder="Were they on time? Were the fees as advertised?" />
        {error ? <Text style={s.err}>{error}</Text> : null}
      </ScrollView>
      <BottomBar><Button label="Submit review" disabled={!rating} loading={busy} onPress={send} style={{ flex: 1 }} /></BottomBar>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  h: { fontFamily: font.extrabold, fontSize: 22, color: colors.navy900, marginBottom: space.lg },
  stars: { flexDirection: 'row', gap: space.sm, justifyContent: 'center' },
  word: { fontFamily: font.bold, fontSize: 17, color: colors.teal700, textAlign: 'center', marginTop: space.md },
  err: { color: colors.poorText, fontFamily: font.medium, fontSize: 14, marginTop: space.md },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxxl },
  doneIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.teal100, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  doneTitle: { fontFamily: font.extrabold, fontSize: 26, color: colors.navy900 },
  doneBody: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: colors.muted, textAlign: 'center', marginTop: space.sm },
});
