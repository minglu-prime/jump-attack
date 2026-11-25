import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useReduceMotion } from '@/components/motion';
import { tr } from '@/i18n';
import { colors } from '@/theme';

const BAR = 44;
// The keyboard has its own system curve; the bar rides on it rather than on the app's tokens, so the two move as one.
// ponytail: bezier approximation of iOS's keyboard curve; LayoutAnimation 'keyboard' is exact but animates every layout.
const keyboardEase = Easing.bezier(0.17, 0.59, 0.4, 0.77);

/**
 * A bar above the iOS keyboard that puts it away. The number pads used for every result have no
 * return key, so without it the keyboard stays up over the buttons once a value is typed.
 */
export function KeyboardDoneBar() {
  const [keyboardHeight, setKeyboardHeight] = useState<number | null>(null);
  const [y] = useState(() => new Animated.Value(0));
  const reduce = useReduceMotion();
  const still = useRef(true);
  useEffect(() => {
    still.current = reduce !== false;
  }, [reduce]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let height: number | null = null;
    let running: Animated.CompositeAnimation | undefined;
    const slide = (to: number, duration: number | undefined, done?: () => void) => {
      running?.stop();
      if (still.current || !duration) {
        y.setValue(to);
        done?.();
        return;
      }
      running = Animated.timing(y, { toValue: to, duration, easing: keyboardEase, useNativeDriver: true });
      running.start(({ finished }) => finished && done?.());
    };
    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      // Arriving: start below the screen edge, where the keyboard starts. Already up (another field): stay put.
      if (height == null) y.setValue(e.endCoordinates.height + BAR);
      height = e.endCoordinates.height;
      setKeyboardHeight(height);
      slide(0, e.duration);
    });
    const hide = Keyboard.addListener('keyboardWillHide', (e) => {
      const from = height ?? 0;
      height = null;
      slide(from + BAR, e.duration, () => setKeyboardHeight(null));
    });
    return () => {
      running?.stop();
      show.remove();
      hide.remove();
    };
  }, [y]);

  if (keyboardHeight == null) return null;
  return (
    // The slot sits on the keyboard's final top edge; only the bar inside it moves (transform, native thread).
    <View pointerEvents="box-none" style={[styles.slot, { bottom: keyboardHeight }]}>
      <Animated.View style={[styles.bar, { transform: [{ translateY: y }] }]}>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={() => Keyboard.dismiss()}>
          <Text style={styles.label}>{tr('收起键盘')}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', left: 0, right: 0, height: BAR },
  bar: {
    flex: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: colors.surfaceRaised,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  label: { color: colors.accent, fontSize: 16, fontWeight: '600' },
});
