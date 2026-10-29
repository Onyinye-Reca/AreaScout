import { SearchX, WifiOff } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../lib/api';
import { colors, font, space } from '../lib/theme';
import { Button } from './ui';

export function Loading() {
  return <View style={s.center}><ActivityIndicator color={colors.teal500} size="large" /></View>;
}

/** Network failures get a retry; other errors show the server's message. */
export function ErrorState({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <View style={s.center}>
      <View style={s.icon}><WifiOff size={28} color={colors.navy600} strokeWidth={1.8} /></View>
      <Text style={s.title}>{error.offline ? 'No connection' : 'Something went wrong'}</Text>
      <Text style={s.body}>{error.message}</Text>
      <Button label="Try again" onPress={onRetry} style={{ marginTop: space.xl, alignSelf: 'stretch' }} />
    </View>
  );
}

export function EmptyState({ title, body, action, onAction }: { title: string; body: string; action?: string; onAction?: () => void }) {
  return (
    <View style={s.center}>
      <View style={s.icon}><SearchX size={28} color={colors.navy600} strokeWidth={1.8} /></View>
      <Text style={s.title}>{title}</Text>
      <Text style={s.body}>{body}</Text>
      {action ? <Button label={action} onPress={onAction} style={{ marginTop: space.xl, alignSelf: 'stretch' }} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxxl },
  icon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.navy100, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  title: { fontFamily: font.bold, fontSize: 20, color: colors.navy900, textAlign: 'center' },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center', marginTop: 6 },
});
