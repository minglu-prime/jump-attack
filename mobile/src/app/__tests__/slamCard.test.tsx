// The med-ball slam card on the VBT screen: stature and ball size (remembered from the last slam), then off to film.
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';

import { migrate } from '@/db/migrations';
import { addTrial, ensureSession } from '@/db/repo';
import { openMemoryDb } from '@/db/testing/memoryDb';

import Vbt from '../vbt/index';

let mockDb = openMemoryDb();
const mockRouter = { push: jest.fn() };

jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
const mockAthlete = { current: { id: 1, name: '我自己' } };
jest.mock('@/state/athlete', () => ({ useAthlete: () => mockAthlete }));
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    get router() {
      return mockRouter;
    },
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
  };
});

function texts(root: ReactTestInstance): string {
  return root
    .findAllByType(Text)
    .map((t) => [t.props.children].flat(Infinity).filter((c) => typeof c === 'string' || typeof c === 'number').join(''))
    .join('\n');
}

const input = (root: ReactTestInstance, label: string) => root.findAllByType(TextInput).find((n) => n.props.accessibilityLabel === label)!;
const startButton = (root: ReactTestInstance) => root.findAll((n) => n.props.accessibilityLabel === '开始药球下砸' && typeof n.props.onPress === 'function')[0];

async function render(): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(<Vbt />);
  });
  await act(async () => {});
  return r;
}

async function type(root: ReactTestInstance, label: string, value: string) {
  await act(async () => input(root, label).props.onChangeText(value));
}

beforeEach(async () => {
  mockDb = openMemoryDb();
  await migrate(mockDb);
  jest.clearAllMocks();
});

it('asks for stature and ball size before filming, and passes them on with the ball’s mass', async () => {
  const r = await render();
  expect(texts(r.root)).toContain('药球下砸');
  expect(startButton(r.root).props.disabled).toBe(true);

  await type(r.root, '身高（cm）', '175');
  await type(r.root, '球的直径（cm）', '30');
  await type(r.root, '球重（kg，可选）', '6');
  expect(startButton(r.root).props.disabled).toBe(false);
  await act(async () => startButton(r.root).props.onPress());
  expect(mockRouter.push).toHaveBeenCalledWith({
    pathname: '/measure/capture',
    params: { metric: 'med_ball_slam', session: expect.any(String), stature: '175', ball: '30', load: '6' },
  });
});

it('says what is wrong with an implausible ball size', async () => {
  const r = await render();
  await type(r.root, '身高（cm）', '175');
  await type(r.root, '球的直径（cm）', '300');
  expect(texts(r.root)).toContain('球的直径一般在 15–45 cm');
  expect(startButton(r.root).props.disabled).toBe(true);
});

it('starts from the last slam’s setup and shows its best rep', async () => {
  await ensureSession(mockDb, 'a', 1, 'med_ball_slam');
  await addTrial(mockDb, { session_id: 'a', value: 9.1, load_kg: 6, detail: { source: 'video', stature_cm: 176, ball_cm: 28 } });
  await addTrial(mockDb, { session_id: 'a', value: 9.6, load_kg: 6, detail: { source: 'video', stature_cm: 176, ball_cm: 28 } });
  const r = await render();
  expect(input(r.root, '身高（cm）').props.value).toBe('176');
  expect(input(r.root, '球的直径（cm）').props.value).toBe('28');
  expect(input(r.root, '球重（kg，可选）').props.value).toBe('6');
  expect(texts(r.root)).toContain('9.6');
  await act(async () => startButton(r.root).props.onPress());
  expect(mockRouter.push).toHaveBeenCalledWith({
    pathname: '/measure/capture',
    params: { metric: 'med_ball_slam', session: expect.any(String), stature: '176', ball: '28', load: '6' },
  });
});
