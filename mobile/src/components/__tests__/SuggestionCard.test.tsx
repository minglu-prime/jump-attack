import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { SuggestionCard } from '../blocks';

it('takes no second answer while the first is being saved', async () => {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(<SuggestionCard suggestion={{ kind: 'advance', key: 'k', type: 'strength', week: 3, phase: '强化期', reason: '进步快' }} busy onAccept={jest.fn()} onDecline={jest.fn()} />);
  });
  const decline = r.root.findAll((n) => typeof n.props.onPress === 'function' && n.findAllByType(Text).some((t) => t.props.children === '按原计划'))[0];
  expect(decline.props.disabled).toBe(true);
});
