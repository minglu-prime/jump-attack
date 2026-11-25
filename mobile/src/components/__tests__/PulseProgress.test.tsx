// The analysis progress runs while the JS thread decodes frames and finds jumps: it must not add a JS-driven loop of
// its own. It shows how far along the reading is, and nothing else moves.
import { AccessibilityInfo, Animated } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { PulseProgress } from '../PulseProgress';

afterEach(() => jest.restoreAllMocks());

it('runs no animation loop while an analysis is reading frames', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const loop = jest.spyOn(Animated, 'loop');
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(<PulseProgress progress={0.4} label="正在读帧" />);
  });
  await act(async () => r.root.children[0] && (r.root.findAll((n) => typeof n.props.onLayout === 'function')[0].props.onLayout({ nativeEvent: { layout: { width: 360 } } })));
  expect(loop).not.toHaveBeenCalled();
  await act(async () => r.unmount());
});
