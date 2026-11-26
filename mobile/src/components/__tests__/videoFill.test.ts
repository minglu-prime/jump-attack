/**
 * On the web a VideoView is a <video>, which absolute insets alone don't stretch: it keeps the clip's own size and
 * spills out of its box, so a portrait clip shows only its top. Every VideoView takes VIDEO_FILL, which also sets a
 * width and height.
 */
import fs from 'fs';
import path from 'path';

import { VIDEO_FILL } from '../videoFill';

const SRC = path.join(__dirname, '../..');

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'testing' ? [] : files(p);
    return e.name.endsWith('.tsx') ? [p] : [];
  });
}

it('sizes the video to its box, not only pins its edges', () => {
  expect(VIDEO_FILL).toMatchObject({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' });
});

it('gives every VideoView the filling style', () => {
  const wrong: string[] = [];
  for (const file of [...files(path.join(SRC, 'app')), ...files(path.join(SRC, 'components'))]) {
    const rel = path.relative(SRC, file).replace(/\\/g, '/');
    for (const tag of fs.readFileSync(file, 'utf8').match(/<VideoView\b[^>]*>/g) ?? []) if (!tag.includes('style={VIDEO_FILL}')) wrong.push(`${rel}: ${tag}`);
  }
  // Fix: import { VIDEO_FILL } from '@/components/videoFill' and pass style={VIDEO_FILL} to each VideoView listed.
  expect(wrong).toEqual([]);
});
