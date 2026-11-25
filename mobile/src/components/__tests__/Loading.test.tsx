// Local reads usually finish in a few milliseconds: a spinner that showed at once would flash for one frame before the
// content. It is in place from the start but only fades in once the wait is long enough to notice.
import { AccessibilityInfo, ActivityIndicator, Animated } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { motion } from '@/theme';

import { Loading } from '../ui';

afterEach(() => jest.restoreAllMocks());

it('keeps the spinner invisible for the first moment, then fades it in', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const timing = jest.spyOn(Animated, 'timing');
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(<Loading />);
  });
  expect(r.root.findAllByType(ActivityIndicator)).toHaveLength(1);
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, delay: motion.loadingDelay }));
  await act(async () => r.unmount());
});

it('still waits before showing it when the phone asks for less motion, then shows it without a fade', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  const timing = jest.spyOn(Animated, 'timing');
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(<Loading />);
  });
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, duration: 0, delay: motion.loadingDelay }));
  await act(async () => r.unmount());
});
