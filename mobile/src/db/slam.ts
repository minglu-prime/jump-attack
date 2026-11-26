import type { SQLiteDatabase } from 'expo-sqlite';

import { MED_BALL_SLAM } from '@/domain/metrics';

export type SlamDefaults = { statureCm: number | null; ballCm: number | null; ballKg: number | null };

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** What the athlete's latest slam was measured with, to start the next one from. */
export async function lastSlamSetup(db: SQLiteDatabase, athleteId: number): Promise<SlamDefaults> {
  const row = await db.getFirstAsync<{ load_kg: number | null; detail: string | null }>(
    `SELECT t.load_kg, t.detail FROM trial t JOIN test_session s ON s.id = t.session_id
     WHERE s.athlete_id = ? AND s.metric_code = ? ORDER BY t.id DESC LIMIT 1`,
    athleteId,
    MED_BALL_SLAM.code,
  );
  const detail = row?.detail ? (JSON.parse(row.detail) as Record<string, unknown>) : {};
  return { statureCm: num(detail.stature_cm), ballCm: num(detail.ball_cm), ballKg: row?.load_kg ?? null };
}
