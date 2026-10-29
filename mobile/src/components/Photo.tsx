import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Rect, Line } from 'react-native-svg';
import { colors, font } from '../lib/theme';

/** Listing photo, or the design's striped placeholder when the listing has none. */
export function Photo({ uri, style, label = 'LISTING PHOTO', tint = 0 }: { uri?: string; style?: StyleProp<ViewStyle>; label?: string; tint?: number }) {
  if (/^https?:\/\//.test(uri ?? '')) return <Image source={{ uri }} style={style as any} resizeMode="cover" accessibilityIgnoresInvertColors />;
  const bg = tint % 2 ? '#C9DFDB' : '#C5CCDC';
  const line = tint % 2 ? '#B9D3CE' : '#B5BED2';
  return (
    <View style={[{ backgroundColor: bg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <Pattern id="stripes" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Line x1="0" y1="0" x2="0" y2="22" stroke={line} strokeWidth="11" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#stripes)" />
      </Svg>
      <Text style={{ fontFamily: font.mono, fontSize: 12, letterSpacing: 1.5, color: colors.navy600 }}>{label}</Text>
    </View>
  );
}
