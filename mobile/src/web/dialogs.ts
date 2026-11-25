import type { AlertButton } from 'react-native';

import { tr } from '@/i18n';

export type BrowserDialogs = {
  alert: (message: string) => void;
  confirm: (message: string) => boolean;
  prompt: (message: string) => string | null;
};

function joined(title: string, message?: string): string {
  return message ? `${title}\n\n${message}` : title;
}

/**
 * Alert.alert on top of the browser's own dialogs. A confirm box per action, in order: OK runs that action,
 * Cancel moves on to the next one, and declining them all is the cancel button. With one action that is a
 * single confirm; with two (keep this device's data / keep the cloud's) neither one is out of reach.
 */
export function showAlert(title: string, message: string | undefined, buttons: AlertButton[] | undefined, browser: BrowserDialogs): void {
  if (!buttons || buttons.length <= 1) {
    browser.alert(joined(title, message));
    buttons?.[0]?.onPress?.();
    return;
  }
  const cancel = buttons.find((b) => b.style === 'cancel') ?? buttons[0];
  const p = message ? `${message}\n\n` : '';
  const chosen = buttons.filter((b) => b !== cancel).find((b) => browser.confirm(joined(title, tr('{p}（确定 = {text}）', { p, text: b.text })))) ?? cancel;
  chosen.onPress?.();
}

type AlertLike = { alert: (...args: never[]) => void; prompt?: (...args: never[]) => void };

/** react-native-web ships Alert as a no-op; route it to the browser instead. */
export function installWebDialogs(target: AlertLike, browser: BrowserDialogs): void {
  const t = target as { alert: unknown; prompt?: unknown };
  t.alert = (title: string, message?: string, buttons?: AlertButton[]) => showAlert(title, message, buttons, browser);
  t.prompt = (title: string, message: string | undefined, callback?: (value: string) => void) => {
    const value = browser.prompt(joined(title, message));
    if (value != null) callback?.(value);
  };
}
