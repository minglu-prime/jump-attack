import { existsSync } from 'fs';
import { join } from 'path';

import { EVIDENCE, trusted } from '../validation';

const REPO = join(__dirname, '../../../..');

describe('evidence registry', () => {
  it('covers every number the diagnosis reads', () => {
    expect(Object.keys(EVIDENCE).sort()).toEqual(['approach_gain', 'contact', 'eur', 'fv', 'rsi', 'squat_ratio', 'touch_video', 'touch_wall']);
  });

  it('backs every real-device claim with a report in the repository', () => {
    for (const [key, entry] of Object.entries(EVIDENCE)) {
      if (entry.evidence !== 'real') continue;
      expect({ key, report: entry.report }).toEqual({ key, report: expect.stringMatching(/^docs\/validation\/.+\.md$/) });
      expect({ key, exists: existsSync(join(REPO, entry.report!)) }).toEqual({ key, exists: true });
    }
  });

  it('trusts a reference reading and a real-device check, not synthetic video alone', () => {
    expect(trusted({ evidence: 'reference', basis: '' })).toBe(true);
    expect(trusted({ evidence: 'real', basis: '', report: 'docs/validation/x.md' })).toBe(true);
    expect(trusted({ evidence: 'synthetic', basis: '' })).toBe(false);
  });
});
