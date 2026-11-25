// A running clock in the app's number face: its digits are not all one width ("1" is about half an "8"), so a centred
// clock would sway side to side as it ticks. Every digit gets the same slot, so the line holds still.
import { Text, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { fonts } from '@/theme';

import { Digits } from '../ui';

async function widths(value: string): Promise<{ widths: (number | undefined)[]; label: string }> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(<Digits style={{ fontFamily: fonts.numericBold, fontSize: 120 }}>{value}</Digits>);
  });
  const row = r.root.findByType(View);
  return {
    widths: row.findAllByType(Text).map((t) => [t.props.style].flat().reduce((a, s) => ({ ...a, ...s }), {}).width),
    label: row.props.accessibilityLabel,
  };
}

it('gives every digit the same width, so 1.11 and 8.88 take the same room', async () => {
  const ones = await widths('1.11');
  const eights = await widths('8.88');
  expect(ones.widths).toEqual(eights.widths);
  expect(ones.widths[0]).toBeGreaterThan(0);
  // The point keeps its own narrow width.
  expect(ones.widths[1]).toBeUndefined();
  // Read out as one number, not digit by digit.
  expect(ones.label).toBe('1.11');
});
