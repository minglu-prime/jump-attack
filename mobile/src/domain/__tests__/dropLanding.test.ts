/**
 * Drop landing jump: step off a box, land and absorb, then jump as high as possible in one go. Scored by jump height;
 * the contact is long by design, so it is never flagged as a slow rebound. Frames from a real 45 cm clip at 240 fps:
 * touch-down 127, take-off 240, landing 391 = contact 113 / 240 = 471 ms, flight 151 / 240 = 0.629 s,
 * height g·FT²/8 = 48.5 cm, RSImod 0.485 m / 0.471 s = 1.03.
 */
import { captureGuide } from '@/components/capture/guides';

import { analysisKindFor, analysisTrials } from '../analysisTrials';
import { analyseJumps } from '../jumpAnalysis';
import { markedTrial, markProfile } from '../marking';
import { DROP_JUMP, DROP_LANDING_JUMP, getMetric } from '../metrics';

const MARKS = [127, 240, 391];

function measure(marks: (number | null)[]) {
  return markProfile(DROP_LANDING_JUMP)!.measure(marks, 240);
}

describe('drop landing jump', () => {
  it('is a jump test in cm, analysed like a drop jump', () => {
    expect(getMetric('drop_landing_jump')).toBe(DROP_LANDING_JUMP);
    expect(DROP_LANDING_JUMP).toMatchObject({ category: 'jump', unit: 'cm', decimals: 1 });
    expect(analysisKindFor(DROP_LANDING_JUMP)).toBe('drop');
  });

  it('scores the jump height, with contact and RSImod alongside', () => {
    const r = measure(MARKS);
    if (!r.ok) throw new Error(r.message);
    expect(r.value).toBe(48.5);
    expect(r.cells).toEqual([
      { label: '触地', value: '471', unit: 'ms' },
      { label: 'RSImod', value: '1.03', unit: '' },
      { label: '跳高', value: '48.5', unit: 'cm', main: true },
    ]);
    expect(r.detail).toEqual({ contact_frame: 127, contact_ms: 471, rsi_mod: 1.03 });
  });

  it('asks for one continuous jump when the athlete paused after landing', () => {
    const r = measure([0, 250, 400]);
    expect(r).toEqual({ ok: false, message: '触地超过 1 秒：落地缓冲后要连贯起跳，中间别停' });
  });

  it('keeps marking a drop jump the old way, scored by RSI', () => {
    const r = markProfile(DROP_JUMP)!.measure(MARKS, 240);
    expect(r.ok && r.value).toBe(1.03);
  });

  it('saves the touch-down frame and box with the trial', () => {
    const r = measure(MARKS);
    if (!r.ok) throw new Error(r.message);
    expect(markedTrial(r, MARKS, 240, { box: '45' })).toMatchObject({
      value: 48.5,
      takeoff_frame: 240,
      landing_frame: 391,
      detail: { source: 'video', contact_frame: 127, contact_ms: 471, rsi_mod: 1.03, box_cm: 45 },
    });
  });

  it('saves an analysed clip with the height as its value and no slow-rebound flag', () => {
    const a = analyseJumps([{ touchdown: 127, takeoff: 240, landing: 391 }], { kind: 'drop', captureFps: 240, longContact: true });
    expect(a.jumps[0].flags).not.toContain('slow-contact');
    const [t] = analysisTrials(DROP_LANDING_JUMP, a, { captureFps: 240, context: {} });
    expect(t).toMatchObject({ value: 48.5, detail: { contact_ms: 471, auto: true } });
  });

  it('still flags a slow rebound in a drop jump', () => {
    const a = analyseJumps([{ touchdown: 127, takeoff: 240, landing: 391 }], { kind: 'drop', captureFps: 240 });
    expect(a.jumps[0].flags).toContain('slow-contact');
  });

  it('has its own filming guide: land, absorb, then jump', () => {
    const guide = captureGuide('jump', DROP_LANDING_JUMP.code);
    expect(guide).not.toBe(captureGuide('jump', DROP_JUMP.code));
    expect(guide.steps.map((s) => s.text).join()).toContain('缓冲');
    expect(guide.feetOverlay).toBe(true);
  });
});
