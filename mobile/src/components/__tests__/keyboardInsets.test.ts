/**
 * A screen with a text field scrolls the field clear of the keyboard, and a tap on a button while the keyboard is up
 * presses the button (instead of only closing the keyboard). Every ScrollView on such a screen gets both props;
 * a screen built on KeyboardAvoidingView handles the insets that way instead.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '../..');
// Screens whose fields come from a child (CaptureStart shows the standing-reach field passed in as its gate).
const HOSTS_FIELDS = ['components/capture/CaptureStart.tsx'];

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'testing' ? [] : files(p);
    return e.name.endsWith('.tsx') ? [p] : [];
  });
}

it('gives every scrolling screen with a text field keyboard insets and taps that go through', () => {
  const missing: string[] = [];
  for (const file of [...files(path.join(SRC, 'app')), ...files(path.join(SRC, 'components'))]) {
    const rel = path.relative(SRC, file).replace(/\\/g, '/');
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes('<TextInput') && !HOSTS_FIELDS.includes(rel)) continue;
    for (const tag of text.match(/<ScrollView\b[^>]*>/g) ?? []) {
      const insets = tag.includes('automaticallyAdjustKeyboardInsets') || text.includes('<KeyboardAvoidingView');
      if (!insets || !tag.includes('keyboardShouldPersistTaps="handled"')) missing.push(`${rel}: ${tag}`);
    }
  }
  // Fix: add keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets to each ScrollView listed.
  expect(missing).toEqual([]);
});
