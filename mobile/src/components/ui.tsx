import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { FadeIn, PressScale, Swap } from '@/components/motion';
import { tr } from '@/i18n';
import { colors, fonts, motion, radius } from '@/theme';

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  busy?: boolean;
  style?: ViewStyle;
};

export function Button({ label, variant = 'primary', busy, disabled, style, ...rest }: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <PressScale
      disabled={disabled || busy}
      style={[styles.button, isPrimary ? styles.primary : variant === 'secondary' ? styles.secondary : styles.ghost, (disabled || busy) && styles.disabled, style]}
      {...rest}
    >
      <Swap id={busy ? true : label}>
        {busy ? (
          <ActivityIndicator color={isPrimary ? colors.onAccent : colors.text} />
        ) : (
          <Text style={[styles.buttonLabel, { color: isPrimary ? colors.onAccent : colors.text }]}>{label}</Text>
        )}
      </Swap>
    </PressScale>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Chip({ label, selected, onPress, color = colors.accent }: { label: string; selected: boolean; onPress: () => void; color?: string }) {
  return (
    <PressScale accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, selected && { backgroundColor: color, borderColor: color }]}>
      <Text style={[styles.chipLabel, { color: selected ? colors.onAccent : colors.textMuted }]}>{label}</Text>
    </PressScale>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

// The widest digit of each number face, as a share of the font size (Big Shoulders: 961 and 896 of 2000 units).
const DIGIT_EM: Record<string, number> = { [fonts.numericBold]: 0.49, [fonts.numeric]: 0.45 };

/**
 * A number that changes while it is watched (a running clock). The number face has no tabular figures, so each digit
 * gets a slot as wide as the widest one: the line holds still instead of swaying as "1"s come and go.
 */
export function Digits({ children, style }: { children: string; style: StyleProp<TextStyle> }) {
  const flat = StyleSheet.flatten(style) ?? {};
  const slot = (flat.fontSize ?? 15) * (DIGIT_EM[flat.fontFamily ?? ''] ?? 0.6);
  return (
    <View accessible accessibilityLabel={children} style={styles.digits}>
      {[...children].map((c, i) => (
        <Text key={i} style={[style, /\d/.test(c) && { width: slot, textAlign: 'center' }]}>
          {c}
        </Text>
      ))}
    </View>
  );
}

/** Shown while a screen's data is read, so loading never reads as a blank page or as "no records". */
export function Loading() {
  return (
    <View style={styles.empty} accessible accessibilityRole="progressbar" accessibilityLabel={tr('正在加载')}>
      <FadeIn delay={motion.loadingDelay}>
        <ActivityIndicator color={colors.accent} />
      </FadeIn>
    </View>
  );
}

/** A read that failed: what failed, the error itself, and the way to try again. */
export function LoadFailed({ title, error, onRetry }: { title: string; error: string; onRetry: () => void }) {
  return (
    <FadeIn style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text selectable style={styles.emptyHint}>
        {error}
      </Text>
      <Button label={tr('重试')} accessibilityLabel={tr('重试')} variant="secondary" onPress={onRetry} style={{ marginTop: 10 }} />
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  digits: { flexDirection: 'row', justifyContent: 'center' },
  button: { height: 52, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  primary: { backgroundColor: colors.accent },
  secondary: { borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
  ghost: { backgroundColor: colors.surface },
  disabled: { opacity: 0.4 },
  buttonLabel: { fontSize: 15, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 16 },
  chip: { minWidth: 48, height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  chipLabel: { fontSize: 15, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 6 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  emptyHint: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
});
