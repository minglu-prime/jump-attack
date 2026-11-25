import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';

/**
 * Android's back button (or back gesture) runs `onBack` instead of leaving the screen. For the screens that turn off
 * the iOS swipe-back because leaving loses something: they ask first either way.
 */
export function useBackButton(onBack: () => void) {
  const latest = useRef(onBack);
  useEffect(() => {
    latest.current = onBack;
  });
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      latest.current();
      return true;
    });
    return () => sub.remove();
  }, []);
}
