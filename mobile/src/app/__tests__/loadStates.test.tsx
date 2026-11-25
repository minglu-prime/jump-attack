// Every screen that reads the database says when it is still loading and when the read failed, and loads again
// on retry, instead of a blank page, an endless spinner or a "no records" that isn't true.
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { ActivityIndicator, Text } from 'react-native';

import { migrate } from '@/db/migrations';
import * as dunk from '@/db/dunk';
import * as dunkAttempts from '@/db/dunkAttempts';
import * as recovery from '@/db/recovery';
import * as repo from '@/db/repo';
import { getAthlete, type Athlete } from '@/db/repo';
import { openMemoryDb } from '@/db/testing/memoryDb';
import * as team from '@/state/team';
import * as testDay from '@/state/testDay';
import * as training from '@/state/training';

import History from '../(tabs)/history';
import Train from '../(tabs)/train';
import Result from '../measure/result';
import PlanOverview from '../plan/index';
import Attempt from '../attempt';
import Attempts from '../attempts';
import ConditioningResult from '../conditioning/result';
import Dunk from '../dunk';
import MetricHistory from '../history/[metric]';
import Recovery from '../recovery/index';
import Team from '../team';
import TestDay from '../test-day';
import WorkoutScreen from '../workout/[date]';

const mockDb = openMemoryDb();
const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() };
let mockParams: Record<string, string> = {};

jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
const mockAthlete: { current: Athlete | null; athletes: Athlete[]; select: jest.Mock } = { current: null, athletes: [], select: jest.fn() };
jest.mock('@/state/athlete', () => ({ useAthlete: () => mockAthlete }));
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(), notificationAsync: jest.fn(), NotificationFeedbackType: { Success: 'success' } }));
jest.mock('@/media/poseLib', () => ({ poseLibReady: () => false }));
jest.mock('@/media/takes', () => ({ pruneTakes: jest.fn(), takeUri: () => null }));
jest.mock('expo-video', () => ({ useVideoPlayer: () => ({}), VideoView: () => null }));
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

let shown: ReactTestRenderer | null = null;

async function render(el: React.ReactElement): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(el);
  });
  shown = r;
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
  mockAthlete.athletes = [mockAthlete.current!];
  await repo.ensureSession(mockDb, 's1', 1, 'cmj');
  await repo.addTrial(mockDb, { session_id: 's1', value: 42 });
  await repo.ensureSession(mockDb, 'r1', 1, 'rsa');
  for (const value of [4.21, 4.3]) await repo.addTrial(mockDb, { session_id: 'r1', value });
});

afterEach(async () => {
  // Unmounted so a delayed fade-in never fires after the test environment is gone.
  await act(async () => shown?.unmount());
  shown = null;
  jest.restoreAllMocks();
});

describe.each([
  ['training tab', () => <Train />, () => jest.spyOn(training, 'loadTraining'), '训练没加载出来', '还没有训练计划'],
  ['plan overview', () => <PlanOverview />, () => jest.spyOn(training, 'loadTraining'), '计划没加载出来', '还没有训练计划'],
  ['history tab', () => <History />, () => jest.spyOn(repo, 'sessionCounts'), '历史没加载出来', 'CMJ 反向跳'],
  ['a test result', () => <Result />, () => jest.spyOn(repo, 'listTrials'), '成绩没加载出来', '42.0'],
  ['the dunk diagnosis', () => <Dunk />, () => jest.spyOn(dunk, 'loadDiagnosis'), '扣篮诊断没加载出来', '改扣篮线'],
  ['one dunk attempt', () => <Attempt />, () => jest.spyOn(dunkAttempts, 'listDunkAttempts'), '这次扣篮没加载出来', '找不到这次扣篮记录'],
  ['the dunk attempts', () => <Attempts />, () => jest.spyOn(dunkAttempts, 'listDunkAttempts'), '扣篮记录没加载出来', '还没记录'],
  ['the team', () => <Team />, () => jest.spyOn(team, 'loadTeam'), '团队没加载出来', '我自己'],
  ['the test day', () => <TestDay />, () => jest.spyOn(testDay, 'loadTestDay'), '测试日没加载出来', '助跑摸高'],
  ['a workout', () => <WorkoutScreen />, () => jest.spyOn(training, 'loadTraining'), '训练没加载出来', '这天没有安排训练'],
  ['a metric’s history', () => <MetricHistory />, () => jest.spyOn(repo, 'listMetricResults'), '历史没加载出来', '42.0'],
  ['a conditioning result', () => <ConditioningResult />, () => jest.spyOn(repo, 'listTrials'), '成绩没加载出来', '4.21', { metric: 'rsa', session: 'r1' }],
  ['recovery', () => <Recovery />, () => jest.spyOn(recovery, 'listRecoveryDays'), '恢复数据没加载出来', '今日恢复状态'],
] as [string, () => React.ReactElement, () => jest.SpyInstance, string, string, Record<string, string>?][])('%s', (_name, screen, loader, failed, loadedText, params) => {
  beforeEach(() => {
    mockParams = { metric: 'cmj', session: 's1', id: '999', date: '2026-11-02', ...params };
  });

  it('shows a spinner, not a blank page or an empty state, while loading', async () => {
    loader().mockImplementationOnce(never);
    const r = await render(screen());
    expect(r.root.findAllByType(ActivityIndicator).length).toBeGreaterThan(0);
    // The shared <Loading/>: it fades in late (no flash on a fast read) and tells a screen reader what is going on.
    expect(r.root.findAll((n) => n.props.accessibilityLabel === '正在加载').length).toBeGreaterThan(0);
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
