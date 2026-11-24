import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, LayoutAnimation, Pressable, Text, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { motion } from '@/theme';

/** The one curve every transition eases out on (theme `motion.ease`). */
export const ease = Easing.bezier(...motion.ease);

// The setting, kept current for code that runs outside a component (nextLayout). Unknown (null) until the phone
// answers, and treated as "less motion" until then: when in doubt, nothing moves.
let reduceMotionNow: boolean | null = null;
AccessibilityInfo.isReduceMotionEnabled?.()
  ?.then((r) => {
    reduceMotionNow = r;
  })
  .catch(() => {});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (r) => {
  reduceMotionNow = r;
});

/** Whether the phone's "Reduce Motion" setting is on; null until known. */
export function useReduceMotion(): boolean | null {
  const [reduce, setReduce] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((r) => live && setReduce(r));
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (r) => live && setReduce(r));
    return () => {
      live = false;
      sub?.remove();
    };
  }, []);
  return reduce;
}

/**
 * Call right before a state change that moves things around (a panel opening, a row added or removed, a note
 * appearing): the next layout eases to its new place instead of jumping. Nothing moves when the phone asks for
 * less motion. The web has no layout animation, so there it simply jumps.
 */
export function nextLayout() {
  if (reduceMotionNow !== false) return;
  LayoutAnimation.configureNext({
    duration: motion.layout,
    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    update: { type: LayoutAnimation.Types.easeInEaseOut },
    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  });
}

/** A light tap on the Taptic Engine. Never blocks the action it accompanies: test mocks and the web have no engine. */
export function tick() {
  try {
    Haptics.selectionAsync?.()?.catch(() => {});
  } catch {
    // no haptics here
  }
}

/** A success buzz for a moment worth celebrating (a new record). Same guarantees as {@link tick}. */
export function cheer() {
  try {
    Haptics.notificationAsync?.(Haptics.NotificationFeedbackType?.Success)?.catch(() => {});
  } catch {
    // no haptics here
  }
}

/**
 * Fades and slides its children up into place; `index` staggers siblings so a list arrives top to bottom (only the
 * first few: the rest arrive with them). For content arriving: a section of a page, a result, a note.
 */
export function Rise({ children, index = 0, style }: { children: ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const [p] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce == null) return;
    if (reduce) {
      p.setValue(1);
      return;
    }
    const a = Animated.timing(p, { toValue: 1, duration: motion.enter, delay: Math.min(index, motion.staggerMax) * motion.stagger, easing: ease, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [p, reduce, index]);
  const translateY = p.interpolate({ inputRange: [0, 1], outputRange: [motion.rise, 0] });
  return <Animated.View style={[style, { opacity: p, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/**
 * Fades its children in where they stand: one state replacing another in place (loading → content, a label → a
 * spinner, an error → the retry's result). Give it a `key` that changes with the state, so each new state fades in.
 * With `pop`, it also grows from just under full size: for a tick or a badge confirming something just happened.
 */
export function FadeIn({ children, pop, style }: { children: ReactNode; pop?: boolean; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const [p] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce == null) return;
    if (reduce) {
      p.setValue(1);
      return;
    }
    const a = Animated.timing(p, { toValue: 1, duration: motion.swap, easing: ease, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [p, reduce]);
  const scale = pop ? p.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) : 1;
  return <Animated.View style={[style, { opacity: p, transform: [{ scale }] }]}>{children}</Animated.View>;
}

/**
 * Shows its children as they are, and fades (with `pop`, also grows) them in each time `id` changes after the first
 * render: a label giving way to a spinner, an empty box to a tick, a spinner to the page. Nothing moves on first show.
 */
export function Swap({ id, children, pop, style }: { id: string | number | boolean; children: ReactNode; pop?: boolean; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const [p] = useState(() => new Animated.Value(1));
  const first = useRef(id);
  useEffect(() => {
    if (first.current === id) return;
    first.current = id;
    if (reduce !== false) return;
    p.setValue(0);
    const a = Animated.timing(p, { toValue: 1, duration: motion.swap, easing: ease, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [p, reduce, id]);
  const scale = pop ? p.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) : 1;
  return <Animated.View style={[style, { opacity: p, transform: [{ scale }] }]}>{children}</Animated.View>;
}

/** Turns its child (a chevron) by `turned` degrees while `open`, in step with the panel it opens. */
export function Turn({ children, open, turned = 180 }: { children: ReactNode; open: boolean; turned?: number }) {
  const reduce = useReduceMotion();
  const [p] = useState(() => new Animated.Value(open ? 1 : 0));
  useEffect(() => {
    if (reduce) {
      p.setValue(open ? 1 : 0);
      return;
    }
    const a = Animated.timing(p, { toValue: open ? 1 : 0, duration: motion.layout, easing: ease, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [p, reduce, open]);
  const rotate = p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${turned}deg`] });
  return <Animated.View style={{ transform: [{ rotate }] }}>{children}</Animated.View>;
}

type PressScaleProps = Omit<PressableProps, 'style' | 'children'> & { children: ReactNode; style?: StyleProp<ViewStyle>; haptic?: boolean };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A button that gives under the thumb (scales down a touch) and ticks, so every tap feels answered. Each press picks
 * up from wherever the last one left off, so quick taps never queue. With less motion asked for, it dims instead.
 */
export function PressScale({ children, style, haptic = true, onPress, onPressIn, onPressOut, ...rest }: PressScaleProps) {
  const reduce = useReduceMotion();
  const [s] = useState(() => new Animated.Value(1));
  const [dim, setDim] = useState(false);
  // Less motion asked for while pressed (or the setting not known yet): no button is ever left shrunk.
  useEffect(() => {
    if (reduce === false) return;
    s.stopAnimation();
    s.setValue(1);
  }, [reduce, s]);
  const to = (v: number) => {
    if (reduce !== false) {
      setDim(v !== 1);
      return;
    }
    // Starting an animation stops the running one, so this carries on from the current scale.
    Animated.spring(s, { toValue: v, useNativeDriver: true, ...motion.press }).start();
  };
  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPressIn={(e) => {
        to(motion.pressScale);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) tick();
        onPress?.(e);
      }}
      style={[style, { transform: [{ scale: s }] }, dim && { opacity: 0.8 }]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * A number that rolls to `value` (a scoreboard turning over): from `from` the first time, from whatever it shows when
 * the value changes later. Every frame is written by `format`, so decimals and units never flicker. Shows the value
 * at once when the phone asks for less motion.
 */
export function CountUp({ value, from, format, style }: { value: number; from: number; format: (v: number) => string; style?: StyleProp<TextStyle> }) {
  const reduce = useReduceMotion();
  const [shown, setShown] = useState<number | null>(null);
  const last = useRef(from);
  useEffect(() => {
    if (reduce !== false) return;
    const v = new Animated.Value(last.current);
    const id = v.addListener(({ value: x }) => {
      last.current = x;
      setShown(x);
    });
    const a = Animated.timing(v, { toValue: value, duration: motion.count, easing: ease, useNativeDriver: false });
    a.start(({ finished }) => {
      if (!finished) return;
      last.current = value;
      setShown(null);
    });
    return () => {
      a.stop();
      v.removeListener(id);
    };
  }, [reduce, value]);
  // Rolling frames keep the final value's precision, so the number never grows a digit and shifts the line.
  const frame = (x: number) => format(Number.isInteger(value) ? Math.round(x) : Math.round(x * 10) / 10);
  return <Text style={style}>{shown == null || reduce !== false ? format(value) : frame(shown)}</Text>;
}
