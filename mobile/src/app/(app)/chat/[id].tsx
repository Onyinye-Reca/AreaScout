import { useLocalSearchParams, useRouter } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorState, Loading } from '../../../components/States';
import { Header } from '../../../components/ui';
import { api, errorMessage } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { timeAgo } from '../../../lib/format';
import { useLoad } from '../../../lib/hooks';
import { colors, font, radius, space } from '../../../lib/theme';
import type { Message } from '../../../lib/types';

/** `id` is a conversation id, or "new" when starting one from a listing (listingId + title params). */
export default function Chat() {
  const { id, listingId, title } = useLocalSearchParams<{ id: string; listingId?: string; title?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { bottom } = useSafeAreaInsets();
  const isNew = id === 'new';
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const list = useRef<FlatList<Message>>(null);

  const data = useLoad(async () => (isNew ? null : api<{ conversation: { listing_title: string }; messages: Message[] }>(`/conversations/${id}`)), [id]);
  // Poll while open so replies show up without leaving the screen.
  useEffect(() => { if (isNew) return; const t = setInterval(data.reload, 10000); return () => clearInterval(t); }, [isNew, data.reload]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true); setError('');
    try {
      if (isNew) {
        const r = await api<{ conversation_id: number }>('/conversations', { method: 'POST', body: { listing_id: Number(listingId), message: body } });
        router.replace(`/chat/${r.conversation_id}`);
      } else {
        await api(`/conversations/${id}/messages`, { method: 'POST', body: { message: body } });
        setText('');
        data.reload();
      }
    } catch (e) { setError(errorMessage(e)); }
    setSending(false);
  }

  const heading = isNew ? decodeURIComponent(title ?? 'New message') : data.data?.conversation.listing_title ?? 'Conversation';
  const messages = data.data?.messages ?? [];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title={heading} subtitle="Keep payments and chat on AreaScout" />
      {!isNew && data.loading && !data.data ? <Loading /> : !isNew && data.error && !data.data ? <ErrorState error={data.error} onRetry={data.reload} /> : (
        <FlatList ref={list} data={messages} keyExtractor={(m) => String(m.id)} contentContainerStyle={{ padding: space.lg, gap: space.sm, flexGrow: 1 }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<View style={s.hello}><Text style={s.helloText}>Ask about availability, fees or the area. Never pay before inspecting.</Text></View>}
          renderItem={({ item: m }) => {
            const mine = m.sender_id === user?.id;
            return (
              <View style={[s.bubble, mine ? s.mine : s.theirs]}>
                <Text style={s.body}>{m.body}</Text>
                <Text style={s.time}>{timeAgo(m.created_at)}</Text>
              </View>
            );
          }} />
      )}
      {error ? <Text style={s.err}>{error}</Text> : null}
      <View style={[s.composer, { paddingBottom: Math.max(bottom, space.md) }]}>
        <TextInput style={s.input} placeholder="Write a message" placeholderTextColor="#8A93A5" value={text} onChangeText={setText} multiline maxLength={2000} />
        <Pressable onPress={send} disabled={sending || !text.trim()} accessibilityLabel="Send message" style={[s.send, (sending || !text.trim()) && { backgroundColor: colors.line }]}>
          <Send size={20} color="#fff" strokeWidth={2} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  hello: { backgroundColor: colors.navy100, borderRadius: radius.card, padding: space.lg },
  helloText: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.navy900 },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.navy800, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 4 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 22, color: colors.navy900 },
  time: { fontFamily: font.regular, fontSize: 11, color: colors.muted, marginTop: 4, opacity: 0.8 },
  composer: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-end', paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.line },
  input: { flex: 1, maxHeight: 120, minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 18, paddingTop: 13, paddingBottom: 13, fontFamily: font.regular, fontSize: 16, color: colors.navy900 },
  send: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.teal700, alignItems: 'center', justifyContent: 'center' },
  err: { color: colors.poorText, fontFamily: font.medium, fontSize: 13, paddingHorizontal: space.lg, paddingBottom: 4 },
});
