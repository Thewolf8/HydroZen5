import { useState, useCallback, useMemo } from 'react';
import { format, parseISO, subDays, isToday, isYesterday, startOfDay } from 'date-fns';
import type { DrinkEntry, DailyLog, HydrationStats, Streak, DrinkTypeId } from '@/types/water';
import { DRINK_TYPES } from '@/types/water';
import { useProfile } from '@/context/ProfileContext';
import { getSettings } from '@/hooks/useSettings';

function storageKey(profileId: string) {
  return `aquaflow-logs-${profileId}`;
}

function loadLogs(profileId: string): DailyLog[] {
  try {
    const raw = localStorage.getItem(storageKey(profileId));
    if (raw) return JSON.parse(raw) as DailyLog[];
  } catch {}
  return [];
}

function saveLogs(profileId: string, logs: DailyLog[]) {
  try {
    localStorage.setItem(storageKey(profileId), JSON.stringify(logs));
  } catch {}
}

function todayStr() { return format(new Date(), 'yyyy-MM-dd'); }

function effectiveMl(amountMl: number, drinkType: DrinkTypeId, useFactors: boolean): number {
  if (!useFactors) return amountMl;
  const dt = DRINK_TYPES.find(d => d.id === drinkType);
  return Math.round(amountMl * (dt?.hydrationFactor ?? 1));
}

function recalcDay(log: DailyLog, goalMl: number): DailyLog {
  const totalMl = log.entries.reduce((s, e) => s + e.amountMl, 0);
  const totalEffectiveMl = log.entries.reduce((s, e) => s + e.effectiveMl, 0);
  return { ...log, totalMl, totalEffectiveMl, goalMet: totalEffectiveMl >= goalMl };
}

function buildStreak(logs: DailyLog[]): Streak {
  const metDates = logs.filter(l => l.goalMet).map(l => l.date).sort();
  if (metDates.length === 0) return { current: 0, best: 0, metDates: [] };

  // Calculate current streak
  let current = 0;
  const today = todayStr();
  const yest  = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const metSet = new Set(metDates);
  let cursor = metSet.has(today) ? today : (metSet.has(yest) ? yest : null);
  while (cursor && metSet.has(cursor)) {
    current++;
    cursor = format(subDays(parseISO(cursor), 1), 'yyyy-MM-dd');
  }

  // Best streak
  let best = 1, run = 1;
  for (let i = 1; i < metDates.length; i++) {
    const prev = parseISO(metDates[i - 1]);
    const curr = parseISO(metDates[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    run = diff === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }

  return { current, best, metDates };
}

export function useWaterLogs() {
  const { activeProfile } = useProfile();
  const profileId = activeProfile.id;

  const [logs, setLogsState] = useState<DailyLog[]>(() => loadLogs(profileId));

  const setLogs = useCallback((next: DailyLog[]) => {
    setLogsState(next);
    saveLogs(profileId, next);
  }, [profileId]);

  // ── Re-load when profile switches ─────────────────────────────────────────
  const [lastProfileId, setLastProfileId] = useState(profileId);
  if (lastProfileId !== profileId) {
    setLastProfileId(profileId);
    setLogsState(loadLogs(profileId));
  }

  // ── Add a drink ────────────────────────────────────────────────────────────
  const addDrink = useCallback((
    amountMl: number,
    drinkType: DrinkTypeId,
    note?: string,
    timestampISO?: string,
  ) => {
    const settings = getSettings();
    const goalMl = activeProfile.goalMlOverride ?? settings.dailyGoalMl;
    const useFactors = settings.useHydrationFactors;

    const now = timestampISO ?? new Date().toISOString();
    const date = format(parseISO(now), 'yyyy-MM-dd');
    const entry: DrinkEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      amountMl,
      drinkType,
      timestamp: now,
      note,
      effectiveMl: effectiveMl(amountMl, drinkType, useFactors),
    };

    setLogs(prev => {
      const idx = prev.findIndex(l => l.date === date);
      let next: DailyLog[];
      if (idx >= 0) {
        const updated = { ...prev[idx], entries: [...prev[idx].entries, entry] };
        next = [...prev];
        next[idx] = recalcDay(updated, goalMl);
      } else {
        const newLog: DailyLog = { date, entries: [entry], totalMl: 0, totalEffectiveMl: 0, goalMet: false };
        next = [...prev, recalcDay(newLog, goalMl)];
      }
      return next.sort((a, b) => b.date.localeCompare(a.date));
    });

    return entry;
  }, [activeProfile, setLogs]);

  // ── Delete an entry ────────────────────────────────────────────────────────
  const deleteEntry = useCallback((entryId: string) => {
    const settings = getSettings();
    const goalMl = activeProfile.goalMlOverride ?? settings.dailyGoalMl;

    setLogs(prev => prev.map(log => {
      if (!log.entries.find(e => e.id === entryId)) return log;
      const updated = { ...log, entries: log.entries.filter(e => e.id !== entryId) };
      return recalcDay(updated, goalMl);
    }).filter(log => log.entries.length > 0));
  }, [activeProfile, setLogs]);

  // ── Edit an entry ──────────────────────────────────────────────────────────
  const editEntry = useCallback((entryId: string, patch: Partial<Pick<DrinkEntry, 'amountMl' | 'drinkType' | 'note'>>) => {
    const settings = getSettings();
    const goalMl = activeProfile.goalMlOverride ?? settings.dailyGoalMl;
    const useFactors = settings.useHydrationFactors;

    setLogs(prev => prev.map(log => {
      const idx = log.entries.findIndex(e => e.id === entryId);
      if (idx < 0) return log;
      const updated = { ...log.entries[idx], ...patch };
      updated.effectiveMl = effectiveMl(updated.amountMl, updated.drinkType, useFactors);
      const entries = [...log.entries];
      entries[idx] = updated;
      return recalcDay({ ...log, entries }, goalMl);
    }));
  }, [activeProfile, setLogs]);

  // ── Clear all ──────────────────────────────────────────────────────────────
  const clearAll = useCallback(() => { setLogs([]); }, [setLogs]);

  // ── Reset to today only (keep structure) ───────────────────────────────────
  const resetData = useCallback(() => { setLogs([]); }, [setLogs]);

  // ── Today's log ───────────────────────────────────────────────────────────
  const todayLog = useMemo((): DailyLog => {
    const date = todayStr();
    return logs.find(l => l.date === date) ?? {
      date, entries: [], totalMl: 0, totalEffectiveMl: 0, goalMet: false,
    };
  }, [logs]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo((): HydrationStats => {
    const settings = getSettings();
    const goalMl = activeProfile.goalMlOverride ?? settings.dailyGoalMl;

    const streak = buildStreak(logs);

    const last7: HydrationStats['last7Days'] = Array.from({ length: 7 }, (_, i) => {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const log = logs.find(l => l.date === date);
      return { date, totalMl: log?.totalEffectiveMl ?? 0, goalMet: log?.goalMet ?? false };
    }).reverse();

    const allMl = logs.map(l => l.totalEffectiveMl);
    const monthLogs = logs.filter(l => {
      const days = (Date.now() - parseISO(l.date).getTime()) / 86400000;
      return days <= 30;
    });

    const weekMl  = last7.reduce((s, d) => s + d.totalMl, 0);
    const weekAvg = last7.length > 0 ? Math.round(weekMl / 7) : 0;
    const monthAvg = monthLogs.length > 0
      ? Math.round(monthLogs.reduce((s, l) => s + l.totalEffectiveMl, 0) / monthLogs.length)
      : 0;
    const bestDayMl = allMl.length > 0 ? Math.max(...allMl) : 0;

    const todayEffective = todayLog.totalEffectiveMl;
    const goalPercent = Math.min(100, Math.round((todayEffective / goalMl) * 100));

    return {
      todayMl: todayLog.totalMl,
      todayEffectiveMl: todayEffective,
      goalMl,
      goalPercent,
      remainingMl: Math.max(0, goalMl - todayEffective),
      streak,
      weekAvgMl: weekAvg,
      monthAvgMl: monthAvg,
      bestDayMl,
      totalDaysLogged: logs.length,
      goalMetCount: logs.filter(l => l.goalMet).length,
      last7Days: last7,
    };
  }, [logs, todayLog, activeProfile]);

  // ── Import/export helpers ─────────────────────────────────────────────────
  const importLogs = useCallback((incoming: DailyLog[], merge: boolean) => {
    const settings = getSettings();
    const goalMl = activeProfile.goalMlOverride ?? settings.dailyGoalMl;

    setLogs(prev => {
      const base = merge ? [...prev] : [];
      const map = new Map<string, DailyLog>(base.map(l => [l.date, l]));
      for (const log of incoming) {
        if (merge && map.has(log.date)) {
          const existing = map.get(log.date)!;
          const combined = { ...existing, entries: [...existing.entries, ...log.entries] };
          map.set(log.date, recalcDay(combined, goalMl));
        } else {
          map.set(log.date, recalcDay(log, goalMl));
        }
      }
      return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
    });
  }, [activeProfile, setLogs]);

  return {
    logs,
    todayLog,
    stats,
    addDrink,
    deleteEntry,
    editEntry,
    clearAll,
    resetData,
    importLogs,
  };
}
