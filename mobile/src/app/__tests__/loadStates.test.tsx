// Every screen that reads the database says when it is still loading and when the read failed, and loads again
// on retry, instead of a blank page, an endless spinner or a "no records" that isn't true.
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { ActivityIndicator, Text } from 'react-native';

import { migrate } from '@/db/migrations';
import * as repo from '@/db/repo';
import { getAthlete, type Athlete } from '@/db/repo';
import { openMemoryDb } from '@/db/testing/memoryDb';
import * as training from '@/state/training';

import History from '../(tabs)/history';
import Train from '../(tabs)/train';
import Result from '../measure/result';
import PlanOverview from '../plan/index';

const mockDb = openMemoryDb();
const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() };
let mockParams: Record<string, string> = {};

jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
const mockAthlete: { current: Athlete | null } = { current: null };
jest.mock('@/state/athlete', () => ({ useAthlete: () => mockAthlete }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    get router() {
      return mockRouter;
    },
    Link: ({ children }: { children: React.ReactNode }) => children,
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
    Stack: { Screen: () => null },
  };
});

function texts(root: ReactTestInstance): string {
  return root
    .findAllByType(Text)
    .map((t) => [t.props.children].flat(Infinity).filter((c) => typeof c === 'string' || typeof c === 'number').join(''))
    .join('\n');
}

async function render(el: React.ReactElement): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(el);
  });
  await act(async () => {});
  return r;
}

async function retry(r: ReactTestRenderer) {
  await act(async () => r.root.find((n) => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === '重试').props.onPress());
  await act(async () => {});
}

const never = () => new Promise<never>(() => {});

beforeAll(async () => {
  await migrate(mockDb);
  mockAthlete.current = await getAthlete(mockDb, 1);
  await repo.ensureSession(mockDb, 's1', 1, 'cmj');
  await repo.addTrial(mockDb, { session_id: 's1', value: 42 });
});

afterEach(() => jest.restoreAllMocks());

describe.each([
  ['training tab', () => <Train />, () => jest.spyOn(training, 'loadTraining'), '训练没加载出来', '还没有训练计划'],
  ['plan overview', () => <PlanOverview />, () => jest.spyOn(training, 'loadTraining'), '计划没加载出来', '还没有训练计划'],
  ['history tab', () => <History />, () => jest.spyOn(repo, 'sessionCounts'), '历史没加载出来', 'CMJ 反向跳'],
  ['a test result', () => <Result />, () => jest.spyOn(repo, 'listTrials'), '成绩没加载出来', '42.0'],
])('%s', (_name, screen, loader, failed, loadedText) => {
  beforeEach(() => {
    mockParams = { metric: 'cmj', session: 's1' };
  });

  it('shows a spinner, not a blank page or an empty state, while loading', async () => {
    loader().mockImplementationOnce(never);
    const r = await render(screen());
    expect(r.root.findAllByType(ActivityIndicator).length).toBeGreaterThan(0);
    expect(texts(r.root)).not.toContain('还没有');
    expect(texts(r.root)).not.toContain('—');
  });

  it('says what failed and loads again on retry', async () => {
    loader().mockRejectedValueOnce(new Error('disk I/O error'));
    const r = await render(screen());
    expect(texts(r.root)).toContain(`${failed}\nError: disk I/O error`);

    await retry(r);
    expect(texts(r.root)).not.toContain(failed);
    expect(texts(r.root)).toContain(loadedText);
  });
});
