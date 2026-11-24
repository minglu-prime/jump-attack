import { Link, router, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayStateRow } from '@/components/dunk';
import { DunkSummary } from '@/components/DunkPanel';
import { Icon } from '@/components/Icon';
import { PressScale, Rise } from '@/components/motion';
import { ScoreScale } from '@/components/ScoreScale';
import { ReachHero } from '@/components/ReachHero';
import { AdjustmentNote } from '@/components/training';
import { Button, Card, LoadFailed, Loading } from '@/components/ui';
import { loadDiagnosis } from '@/db/dunk';
import { listDunkAttempts } from '@/db/dunkAttempts';
import { listPain, setPain } from '@/db/pain';
import { dayState, RIM_CM, type DayState, type DunkDiagnosis } from '@/domain/dunk';
import { addDays, shortDate, type ISODate } from '@/domain/dates';
import { attemptSummary, BALL_NAME, type AttemptSummary } from '@/domain/dunkAttempts';
import { kneeStatus, PAIN_HINT, PAIN_LIMIT, type PainEntry } from '@/domain/pain';
import { nextSession, planDay, planFinished } from '@/domain/plan';
import { CATEGORIES, SUPPORT_CATEGORIES, type CategoryDef } from '@/domain/metrics';
import { tr } from '@/i18n';
import { useAthlete } from '@/state/athlete';
import { loadGoalSummary } from '@/state/goal';
import { beginWorkout, loadReadiness, loadTraining, sessionFor, todayISO, type DayReadiness, type TrainingData } from '@/state/training';
import { colors, radius, text } from '@/theme';

type Goal = { diagnosis: DunkDiagnosis; state: DayState; attempts: AttemptSummary | null; due: GoalText; readiness: DayReadiness; training: TrainingData | null };

/** Leads with how far the athlete is from dunking; every module below serves that. */
export default function Home() {
  const db = useSQLiteContext();
  const { current } = useAthlete();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [pain, setPainEntries] = useState<PainEntry[]>([]);
  const today = todayISO();
  const main = CATEGORIES.filter((c) => !SUPPORT_CATEGORIES.includes(c.key));
  const support = CATEGORIES.filter((c) => SUPPORT_CATEGORIES.includes(c.key));

  const load = useCallback(async () => {
    if (!current) return;
    const today = todayISO();
    try {
      const [diagnosis, readiness, attempts, training, entries] = await Promise.all([
        loadDiagnosis(db, current),
        loadReadiness(db, current.id, today),
        listDunkAttempts(db, current.id),
        loadTraining(db, current.id),
        listPain(db, current.id),
      ]);
      setPainEntries(entries);
      setGoal({
        diagnosis,
        state: dayState(readiness),
        // The goal setup first; practice at a lower rim or with a smaller ball when that is all there is.
        attempts: attemptSummary(attempts, { rimCm: current.rim_height_cm ?? RIM_CM, ball: 'basketball' }) ?? attemptSummary(attempts),
        due: await loadGoalSummary(db, current, diagnosis, today),
        readiness,
        training,
      });
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [db, current]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Same as the training tab's start: begin (or reopen) today's workout with today's readiness, then open it.
  async function openToday(training: TrainingData) {
    setStarting(true);
    try {
      await beginWorkout(db, training, today);
      router.push({ pathname: '/workout/[date]', params: { date: today } });
    } catch (e) {
      Alert.alert(tr('无法开始训练'), String(e));
    } finally {
      setStarting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <LoadFailed title={tr('首页没加载出来')} error={error} onRetry={load} /> : !goal && <Loading />}
        {goal && (
          <View style={styles.goal}>
            <ReachHero diagnosis={goal.diagnosis} standingReach={current?.standing_reach_cm ?? null} name={current?.name ?? ''} onSwitchAthlete={() => router.push('/me')} />
            <Rise index={1}>
              <DunkSummary diagnosis={goal.diagnosis} />
            </Rise>
            <Rise index={2}>
              <TodayCard training={goal.training} readiness={goal.readiness} pain={pain} today={today} starting={starting} onOpen={openToday} />
            </Rise>
            <Rise index={2}>
              <GoalRow due={goal.due} />
            </Rise>
            <Rise index={2}>
              <AttemptsRow summary={goal.attempts} />
            </Rise>
          </View>
        )}

        {current && (
          <MorningKnee
            entries={pain}
            today={today}
            onPick={async (score) => {
              await setPain(db, current.id, { date: today, kind: 'morning', score });
              setPainEntries(await listPain(db, current.id));
            }}
          />
        )}

        <Rise index={2} style={{ gap: 12 }}>
          <Text style={text.section}>{tr('训练和测试')}</Text>
          {goal && <DayStateRow state={goal.state} />}
          <View style={styles.list}>
            {main.map((c) => (
              <ModuleRow key={c.key} category={c} />
            ))}
            <PressScale accessibilityLabel={tr('辅助')} accessibilityState={{ expanded: supportOpen }} style={styles.support} onPress={() => setSupportOpen((open) => !open)}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.supportTitle}>{tr('辅助')}</Text>
                <Text style={styles.moduleSub} numberOfLines={1}>
                  {support.map((c) => c.name).join(' · ')}
                </Text>
              </View>
              <Icon name={supportOpen ? 'chevronDown' : 'chevronRight'} size={18} color={colors.textMuted} />
            </PressScale>
            {supportOpen && support.map((c) => <ModuleRow key={c.key} category={c} />)}
          </View>
        </Rise>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * The morning after training with knee pain recorded: how is it today? The pain-monitoring model reads this
 * against the morning before (domain/pain.ts).
 */
function MorningKnee({ entries, today, onPick }: { entries: PainEntry[]; today: string; onPick: (score: number) => void }) {
  const askedYesterday = entries.some((e) => e.kind === 'session' && e.date === addDays(today, -1));
  if (!askedYesterday) return null;
  const morning = entries.find((e) => e.kind === 'morning' && e.date === today)?.score ?? null;
  const knee = morning != null ? kneeStatus(entries, today) : null;
  return (
    <Card style={{ gap: 8 }}>
      <ScoreScale label={tr('今早膝盖几分')} value={morning} onPick={onPick} hint={tr(PAIN_HINT)} warnAbove={PAIN_LIMIT} />
      {knee?.reasons.map((r) => (
        <Text key={r} style={[text.muted, (knee.light === 'red' || knee.light === 'stop') && { color: colors.warn }]}>
          {r}
        </Text>
      ))}
      {knee?.light === 'green' && <Text style={text.muted}>{tr('膝盖没问题，照常练。')}</Text>}
    </Card>
  );
}

/**
 * 今天练什么: today's session as the training tab shows it (readiness and knee adjustments included), with the way
 * into it; on a rest day the next session; without a plan the way to pick one.
 */
function TodayCard({
  training,
  readiness,
  pain,
  today,
  starting,
  onOpen,
}: {
  training: TrainingData | null;
  readiness: DayReadiness;
  pain: PainEntry[];
  today: ISODate;
  starting: boolean;
  onOpen: (training: TrainingData) => void;
}) {
  if (!training) {
    return (
      <Card style={{ gap: 12 }}>
        <Text style={text.muted}>{tr('今日训练')}</Text>
        <Text style={text.heading}>{tr('还没有训练计划')}</Text>
        <Button label={tr('选择训练计划')} accessibilityLabel={tr('选择训练计划')} onPress={() => router.push('/plan/new')} />
      </Card>
    );
  }

  const { template, plan, workouts } = training;
  const planned = planDay(template, plan, today);
  if (!planned) {
    const next = nextSession(template, plan, addDays(today, 1));
    return (
      <Card style={{ gap: 4 }}>
        <Text style={text.muted}>{tr('今日训练')}</Text>
        <Text style={text.heading}>{planFinished(template, plan, today) ? tr('计划已完成') : tr('休息日')}</Text>
        {next && <Text style={text.muted}>{tr('下次：{date} · {code} {name}', { date: shortDate(next.date), code: next.session.code, name: next.session.name })}</Text>}
      </Card>
    );
  }

  const workout = workouts.find((w) => w.date === today);
  const knee = kneeStatus(pain, today);
  const shown = sessionFor(planned, workout, readiness.readiness, knee?.light);
  const label = workout?.finishedAt ? tr('查看训练记录') : workout ? tr('继续训练') : tr('开始今日训练');
  return (
    <Card style={{ gap: 12 }}>
      <View style={styles.todayHead}>
        <Text style={text.muted}>{tr('今日训练')}</Text>
        {workout?.finishedAt ? <Text style={[styles.tag, { color: colors.good }]}>{tr('已完成')}</Text> : workout ? <Text style={[styles.tag, { color: colors.warn }]}>{tr('进行中')}</Text> : null}
      </View>
      <View style={{ gap: 2 }}>
        <Text style={text.heading}>
          {planned.session.code} · {planned.session.name}
        </Text>
        <Text style={text.muted}>{shown.session.items.map((p) => p.name).join(' · ')}</Text>
      </View>
      <AdjustmentNote
        adjustments={shown.adjustments}
        reason={workout ? workout.reason : readiness.signals.join(tr('；')) || null}
        dropPct={workout ? workout.cmjDrop : readiness.dropPct}
        kneeReasons={knee?.reasons}
      />
      {planned.goal === 'test' ? (
        // The test day's own actions (touch test, dunk attempts) live on the training tab.
        <Button label={tr('打开训练页')} accessibilityLabel={tr('打开训练页')} onPress={() => router.push('/train')} />
      ) : (
        <Button label={label} accessibilityLabel={label} variant={workout?.finishedAt ? 'secondary' : 'primary'} busy={starting} onPress={() => onOpen(training)} />
      )}
    </Card>
  );
}

type GoalText = { title: string; lines: string[] };

/** The goal date: the countdown, when the touch trend reaches the line, and what that does to training. Set in 我的. */
function GoalRow({ due }: { due: GoalText }) {
  return (
    <PressScale accessibilityLabel={tr('目标日')} style={styles.module} onPress={() => router.push('/me')}>
      <View style={[styles.tile, { backgroundColor: colors.surfaceRaised }]}>
        <Icon name="plan" size={22} color={colors.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.moduleTitle}>{due.title}</Text>
        {due.lines.map((l) => (
          <Text key={l} style={styles.moduleSub}>
            {l}
          </Text>
        ))}
      </View>
      <Icon name="chevronRight" size={18} color={colors.textMuted} />
    </PressScale>
  );
}

/** The real result: recent dunk attempts, and the way into logging them. */
function AttemptsRow({ summary: s }: { summary: AttemptSummary | null }) {
  return (
    <PressScale accessibilityLabel={tr('扣篮尝试')} style={styles.module} onPress={() => router.push('/attempts')}>
      <View style={[styles.tile, { backgroundColor: colors.surfaceRaised }]}>
        <Icon name="jump" size={22} color={colors.rim} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.moduleTitle}>{tr('扣篮尝试')}</Text>
        <Text style={styles.moduleSub} numberOfLines={1}>
          {s ? tr('{rimCm} cm {BALL_NAME}：最近 {total} 次扣进 {made} 次', { rimCm: s.rimCm, BALL_NAME: BALL_NAME[s.ball], total: s.total, made: s.made }) : tr('去篮下试扣，每试一次点一下')}
        </Text>
      </View>
      <Icon name="chevronRight" size={18} color={colors.textMuted} />
    </PressScale>
  );
}

function ModuleRow({ category: c }: { category: CategoryDef }) {
  const href = c.href as Href | null;
  const row = (
    <View style={[styles.module, !href && styles.moduleDisabled]}>
      <View style={[styles.tile, { backgroundColor: c.tile }]}>
        <Icon name={c.icon} size={22} color={c.color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.moduleTitle}>{c.name}</Text>
        <Text style={styles.moduleSub} numberOfLines={1}>
          {c.subtitle}
        </Text>
      </View>
      {href ? <Icon name="chevronRight" size={18} color={colors.textMuted} /> : <Text style={styles.moduleSub}>{tr('即将上线')}</Text>}
    </View>
  );
  return href ? (
    <Link href={href} asChild>
      <PressScale accessibilityLabel={c.name}>{row}</PressScale>
    </Link>
  ) : (
    <View accessibilityState={{ disabled: true }}>{row}</View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 12, gap: 24 },
  goal: { gap: 12 },
  todayHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: { fontSize: 12, fontWeight: '700' },
  list: { gap: 10 },
  module: { backgroundColor: colors.surface, borderRadius: radius.row, minHeight: 68, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  moduleDisabled: { opacity: 0.5 },
  tile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  moduleTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  moduleSub: { color: colors.textMuted, fontSize: 12 },
  support: { minHeight: 52, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.row, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 14 },
  supportTitle: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
});
