// The web database can be open in one tab at a time, so a second tab waits for its turn instead of failing to open.
import { act, create } from 'react-test-renderer';

import { holdDatabase, useDatabaseTurn } from '../databaseTurn';

type Granted = (lock: { name: string } | null) => unknown;

function locks(free: boolean) {
  const queued: Granted[] = [];
  const request = jest.fn((_name: string, a: { ifAvailable?: boolean } | Granted, b?: Granted) => {
    const [options, granted] = b ? [a as { ifAvailable?: boolean }, b] : [{}, a as Granted];
    if (options.ifAvailable) return Promise.resolve(granted(free ? { name: _name } : null));
    queued.push(granted);
    return new Promise(() => {});
  });
  return { manager: { request } as unknown as LockManager, request, queued };
}

const settled = async (p: Promise<unknown>) => {
  let done = false;
  p.then(() => (done = true));
  await new Promise((r) => setTimeout(r, 0));
  return done;
};

it('opens straight away when no other tab has the database', async () => {
  const { manager } = locks(true);
  const onWait = jest.fn();
  expect(await settled(holdDatabase(manager, onWait))).toBe(true);
  expect(onWait).not.toHaveBeenCalled();
});

it('waits while another tab has it, and opens by itself once that tab lets go', async () => {
  const { manager, queued } = locks(false);
  const onWait = jest.fn();
  const turn = holdDatabase(manager, onWait);
  expect(await settled(turn)).toBe(false);
  expect(onWait).toHaveBeenCalledTimes(1);

  queued[0]({ name: 'jump-attack-db' });
  expect(await settled(turn)).toBe(true);
});

it('keeps the database for as long as the page is open', async () => {
  const { manager, request } = locks(true);
  await holdDatabase(manager, jest.fn());
  const granted = request.mock.calls[0][2] as Granted;
  // What the lock callback returns is how long the lock is held: a promise that never settles holds it until the page goes.
  expect(await settled(Promise.resolve(granted({ name: 'jump-attack-db' })))).toBe(false);
});

it('opens without waiting in a browser with no lock manager', async () => {
  expect(await settled(holdDatabase(undefined, jest.fn()))).toBe(true);
});


describe('useDatabaseTurn', () => {
  it('on the phone, lets the database open at once and leaves the start-up to the app', () => {
    const whenMine = jest.fn();
    let turn = '';
    function Probe() {
      turn = useDatabaseTurn(whenMine);
      return null;
    }
    act(() => {
      create(<Probe />);
    });
    expect(turn).toBe('mine');
    expect(whenMine).not.toHaveBeenCalled();
  });
});
