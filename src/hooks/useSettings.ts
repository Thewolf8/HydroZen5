import { useState, useEffect, useCallback } from 'react';
import type { AppSettings, Language, Theme, Unit } from '@/types/water';

const SETTINGS_KEY = 'aquaflow-settings';

const defaultReminder = {
  enabled: false,
  times: [],
  notificationIds: {},
  smartMode: true,
  wakeHour: 7,
  sleepHour: 22,
  intervalMinutes: 120,
  useInterval: true,
};

export const defaultSettings: AppSettings = {
  unit: 'ml',
  dailyGoalMl: 2000,
  language: 'system',
  theme: 'system',
  animationsEnabled: true,
  reminder: defaultReminder,
  notifications: {
    goalAchieved: true,
    streakReminder: true,
    morningMotivation: false,
    morningHour: 8,
  },
  showHydrationFactor: true,
  useHydrationFactors: true,
  showMotivation: true,
  customContainers: [],
};

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const p = JSON.parse(stored);
      return {
        ...defaultSettings,
        ...p,
        reminder: { ...defaultSettings.reminder, ...(p.reminder ?? {}) },
        notifications: { ...defaultSettings.notifications, ...(p.notifications ?? {}) },
      };
    }
  } catch {}
  return { ...defaultSettings };
}

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', dark);
}

function applyAnimations(enabled: boolean) {
  document.documentElement.classList.toggle('no-animations', !enabled);
}

// ── Module-level shared store ─────────────────────────────────────────────────
let _s: AppSettings = loadSettings();
const _subs = new Set<(s: AppSettings) => void>();

function dispatch(next: AppSettings) {
  _s = next;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch {}
  applyTheme(next.theme);
  applyAnimations(next.animationsEnabled);
  _subs.forEach(fn => fn({ ...next }));
}

export function getSettings(): AppSettings { return { ..._s }; }

export function useSettings() {
  const [settings, setLocal] = useState<AppSettings>(() => ({ ..._s }));

  useEffect(() => {
    _subs.add(setLocal);
    applyTheme(_s.theme);
    applyAnimations(_s.animationsEnabled);
    return () => { _subs.delete(setLocal); };
  }, []);

  useEffect(() => {
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.theme]);

  const setLanguage    = useCallback((language: Language)  => dispatch({ ..._s, language }), []);
  const setTheme       = useCallback((theme: Theme)        => dispatch({ ..._s, theme }), []);
  const setUnit        = useCallback((unit: Unit)          => dispatch({ ..._s, unit }), []);
  const setDailyGoal   = useCallback((dailyGoalMl: number) => dispatch({ ..._s, dailyGoalMl }), []);
  const setAnimations  = useCallback((v: boolean)          => dispatch({ ..._s, animationsEnabled: v }), []);
  const setShowMotivation = useCallback((v: boolean)       => dispatch({ ..._s, showMotivation: v }), []);
  const setUseHydrationFactors = useCallback((v: boolean)  => dispatch({ ..._s, useHydrationFactors: v }), []);
  const setShowHydrationFactor = useCallback((v: boolean)  => dispatch({ ..._s, showHydrationFactor: v }), []);

  const setReminder = useCallback(
    (patch: Partial<AppSettings['reminder']>) =>
      dispatch({ ..._s, reminder: { ..._s.reminder, ...patch } }), []);

  const setNotification = useCallback(
    (key: keyof AppSettings['notifications'], value: boolean | number) =>
      dispatch({ ..._s, notifications: { ..._s.notifications, [key]: value } }), []);

  return {
    settings,
    setLanguage, setTheme, setUnit, setDailyGoal, setAnimations,
    setShowMotivation, setUseHydrationFactors, setShowHydrationFactor,
    setReminder, setNotification,
    updateSettings: (patch: Partial<AppSettings>) => dispatch({ ..._s, ...patch }),
  };
}
