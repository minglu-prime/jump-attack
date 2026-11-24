import { AccessibilityInfo, Animated, LayoutAnimation, Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { motion } from '@/theme';

import { CountUp, ease, FadeIn, PressScale, Rise } from '../motion';

const mockSelection = jest.fn(() => Promise.resolve());
jest.mock('expo-haptics', () => ({ selectionAsync: () => mockSelection() }));

function opacityOf(r: ReactTestRenderer): number {
  const view = r.root.findByType(Animated.View);
  const style = [view.props.style].flat(Infinity).reduce((acc, s) => ({ ...acc, ...s }), {});
  return typeof style.opacity === 'number' ? style.opacity : style.opacity.__getValue();
}

afterEach(() => jest.restoreAllMocks());

it('rises into place after a delay that staggers it behind earlier siblings', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const timing = jest.spyOn(Animated, 'timing');
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(
      <Rise index={2}>
        <Text>摸高</Text>
      </Rise>,
    );
  });
  // The animation runs on the native driver, so the test checks where it starts and what it is asked to do.
  expect(opacityOf(r)).toBe(0);
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, delay: 2 * motion.stagger }));
  await act(async () => r.unmount());
});

it('shows content at once when the phone asks for less motion', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(
      <Rise>
        <Text>摸高</Text>
      </Rise>,
    );
  });
  expect(opacityOf(r)).toBe(1);
});

it('gives a light tick on press and still runs the action if haptics fail', async () => {
  const onPress = jest.fn();
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(
      <PressScale accessibilityLabel="跳跃测试" onPress={onPress}>
        <Text>跳跃测试</Text>
      </PressScale>,
    );
  });
  const button = () => r.root.findAll((n) => n.type !== PressScale && typeof n.props.onPress === 'function')[0];
  await act(async () => button().props.onPress());
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(mockSelection).toHaveBeenCalledTimes(1);

  mockSelection.mockImplementationOnce(() => {
    throw new Error('no haptics engine');
  });
  await act(async () => button().props.onPress());
  expect(onPress).toHaveBeenCalledTimes(2);
});

describe('one motion language', () => {
  it('eases every entrance on the same curve, and staggers only the first few siblings', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const timing = jest.spyOn(Animated, 'timing');
    await act(async () => {
      create(
        <Rise index={9}>
          <Text>第 10 项</Text>
        </Rise>,
      );
    });
    expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: motion.enter, delay: motion.staggerMax * motion.stagger, easing: ease }));
  });

  it('fades a new state in place, and shows it at once with less motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const timing = jest.spyOn(Animated, 'timing');
    let r!: ReactTestRenderer;
    await act(async () => {
      r = create(
        <FadeIn pop>
          <Text>✓</Text>
        </FadeIn>,
      );
    });
    expect(opacityOf(r)).toBe(0);
    expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: motion.swap, easing: ease }));

    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await act(async () => {
      r = create(
        <FadeIn pop>
          <Text>✓</Text>
        </FadeIn>,
      );
    });
    expect(opacityOf(r)).toBe(1);
  });

  it('eases the next layout change on the shared duration, and leaves it still with less motion', async () => {
    const configure = jest.spyOn(LayoutAnimation, 'configureNext').mockImplementation(() => {});
    for (const reduce of [false, true]) {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduce);
      let fresh!: typeof import('../motion');
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- a fresh copy reads the setting anew
        fresh = require('../motion');
      });
      await act(async () => {});
      configure.mockClear();
      fresh.nextLayout();
      if (reduce) expect(configure).not.toHaveBeenCalled();
      else expect(configure).toHaveBeenCalledWith(expect.objectContaining({ duration: motion.layout }));
    }
  });

  it('does not shrink a pressed button when the phone asks for less motion, and dims it instead', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const spring = jest.spyOn(Animated, 'spring');
    let r!: ReactTestRenderer;
    await act(async () => {
      r = create(
        <PressScale accessibilityLabel="保存">
          <Text>保存</Text>
        </PressScale>,
      );
    });
    const button = r.root.findAll((n) => n.type !== PressScale && typeof n.props.onPressIn === 'function')[0];
    await act(async () => button.props.onPressIn({}));
    expect(spring).not.toHaveBeenCalled();
    const style = [button.props.style].flat(Infinity).filter(Boolean).reduce((acc: object, s: object) => ({ ...acc, ...s }), {});
    expect(style).toMatchObject({ opacity: 0.8 });
  });

  it('rolls a number in the final value’s own precision, so the line never grows a digit', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    let listener: ((s: { value: number }) => void) | null = null;
    jest.spyOn(Animated, 'Value').mockImplementation(function (this: { addListener: unknown }) {
      return { addListener: (f: (s: { value: number }) => void) => ((listener = f), 'id'), removeListener: () => {}, stopAnimation: () => {} } as never;
    } as never);
    jest.spyOn(Animated, 'timing').mockReturnValue({ start: () => {}, stop: () => {} } as never);
    let r!: ReactTestRenderer;
    await act(async () => {
      r = create(<CountUp value={290} from={250} format={(v) => `${v} cm`} />);
    });
    await act(async () => listener!({ value: 271.46 }));
    expect(r.root.findByType(Text).props.children).toBe('271 cm');
  });
});
