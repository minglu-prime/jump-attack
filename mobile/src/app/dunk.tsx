import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { DunkPanel } from '@/components/DunkPanel';
import { Button, Card, LoadFailed, Loading } from '@/components/ui';
import { loadDiagnosis } from '@/db/dunk';
import type { DunkDiagnosis } from '@/domain/dunk';
import { tr } from '@/i18n';
import { useAthlete } from '@/state/athlete';
import { loadMassGain } from '@/state/bodyMass';
import { colors, text } from '@/theme';

/** How far the athlete is from dunking and which part of their training holds them back. */
export default function Dunk() {
  const db = useSQLiteContext();
  const { current } = useAthlete();
  const [d, setD] = useState<DunkDiagnosis | null>(null);
  const [mass, setMass] = useState<{ text: string; estimated: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!current) return;
    let alive = true;
    Promise.all([loadDiagnosis(db, current), loadMassGain(db, current)]).then(
      ([diagnosis, gain]) => {
        if (!alive) return;
        setD(diagnosis);
        setMass(gain);
        setError(null);
      },
      (e) => alive && setError(String(e)),
    );
    return () => {
      alive = false;
    };
  }, [db, current]);
  useFocusEffect(load);

  if (error) {
    return (
      <View style={styles.screen}>
        <LoadFailed title={tr('扣篮诊断没加载出来')} error={error} onRetry={load} />
      </View>
    );
  }
  if (!d) {
    return (
      <View style={styles.screen}>
        <Loading />
      </View>
    );
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <DunkPanel diagnosis={d} standingReach={current?.standing_reach_cm ?? null} />
      {mass && (
        <Card style={{ gap: 4 }}>
          <Text style={text.section}>{tr('体重')}</Text>
          <Text style={mass.estimated ? text.body : text.muted}>{mass.text}</Text>
          <Text style={text.caption}>{tr('只是估算，不改诊断。')}</Text>
        </Card>
      )}
      <Button label={tr('改扣篮线')} variant="secondary" onPress={() => router.navigate('/me')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 8, gap: 12, paddingBottom: 40 },
});
