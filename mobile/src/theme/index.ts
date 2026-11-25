import { StyleSheet } from 'react-native';

// "Paper court" palette: a light, print-like ground, court blue for actions and the gap, rim orange for the basket.
// Text colours clear 4.5:1 on bg and surface; textFaint is only for placeholders and disabled labels.
export const colors = {
  bg: '#F1ECE2',
  surface: '#FFFFFF',
  surfaceRaised: '#E8E1D4',
  tabBar: '#F7F3EC',
  border: '#D9CFBE',
  divider: '#E3DBCD',
  text: '#17130E',
  textSoft: '#3A332A',
  textMuted: '#665D52',
  textFaint: '#8F8474',
  accent: '#2340C8',
  accentTile: '#E1E6FA',
  onAccent: '#FFFFFF',
  good: '#1A6E3D',
  warn: '#985100',
  record: '#B92F1C',
  blue: '#0B6F6E',
  purple: '#6A46BE',
  /** The basket: rim, net and anything about the hoop. */
  rim: '#D9541E',
  /** Vanes and pole of the reach tester drawn behind the home screen. */
  vane: '#17130E',
  pole: '#C9BEAA',
};

export const fonts = {
  /** Numbers and short codes: Big Shoulders, Chicago's street-sign face. Chinese stays on the system font (PingFang). */
  numeric: 'BigShouldersDisplay_700Bold',
  numericBold: 'BigShouldersDisplay_800ExtraBold',
};

export const radius = { card: 20, row: 18, button: 16, chip: 14 };

/**
 * The app's one motion language (ms). Every change of state uses one of these, so the same kind of change always
 * moves the same way. Short and on one ease-out curve: things arrive fast and settle, nothing lingers or bounces.
 */
export const motion = {
  /** A section or note arriving: fades in while rising `rise` px. */
  enter: 240,
  rise: 8,
  /** Siblings arrive one after another, `stagger` apart, the first `staggerMax` only: a long list doesn't wait. */
  stagger: 35,
  staggerMax: 4,
  /** One state replacing another in place (loading → content, a label → a spinner, a number → a tick). */
  swap: 180,
  /** Size and position changes: expanding, collapsing, rows added or removed. */
  layout: 220,
  /** Pressing gives a little under the thumb and springs back without overshoot. */
  pressScale: 0.98,
  press: { stiffness: 420, damping: 34, mass: 1 },
  /** A key number rolling to its new value. */
  count: 600,
  /** A spinner waits this long before fading in: most local reads are done by then, and it never flashes. */
  loadingDelay: 120,
  /** cubic-bezier(0.2, 0, 0, 1): an Apple-like ease-out, quick to start with a long gentle settle. */
  ease: [0.2, 0, 0, 1] as const,
};

export const text = StyleSheet.create({
  title: { color: colors.text, fontSize: 26, fontWeight: '700' },
  heading: { color: colors.text, fontSize: 20, fontWeight: '700' },
  section: { color: colors.text, fontSize: 15, fontWeight: '700' },
  body: { color: colors.text, fontSize: 15 },
  muted: { color: colors.textMuted, fontSize: 13 },
  caption: { color: colors.textMuted, fontSize: 11 },
});
