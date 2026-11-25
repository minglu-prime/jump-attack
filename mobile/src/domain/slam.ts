import { intervalFromMarks } from './interval';

/**
 * Med-ball slam speed from two marked video frames: the ball's centre passing the top of the head, and the ball
 * touching the floor. The ball's centre falls from head height to its own radius above the floor, so the distance is
 * the athlete's stature minus the ball's radius, and the speed is that distance over the time between the frames:
 * the mean speed of the slam's fast half.
 */
export type SlamSetup = { statureCm: number; ballCm: number };

export type SlamProblem = 'missing' | 'order' | 'too-fast' | 'too-slow';

/** Faster than any thrown ball's mean over the last metre and a half; slower than a walk is a mis-marked frame. */
const MAX_SPEED = 25;
const MIN_SPEED = 2;

/** Below this many frames between the marks, one frame either way changes the speed by more than 10 %. */
export const SLAM_FEW_FRAMES = 10;

export const STATURE_RANGE_CM: [number, number] = [120, 230];
export const BALL_RANGE_CM: [number, number] = [15, 45];

export function slamFromMarks(
  headFrame: number | null,
  floorFrame: number | null,
  fps: number,
  setup: SlamSetup,
): { ok: true; value: { seconds: number; dropM: number; speed: number; frames: number } } | { ok: false; problem: SlamProblem } {
  const dropM = (setup.statureCm - setup.ballCm / 2) / 100;
  const r = intervalFromMarks(headFrame, floorFrame, fps, { minS: dropM / MAX_SPEED, maxS: dropM / MIN_SPEED });
  if (!r.ok) return { ok: false, problem: r.problem === 'too-short' ? 'too-fast' : r.problem === 'too-long' ? 'too-slow' : r.problem };
  return { ok: true, value: { seconds: r.seconds, dropM, speed: dropM / r.seconds, frames: floorFrame! - headFrame! } };
}

const inRange = (v: number, [lo, hi]: [number, number]) => Number.isFinite(v) && v >= lo && v <= hi;

/** The stature and ball size the slam screen passes to marking, or null when either is missing or implausible. */
export function parseSlamSetup(params: { stature?: string; ball?: string }): SlamSetup | null {
  const statureCm = Number(params.stature);
  const ballCm = Number(params.ball);
  if (params.stature == null || params.ball == null || !inRange(statureCm, STATURE_RANGE_CM) || !inRange(ballCm, BALL_RANGE_CM)) return null;
  return { statureCm, ballCm };
}
