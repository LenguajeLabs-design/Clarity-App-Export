import { useEffect } from 'react';
import { useAppData } from './useAppData';

/**
 * ThemeSync — reads settings.theme and applies/removes the `dark` class on
 * <html>. Also watches the system prefers-color-scheme when theme is 'auto'.
 * Mount this once inside AppDataProvider.
 */
export function ThemeSync() {
  const { settings } = useAppData();
  const theme = settings.theme ?? 'auto';

  useEffect(() => {
    const root = document.documentElement;

    function apply(isDark: boolean) {
      root.classList.toggle('dark', isDark);
    }

    if (theme === 'dark') {
      apply(true);
      return;
    }
    if (theme === 'light') {
      apply(false);
      return;
    }

    // auto — match system preference and watch for changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return null;
}
