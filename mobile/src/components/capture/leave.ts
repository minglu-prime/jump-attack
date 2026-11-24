import { Alert } from 'react-native';

import type { Recorded } from '@/components/PoseCamera';
import { decimal, tr } from '@/i18n';
import { dropTake } from '@/media/takes';

/**
 * Closes a camera screen. A take being filmed, or filmed and not yet used, is only thrown away once confirmed:
 * the close button sits where a hand reaches for it by mistake.
 */
export function leaveCamera(rec: { name: string; take?: Recorded }, leave: () => void) {
  const take = rec.name === 'recorded' ? rec.take : undefined;
  if (!take && rec.name !== 'starting' && rec.name !== 'recording' && rec.name !== 'stopping') return leave();
  Alert.alert(tr('放弃这段录像？'), take ? tr('录好的 {seconds} 秒不会保存。', { seconds: decimal(take.seconds, 1) }) : tr('正在录的这段不会保存。'), [
    { text: tr('继续拍'), style: 'cancel' },
    {
      text: tr('放弃'),
      style: 'destructive',
      onPress: () => {
        if (take) dropTake(take.uri);
        leave();
      },
    },
  ]);
}
