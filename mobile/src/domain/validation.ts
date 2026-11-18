import type { DunkMetricKey } from './dunk';

/**
 * How a measurement's numbers have been checked, which decides how far the dunk diagnosis leans on them (CLAUDE.md:
 * 测不准的指标不进诊断).
 * - `reference`: read straight off a reference, nothing to validate: a mark on the wall, a scale.
 * - `real`: checked on the athlete's own phone against a reference reading (the wall, another app such as My Jump or
 *   Arcus), with the comparison written up in `report`.
 * - `synthetic`: only checked on synthetic video and unit tests. Those catch regressions but say nothing about how
 *   far off a real recording is: the jump detection passed 43 of 48 synthetic clips and still missed real jumps filmed
 *   from above the ankles (PR #21 → #46 → #50 → #54).
 */
export type Evidence = 'reference' | 'real' | 'synthetic';

export type EvidenceEntry = {
  evidence: Evidence;
  /** What was checked, and with which tool, in a sentence. */
  basis: string;
  /** For `real`: the write-up under docs/validation/, relative to the repository root. */
  report?: string;
};

/** What the touch height behind the gap was measured with. */
export type TouchKey = 'touch_wall' | 'touch_video';

/**
 * The evidence behind every number the diagnosis reads. Moving an entry to `real` takes a real-device check
 * (the 真机验证 skill) and its report; the registry test fails if the report is missing.
 */
export const EVIDENCE: Record<DunkMetricKey | TouchKey, EvidenceEntry> = {
  touch_wall: { evidence: 'reference', basis: 'Read off a tape or marks on the wall: the reference itself.' },
  touch_video: { evidence: 'synthetic', basis: 'Standing reach + flight-time jump height from video; flight time checked on synthetic clips only (tools/jump-detect-validation).' },
  squat_ratio: { evidence: 'synthetic', basis: '1RM from bar speed tracked on video, checked on synthetic clips only (tools/vbt-validation); the Metric exports on hand cannot serve as a reference.' },
  rsi: { evidence: 'synthetic', basis: 'Drop-jump contact and flight from video frames, checked on synthetic clips only (tools/jump-analysis-validation).' },
  contact: { evidence: 'synthetic', basis: 'Drop-jump contact time from video frames, checked on synthetic clips only (tools/jump-analysis-validation).' },
  eur: { evidence: 'synthetic', basis: 'CMJ ÷ SJ, both flight-time jump heights from video, checked on synthetic clips only.' },
  fv: { evidence: 'synthetic', basis: 'Force-velocity profile from loaded jump heights on video, checked on synthetic clips only.' },
  approach_gain: { evidence: 'synthetic', basis: 'Approach touch minus the video standing estimate; the standing side is checked on synthetic clips only.' },
};

/** Whether a number may decide something without a caveat. */
export function trusted(entry: EvidenceEntry): boolean {
  return entry.evidence !== 'synthetic';
}
