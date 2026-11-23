// Drives the home screen's today card against an in-memory database: no plan, a training day before, during and
// after the workout, a rest day, and the loading and failure states.
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { ActivityIndicator, Text } from 'react-native';

import * as dunkDb from '@/db/dunk';
import { migrate } from '@/db/migrations';
import { getAthlete, type Athlete } from '@/db/repo';
import { openMemoryDb } from '@/db/testing/memoryDb';
import { endPlan, finishWorkout, getActivePlan, getWorkout, startPlan } from '@/db/training';
import { addDays, toISODate, weekday } from '@/domain/dates';

import Home from '../(tabs)/index';

const mockDb = openMemoryDb();
const mockRouter = { push: jest.fn(), back: jest.fn(), navigate: jest.fn() };

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
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
  };
});

const today = toISODate(new Date());

function texts(root: ReactTestInstance): string {
  return root
    .findAllByType(Text)
    .map((t) => [t.props.children].flat(Infinity).filter((c) => typeof c === 'string' || typeof c === 'number').join(''))
    .join('\n');
}

async function press(root: ReactTestInstance, label: string) {
  await act(async () => root.find((n) => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === label).props.onPress());
}

async function render(): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(<Home />);
  });
  await act(async () => {});
  return r;
}

async function newPlan(weekdays: number[]) {
  const old = await getActivePlan(mockDb, 1);
  if (old) await endPlan(mockDb, old.id);
  await startPlan(mockDb, 1, { templateCode: 'jump-4-1', startDate: today, weekdays });
}

beforeAll(async () => {
  await migrate(mockDb);
  mockAthlete.current = await getAthlete(mockDb, 1);
});

beforeEach(() => {
  for (const f of Object.values(mockRouter)) f.mockClear();
});

it('shows a spinner until the home data is in', async () => {
  const spy = jest.spyOn(dunkDb, 'loadDiagnosis').mockReturnValueOnce(new Promise(() => {}));
  const r = await render();
  expect(r.root.findAllByType(ActivityIndicator)).toHaveLength(1);
  spy.mockRestore();
});

it('says what failed and loads again on retry', async () => {
  const spy = jest.spyOn(dunkDb, 'loadDiagnosis').mockRejectedValueOnce(new Error('disk I/O error'));
  const r = await render();
  expect(texts(r.root)).toContain('首页没加载出来\nError: disk I/O error');

  await press(r.root, '重试');
  expect(texts(r.root)).not.toContain('首页没加载出来');
  expect(texts(r.root)).toContain('今日训练');
  spy.mockRestore();
});

it('points to picking a plan when there is none', async () => {
  const r = await render();
  expect(texts(r.root)).toContain('今日训练\n还没有训练计划');
  await press(r.root, '选择训练计划');
  expect(mockRouter.push).toHaveBeenCalledWith('/plan/new');
});

it('shows today’s session and starts it from home', async () => {
  await newPlan([weekday(today)]);
  const r = await render();
  const t = texts(r.root);
  expect(t).toContain('A · 力量 + 跳跃');
  expect(t).toContain('杠铃后蹲');

  await press(r.root, '开始今日训练');
  const plan = await getActivePlan(mockDb, 1);
  expect(await getWorkout(mockDb, plan!.id, today)).toMatchObject({ sessionCode: 'A' });
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/workout/[date]', params: { date: today } });
});

it('continues a started workout and opens a finished one', async () => {
  const r = await render();
  await press(r.root, '继续训练');
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/workout/[date]', params: { date: today } });

  const plan = await getActivePlan(mockDb, 1);
  await finishWorkout(mockDb, (await getWorkout(mockDb, plan!.id, today))!.id);
  const done = await render();
  expect(texts(done.root)).toContain('已完成');
  await press(done.root, '查看训练记录');
  expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/workout/[date]', params: { date: today } });
});

it('names the next session on a rest day', async () => {
  const tomorrow = addDays(today, 1);
  await newPlan([weekday(tomorrow)]);
  const r = await render();
  const t = texts(r.root);
  expect(t).toContain('今日训练\n休息日');
  expect(t).toContain('下次：');
  expect(t).toContain('A 力量 + 跳跃');
  expect(r.root.findAll((n) => n.props.accessibilityLabel === '开始今日训练')).toHaveLength(0);
});
