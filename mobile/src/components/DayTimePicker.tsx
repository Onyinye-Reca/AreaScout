import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DAY } from '../lib/format';
import { colors, font, radius, space } from '../lib/theme';

const HOURS = [9, 10, 11, 12, 14, 15, 16];
export const hourLabel = (h: number) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'pm' : 'am'}`;

/** The next five days and a set of hourly slots. The caller combines them with `slotDate`. */
export function useDays(): Date[] {
  return useMemo(() => Array.from({ length: 5 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i + 1); return d; }), []);
}

export function slotDate(day: Date, hour: number): Date {
  const d = new Date(day);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export function slotSummary(d: Date): string {
  const name = DAY[d.getDay()];
  return `${name[0]}${name.slice(1).toLowerCase()} ${d.getDate()}, ${hourLabel(d.getHours())}`;
}

export function DayTimePicker({ days, day, hour, onDay, onHour }: { days: Date[]; day: number; hour: number; onDay(i: number): void; onHour(h: number): void }) {
  return (
    <View>
      <Text style={s.h}>Pick a day</Text>
      <View style={s.days}>
        {days.map((d, i) => (
          <Pressable key={i} onPress={() => onDay(i)} accessibilityRole="button" accessibilityState={{ selected: day === i }} style={[s.day, day === i && s.on]}>
            <Text style={[s.dayName, day === i && { color: '#fff' }]}>{DAY[d.getDay()]}</Text>
            <Text style={[s.dayNum, day === i && { color: '#fff' }]}>{d.getDate()}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.h}>Pick a time</Text>
      <View style={s.times}>
        {HOURS.map((h) => (
          <Pressable key={h} onPress={() => onHour(h)} accessibilityRole="button" accessibilityState={{ selected: hour === h }} style={[s.time, hour === h && s.on]}>
            <Text style={[s.timeText, hour === h && { color: '#fff', fontFamily: font.bold }]}>{hourLabel(h)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  h: { fontFamily: font.extrabold, fontSize: 20, color: colors.navy900, marginTop: space.xl, marginBottom: space.md },
  days: { flexDirection: 'row', gap: space.sm },
  day: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  dayName: { fontFamily: font.semibold, fontSize: 13, color: colors.navy900 },
  dayNum: { fontFamily: font.extrabold, fontSize: 24, color: colors.navy900 },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  time: { width: '31.5%', alignItems: 'center', paddingVertical: 14, borderRadius: radius.input, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  timeText: { fontFamily: font.medium, fontSize: 16, color: colors.navy900 },
  on: { backgroundColor: colors.navy800, borderColor: colors.navy800 },
});
