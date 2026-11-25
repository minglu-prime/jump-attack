// Approach touch is standing reach plus the jump: with no standing reach on file, the test asks for it first, right
// there, instead of letting a whole clip be filmed and analysed into a result that can't be saved.
import { Text, TextInput } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { migrate } from '@/db/migrations';
import { getAthlete, type Athlete } from '@/db/repo';
import { openMemoryDb } from '@/db/testing/memoryDb';

import Capture from '../measure/capture';

const mockDb = openMemoryDb();
const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true };
let mockParams: Record<string, string> = {};
const mockAthlete: { current: Athlete | null; reload: jest.Mock } = { current: null, reload: jest.fn() };

jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
jest.mock('@/state/athlete', () => ({ useAthlete: () => mockAthlete }));
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn() }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    get router() {
      return mockRouter;
    },
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
  };
});
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn(), UIImagePickerPreferredAssetRepresentationMode: { Current: 'current' } }));

function texts(root: ReactTestInstance): string {
  return root
    .findAllByType(Text)
    .map((t) => [t.props.children].flat(Infinity).filter((c) => typeof c === 'string' || typeof c === 'number').join(''))
    .join('\n');
}

const pressable = (root: ReactTestInstance, label: string) =>
  root.findAll((n) => typeof n.props.onPress === 'function' && n.findAllByType(Text).some((t) => [t.props.children].flat().join('') === label))[0];

async function render(): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(<Capture />);
  });
  return r;
}

beforeAll(async () => {
  await migrate(mockDb);
  mockAthlete.current = await getAthlete(mockDb, 1);
  mockAthlete.reload.mockImplementation(async () => {
    mockAthlete.current = await getAthlete(mockDb, 1);
  });
});

it('asks for standing reach before an approach touch is filmed, and saves it right there', async () => {
  mockParams = { metric: 'approach_touch', session: 'at-1' };
  expect(mockAthlete.current!.standing_reach_cm).toBeNull();
  const r = await render();
  expect(texts(r.root)).toContain('先填站立摸高');
  // Filming or importing now would end in a result that can't be saved.
  expect(pressable(r.root, 'App 里直接拍')).toBeUndefined();
  expect(pressable(r.root, '从相册导入视频')).toBeUndefined();

  const field = r.root.find((n) => n.type === TextInput && n.props.accessibilityLabel === '站立摸高（cm）');
  await act(async () => field.props.onChangeText('400'));
  await act(async () => pressable(r.root, '保存站立摸高').props.onPress());
  expect(texts(r.root)).toContain('站立摸高一般在 150–300 cm，检查一下输入');
  expect((await getAthlete(mockDb, 1))!.standing_reach_cm).toBeNull();

  await act(async () => field.props.onChangeText('238'));
  await act(async () => pressable(r.root, '保存站立摸高').props.onPress());
  expect((await getAthlete(mockDb, 1))!.standing_reach_cm).toBe(238);
  await act(async () => r.update(<Capture />));
  expect(texts(r.root)).not.toContain('先填站立摸高');
  expect(pressable(r.root, '从相册导入视频')).toBeDefined();
});

it('goes straight to filming for a jump that needs no standing reach', async () => {
  mockParams = { metric: 'cmj', session: 'cmj-1' };
  const r = await render();
  expect(texts(r.root)).not.toContain('先填站立摸高');
  expect(pressable(r.root, '从相册导入视频')).toBeDefined();
});
