import { markedTrial, markProfile } from '../marking';
import { MED_BALL_SLAM } from '../metrics';
import { parseSlamSetup, slamFromMarks, SLAM_FEW_FRAMES } from '../slam';

const SETUP = { statureCm: 175, ballCm: 30 };

describe('slamFromMarks', () => {
  it('times the ball from head height to the floor: stature minus the ball’s radius over the frames between', () => {
    // 1.75 m − 0.15 m = 1.6 m in 40 frames at 240 fps (1/6 s) = 9.6 m/s.
    const r = slamFromMarks(100, 140, 240, SETUP);
    expect(r).toEqual({ ok: true, value: { seconds: expect.closeTo(1 / 6, 9), dropM: expect.closeTo(1.6, 9), speed: expect.closeTo(9.6, 9), frames: 40 } });
  });

  it('asks for both marks, in order', () => {
    expect(slamFromMarks(null, 140, 240, SETUP)).toEqual({ ok: false, problem: 'missing' });
    expect(slamFromMarks(140, 100, 240, SETUP)).toEqual({ ok: false, problem: 'order' });
    expect(slamFromMarks(140, 140, 240, SETUP)).toEqual({ ok: false, problem: 'order' });
  });

  it('rejects a speed no throw reaches, and a ball slower than a walk', () => {
    // 1.6 m in 1 frame at 30 fps = 48 m/s.
    expect(slamFromMarks(0, 1, 30, SETUP)).toEqual({ ok: false, problem: 'too-fast' });
    // 1.6 m in 2 s.
    expect(slamFromMarks(0, 480, 240, SETUP)).toEqual({ ok: false, problem: 'too-slow' });
  });

  it('flags timings so short that one frame either way moves the speed a lot', () => {
    // The clip this test was built on: 30 fps, ~5 frames from head to floor.
    const few = slamFromMarks(396, 401, 30, SETUP);
    expect(few.ok && few.value.frames).toBe(5);
    expect(5).toBeLessThan(SLAM_FEW_FRAMES);
    const many = slamFromMarks(100, 140, 240, SETUP);
    expect(many.ok && many.value.frames).toBeGreaterThanOrEqual(SLAM_FEW_FRAMES);
  });
});

describe('parseSlamSetup', () => {
  it('reads the stature and ball size passed to the marking screen', () => {
    expect(parseSlamSetup({ stature: '175', ball: '30' })).toEqual(SETUP);
  });

  it('is missing when either is absent or out of range', () => {
    expect(parseSlamSetup({ stature: '175' })).toBeNull();
    expect(parseSlamSetup({ stature: '17', ball: '30' })).toBeNull();
    expect(parseSlamSetup({ stature: '175', ball: '300' })).toBeNull();
  });
});

describe('the slam marking profile', () => {
  it('marks head height and the floor, and stores the setup with the rep', () => {
    const profile = markProfile(MED_BALL_SLAM, { slam: SETUP })!;
    expect(profile.marks).toHaveLength(2);
    const outcome = profile.measure([100, 140], 240);
    if (!outcome.ok) throw new Error(outcome.message);
    expect(outcome.value).toBe(9.6);
    // The ball's mass goes in as the trial's load.
    const t = markedTrial(outcome, [100, 140], 240, { load: '6' });
    expect(t).toEqual({
      value: 9.6,
      flight_ms: expect.closeTo(166.7, 1),
      fps: 240,
      takeoff_frame: 100,
      landing_frame: 140,
      load_kg: 6,
      detail: { source: 'video', stature_cm: 175, ball_cm: 30, drop_m: 1.6 },
    });
  });

  it('says what is missing without the setup', () => {
    const outcome = markProfile(MED_BALL_SLAM, {})!.measure([100, 140], 240);
    expect(outcome.ok).toBe(false);
  });

  it('warns about too few frames next to the result', () => {
    const outcome = markProfile(MED_BALL_SLAM, { slam: SETUP })!.measure([396, 401], 30);
    expect(outcome.ok && outcome.note).toBeTruthy();
    const exact = markProfile(MED_BALL_SLAM, { slam: SETUP })!.measure([100, 140], 240);
    expect(exact.ok && exact.note).toBeFalsy();
  });
});
