// The app's language: the phone's on first launch, then whatever the user picked under 我的, kept across launches.
import { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import { getLang, setLang, tr } from '@/i18n';

import { initLanguage, LangProvider, useLang } from '../lang';

const mockKv = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemSync: (k: string) => mockKv.get(k) ?? null,
    getItem: async (k: string) => mockKv.get(k) ?? null,
    setItemSync: (k: string, v: string) => void mockKv.set(k, v),
    removeItemSync: (k: string) => mockKv.delete(k),
  },
}));
let mockLocales = ['de-DE', 'en-US'];
jest.mock('expo-localization', () => ({ getLocales: () => mockLocales.map((languageTag) => ({ languageTag })) }));

let probe!: ReturnType<typeof useLang>;
// A language change remounts everything under the provider, so no screen keeps text in the old language.
let mounts = 0;
function Probe() {
  const lang = useLang();
  useEffect(() => {
    probe = lang;
  });
  useEffect(() => {
    mounts++;
  }, []);
  return <Text>{tr('我的')}</Text>;
}

beforeEach(() => {
  mockKv.clear();
  mockLocales = ['de-DE', 'en-US'];
  mounts = 0;
});
afterEach(() => setLang('zh'));

async function render(): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(
      <LangProvider>
        <Probe />
      </LangProvider>,
    );
  });
  return r;
}

it('starts in the phone’s language until the user picks one', () => {
  initLanguage();
  expect(getLang()).toBe('de');
  mockLocales = ['fr-FR'];
  initLanguage();
  expect(getLang()).toBe('en');
  mockLocales = ['zh-Hans-CN'];
  initLanguage();
  expect(getLang()).toBe('zh');
});

it('switches the whole app to a picked language and remembers it over the phone’s', async () => {
  initLanguage();
  const r = await render();
  expect(r.root.findByType(Text).props.children).toBe('Ich');
  expect(probe.choice).toBe('system');

  await act(async () => probe.choose('en'));
  expect(r.root.findByType(Text).props.children).toBe('Me');
  expect(mounts).toBe(2);
  expect(probe).toMatchObject({ lang: 'en', choice: 'en' });

  // Next launch: the phone is still German, the app stays English.
  initLanguage();
  expect(getLang()).toBe('en');
});

it('goes back to following the phone', async () => {
  mockKv.set('language', 'zh');
  initLanguage();
  const r = await render();
  expect(probe.choice).toBe('zh');
  await act(async () => probe.choose('system'));
  expect(r.root.findByType(Text).props.children).toBe('Ich');
  expect(mockKv.has('language')).toBe(false);
});

it('still starts when the stored choice can’t be read', () => {
  mockKv.set('language', 'fr');
  initLanguage();
  expect(getLang()).toBe('de');
});

it('can start in the phone’s language without reading the stored choice, for a web page still waiting for the database', () => {
  mockKv.set('language', 'en');
  const kv = jest.requireMock('expo-sqlite/kv-store').default;
  const read = jest.spyOn(kv, 'getItemSync');
  initLanguage(false);
  expect(getLang()).toBe('de');
  expect(read).not.toHaveBeenCalled();
  read.mockRestore();
  mockKv.delete('language');
});

it('reads the picked language without a synchronous call, for the web page once it has the database', async () => {
  mockKv.set('language', 'en');
  const { loadLanguage } = jest.requireActual('../lang') as typeof import('../lang');
  const kv = jest.requireMock('expo-sqlite/kv-store').default;
  const sync = jest.spyOn(kv, 'getItemSync');
  setLang('zh');
  await loadLanguage();
  expect(getLang()).toBe('en');
  expect(sync).not.toHaveBeenCalled();
  sync.mockRestore();
  mockKv.delete('language');
});
