// The 0–10 scale sits in a card on the home screen: eleven boxes must share the card's width on any phone, not run
// past its edge (11 × 28 px is wider than a 375 pt phone's card).
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { ScoreScale } from '../ScoreScale';

it('shares the row between its eleven boxes instead of giving each a fixed width', async () => {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(<ScoreScale label="今早膝盖几分" value={3} onPick={() => {}} hint="0 不疼，10 最疼" />);
  });
  const boxes = r.root.findAll((n) => typeof n.props.onPress === 'function' && n.props.accessibilityRole === 'button' && typeof n.type !== 'string');
  const styleOf = (n: (typeof boxes)[number]) => [n.props.style].flat(Infinity).filter(Boolean).reduce((a, s) => ({ ...a, ...s }), {});
  const cells = boxes.filter((b) => styleOf(b).borderWidth === 1);
  expect(cells).toHaveLength(11);
  for (const c of cells) {
    expect(styleOf(c).width).toBeUndefined();
    expect(styleOf(c).flex).toBe(1);
  }
});
