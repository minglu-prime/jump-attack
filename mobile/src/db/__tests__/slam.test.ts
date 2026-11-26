import { migrate } from '../migrations';
import { addTrial, createAthlete, ensureSession } from '../repo';
import { lastSlamSetup } from '../slam';
import { openMemoryDb } from '../testing/memoryDb';

async function setup() {
  const db = openMemoryDb();
  await migrate(db);
  return db;
}

it('has nothing to suggest before the first slam', async () => {
  const db = await setup();
  expect(await lastSlamSetup(db, 1)).toEqual({ statureCm: null, ballCm: null, ballKg: null });
});

it('suggests the stature, ball size and ball mass of the athlete’s latest slam', async () => {
  const db = await setup();
  await ensureSession(db, 'a', 1, 'med_ball_slam');
  await addTrial(db, { session_id: 'a', value: 9.1, load_kg: 6, detail: { source: 'video', stature_cm: 175, ball_cm: 28, drop_m: 1.61 } });
  await addTrial(db, { session_id: 'a', value: 9.6, load_kg: 8, detail: { source: 'video', stature_cm: 176, ball_cm: 30, drop_m: 1.61 } });
  // Another athlete's slam, and another test, change nothing.
  const other = await createAthlete(db, 'B');
  await ensureSession(db, 'b', other, 'med_ball_slam');
  await addTrial(db, { session_id: 'b', value: 7, load_kg: 4, detail: { source: 'video', stature_cm: 160, ball_cm: 24 } });
  await ensureSession(db, 'c', 1, 'cmj');
  await addTrial(db, { session_id: 'c', value: 40, load_kg: 20 });
  expect(await lastSlamSetup(db, 1)).toEqual({ statureCm: 176, ballCm: 30, ballKg: 8 });
});

it('leaves out what a slam saved without', async () => {
  const db = await setup();
  await ensureSession(db, 'a', 1, 'med_ball_slam');
  await addTrial(db, { session_id: 'a', value: 9.1, detail: { source: 'video', stature_cm: 175, ball_cm: 28 } });
  expect(await lastSlamSetup(db, 1)).toEqual({ statureCm: 175, ballCm: 28, ballKg: null });
});
