import type { ReactNode } from 'react';

import type { CaptureGuide } from './guides';

export type CaptureProps = {
  title: string;
  subtitle: string;
  guide: CaptureGuide;
  /** A line under the steps, e.g. how to read a slow-motion export. */
  note?: string;
  onClose: () => void;
  onImport: () => void;
  /** Present where the app can film the test itself (not on the web). */
  onFilm?: () => void;
  /** Present when the result can also be typed in. */
  onManual?: () => void;
  /** Something the test needs first (e.g. standing reach), shown in place of filming and importing until it is done. */
  gate?: ReactNode;
};
