import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip } from '@/components/ui';
import { listSessionResults, newSessionId } from '@/db/repo';
import { lastSlamSetup } from '@/db/slam';
import { latestEstimate, listVbtSets, type VbtSet } from '@/db/vbt';
import { parseNumber } from '@/domain/entry';
import { getCategory, MED_BALL_SLAM, VBT_LIFTS } from '@/domain/metrics';
import { BALL_RANGE_CM, STATURE_RANGE_CM } from '@/domain/slam';
import { ZONES } from '@/domain/vbt';
import { decimal, localized, tr } from '@/i18n';
import { useAthlete } from '@/state/athlete';
import { colors, fonts, text } from '@/theme';

const COLOR = getCategory('vbt').color;
const POSITIONS = localized([
  { key: 'floor', name: '地面' },
  { key: 'hang', name: '悬垂' },
  { key: 'power', name: '发力位' },
], 'name');

/** A card per lift; the Olympic pulls pick a start position. */
const LIFTS = localized([
  { name: '深蹲', code: 'vbt_squat', zone: '常用区间：绝对力量 / 加速力量' },
  { name: '高翻', base: 'vbt_clean', zone: '常用区间：速度-力量' },
  { name: '高拉', base: 'vbt_pull', zone: '常用区间：速度-力量 / 速度' },
  { name: '深蹲跳', code: 'vbt_squat_jump', zone: '轻负荷 · 速度 / 速度-力量' },
], 'name', 'zone');

export default function Vbt() {
  const db = useSQLiteContext();
  const { current } = useAthlete();
  const [sets, setSets] = useState<Record<string, VbtSet[]>>({});
  const [pos, setPos] = useState<Record<string, string>>({ vbt_clean: 'hang', vbt_pull: 'floor' });

  useFocusEffect(
    useCallback(() => {
      if (!current) return;
      Promise.all(VBT_LIFTS.map(async (l) => [l.code, await listVbtSets(db, current.id, l.code)] as const)).then((rows) => setSets(Object.fromEntries(rows)));
    }, [db, current]),
  );

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Text style={text.muted}>{tr('追踪杠铃速度，按速度区间控制训练强度')}</Text>
      {LIFTS.map((l) => {
        const code = l.code ?? `${l.base}_${pos[l.base!]}`;
        const lift = VBT_LIFTS.find((x) => x.code === code)!;
        const mine = sets[code] ?? [];
        const last = mine.at(-1);
        const est = latestEstimate(mine, code);
        return (
          <Card key={l.name} style={{ gap: 10 }}>
            <View style={styles.head}>
              <Text style={text.heading}>{lift.name}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={text.caption}>{tr('上次平均')}</Text>
                <Text style={styles.v}>
                  {last ? decimal(last.v, 2) : '—'} <Text style={styles.unit}>m/s{last?.load ? ` @ ${last.load} kg` : ''}</Text>
                </Text>
              </View>
            </View>
            {l.base && (
              <View style={styles.chips}>
                {POSITIONS.map((p) => (
                  <Chip key={p.key} label={p.name} selected={pos[l.base!] === p.key} onPress={() => setPos((s) => ({ ...s, [l.base!]: p.key }))} color={COLOR} />
                ))}
              </View>
            )}
            <View style={styles.foot}>
              <Text style={[text.caption, { flex: 1 }]}>
                {l.zone}
                {est?.oneRm ? tr(' · 估算 1RM {oneRm} kg', { oneRm: Math.round(est.oneRm) }) : ''}
              </Text>
              <Button label={tr('开始')} onPress={() => router.push({ pathname: '/vbt/[lift]', params: { lift: code, session: newSessionId() } })} style={{ height: 40, paddingHorizontal: 18 }} />
            </View>
          </Card>
        );
      })}

      <SlamCard />

      <Card style={{ gap: 8 }}>
        <Text style={text.section}>{tr('速度区间（平均速度 m/s）')}</Text>
        {ZONES.map((z) => (
          <View key={z.key} style={styles.zone}>
            <Text style={text.body}>{z.name}</Text>
            <Text style={styles.zoneRange}>{z.max === Infinity ? `> ${z.min}` : z.min === 0 ? `< ${z.max}` : `${z.min}–${z.max}`}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const BALL_KG_RANGE: [number, number] = [0.5, 30];

/** What is wrong with a typed value, or null when it is empty (and optional) or plausible. */
function rangeProblem(raw: string, name: string, [lo, hi]: [number, number], unit: string): string | null {
  if (raw.trim() === '') return null;
  const v = parseNumber(raw);
  return v != null && v >= lo && v <= hi ? null : tr('{name}一般在 {span}，检查一下输入', { name, span: `${lo}–${hi} ${unit}` });
}

/**
 * Med-ball slam: filmed and marked rep by rep (measure/mark), the speed worked out from the athlete's stature and the
 * ball's size. Both are asked here, starting from the last slam's, and passed on with the ball's mass.
 */
function SlamCard() {
  const db = useSQLiteContext();
  const { current } = useAthlete();
  const [stature, setStature] = useState('');
  const [ball, setBall] = useState('');
  const [kg, setKg] = useState('');
  const [last, setLast] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!current) return;
      Promise.all([lastSlamSetup(db, current.id), listSessionResults(db, current.id, MED_BALL_SLAM.code)])
        .then(([setup, sessions]) => {
          // Only fills what hasn't been typed in yet.
          if (setup.statureCm != null) setStature((s) => s || String(setup.statureCm));
          if (setup.ballCm != null) setBall((s) => s || String(setup.ballCm));
          if (setup.ballKg != null) setKg((s) => s || String(setup.ballKg));
          setLast(sessions.at(-1)?.best ?? null);
          setFailed(false);
        })
        .catch((e) => {
          console.error('Could not read the last med-ball slam:', e);
          setFailed(true);
        });
    }, [db, current]),
  );

  const problems = [
    rangeProblem(stature, tr('身高'), STATURE_RANGE_CM, 'cm'),
    rangeProblem(ball, tr('球的直径'), BALL_RANGE_CM, 'cm'),
    rangeProblem(kg, tr('球重'), BALL_KG_RANGE, 'kg'),
  ].filter((p) => p != null);
  const ready = stature.trim() !== '' && ball.trim() !== '' && problems.length === 0;

  function start() {
    const load = parseNumber(kg);
    router.push({
      pathname: '/measure/capture',
      params: {
        metric: MED_BALL_SLAM.code,
        session: newSessionId(),
        stature: String(parseNumber(stature)),
        ball: String(parseNumber(ball)),
        ...(load != null ? { load: String(load) } : {}),
      },
    });
  }

  return (
    <Card style={{ gap: 10 }}>
      <View style={styles.head}>
        <Text style={text.heading}>{MED_BALL_SLAM.name}</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={text.caption}>{tr('上次最快')}</Text>
          <Text style={styles.v}>
            {last != null ? decimal(last, 1) : '—'} <Text style={styles.unit}>m/s</Text>
          </Text>
        </View>
      </View>
      <Text style={text.caption}>{tr('录像逐次标出球过头顶和落地，算下砸速度。身高和球的直径用来换算距离。')}</Text>
      <View style={styles.fields}>
        <SlamField label={tr('身高（cm）')} value={stature} onChange={setStature} placeholder="175" />
        <SlamField label={tr('球的直径（cm）')} value={ball} onChange={setBall} placeholder="30" />
        <SlamField label={tr('球重（kg，可选）')} value={kg} onChange={setKg} placeholder="6" />
      </View>
      {problems.map((p) => (
        <Text key={p} style={styles.problem}>
          {p}
        </Text>
      ))}
      {failed && <Text style={styles.problem}>{tr('没读到上次的设置，手填一下')}</Text>}
      <View style={styles.foot}>
        <Text style={[text.caption, { flex: 1 }]}>{tr('最好用 240 fps 慢动作拍')}</Text>
        <Button label={tr('开始')} accessibilityLabel={tr('开始药球下砸')} onPress={start} disabled={!ready} style={{ height: 40, paddingHorizontal: 18 }} />
      </View>
    </Card>
  );
}

function SlamField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (s: string) => void; placeholder: string }) {
  return (
    <View style={styles.field}>
      <Text style={text.caption}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        accessibilityLabel={label}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { flexDirection: 'row', gap: 8 },
  field: { flex: 1, gap: 4 },
  input: { height: 44, borderRadius: 12, backgroundColor: colors.surfaceRaised, color: colors.text, fontFamily: fonts.numeric, fontSize: 18, textAlign: 'center' },
  problem: { color: colors.warn, fontSize: 13 },
  content: { padding: 20, paddingTop: 8, gap: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  v: { color: COLOR, fontFamily: fonts.numericBold, fontSize: 26 },
  unit: { color: colors.textMuted, fontSize: 12 },
  chips: { flexDirection: 'row', gap: 8 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  zone: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  zoneRange: { color: colors.textSoft, fontFamily: fonts.numeric, fontSize: 16 },
});
