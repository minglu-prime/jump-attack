import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const LOCK = 'jump-attack-db';

/**
 * The web database keeps its files open exclusively (OPFS access handles), so only one tab can have it: a second
 * tab fails to open it. Resolves once this page holds the lock, which it keeps until the page goes; `onWait` runs
 * first when another tab has it.
 */
export function holdDatabase(locks: LockManager | undefined, onWait: () => void): Promise<void> {
  if (!locks) return Promise.resolve();
  return new Promise((granted) => {
    const keep = () => {
      granted();
      return new Promise<never>(() => {});
    };
    locks
      .request(LOCK, { ifAvailable: true }, (lock) => {
        if (lock) return keep();
        onWait();
        locks.request(LOCK, keep).catch(openAnyway(granted));
        return undefined;
      })
      .catch(openAnyway(granted));
  });
}

// A lock manager that fails says nothing about the database: open it anyway, and say why there was no wait.
const openAnyway = (granted: () => void) => (e: unknown) => {
  console.error('Could not take the database lock, opening without it:', e);
  granted();
};

// Runs in a throwaway worker, the only place a database file can be opened the way the database opens it.
const FREE_LEFTOVERS = `onmessage = async () => {
  let freed = 0;
  try {
    let dir;
    try {
      dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('expo-sqlite');
    } catch (e) {
      if (e.name !== 'NotFoundError') throw e;
    }
    if (dir) for await (const [, f] of dir) {
      if (f.kind !== 'file') continue;
      const h = await f.createSyncAccessHandle();
      try {
        const head = new Uint8Array(512);
        h.read(head, { at: 0 });
        const end = head.indexOf(0);
        const path = new TextDecoder().decode(head.subarray(0, end < 0 ? head.length : end));
        if (path && !path.startsWith('/')) {
          h.truncate(0);
          h.flush();
          freed++;
        }
      } finally {
        h.close();
      }
    }
    postMessage(freed);
  } catch (e) {
    postMessage(String(e));
  }
};`;

/**
 * The browser's database has six file slots. Before expo-sqlite 58.0.18, two opens at start-up could set it up twice
 * and leave slots tied to unnamed temporary databases that nothing opens again; with the slots full, SQLite can't
 * make the journal a write needs, so nothing saves. A slot's header holds its file's path: a named file's starts
 * with '/', an unnamed one's doesn't. Emptying those slots makes expo-sqlite take them as free again. Runs while
 * this page holds the lock and before anything here opens the database, so no one has the files open.
 */
function freeLeftoverSlots(): Promise<void> {
  return new Promise((done) => {
    const url = URL.createObjectURL(new Blob([FREE_LEFTOVERS], { type: 'text/javascript' }));
    const worker = new Worker(url);
    const finish = (result: number | string) => {
      worker.terminate();
      URL.revokeObjectURL(url);
      if (typeof result === 'string') console.error('Could not check the database file slots:', result);
      else if (result > 0) console.info(`Freed ${result} database file slot(s) left by unnamed temporary databases.`);
      done();
    };
    worker.onmessage = (e: MessageEvent<number | string>) => finish(e.data);
    worker.onerror = (e) => finish(e.message);
    worker.postMessage(null);
  });
}

/**
 * Whether this page may open the database yet: 'other' while another tab has it. On the web nothing may touch
 * expo-sqlite before 'mine', so the start-up reads that need it go in `whenMine`, awaited just before. On the phone
 * the app starts up as it always did.
 */
export function useDatabaseTurn(whenMine: () => Promise<void>): 'mine' | 'asking' | 'other' {
  const [turn, setTurn] = useState<'mine' | 'asking' | 'other'>(Platform.OS === 'web' ? 'asking' : 'mine');
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    holdDatabase(globalThis.navigator?.locks, () => setTurn('other'))
      .then(freeLeftoverSlots)
      .then(whenMine)
      .then(() => setTurn('mine'));
    // Once per page: the lock it takes is held until the page goes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return turn;
}
