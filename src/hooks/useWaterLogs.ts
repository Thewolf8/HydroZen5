import { useState, useCallback, useMemo, useEffect } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import type { DrinkEntry, DailyLog, HydrationStats, DrinkTypeId } from '@/types/water';
import { DRINK_TYPES } from '@/types/water';
import { useProfile } from '@/context/ProfileContext';

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

function getEffectiveMl(amountMl: number, drinkType: DrinkTypeId, useFactors: boolean): number {
  if (!useFactors) return amountMl;
  const dt = DRINK_TYPES.find(d => d.id === drinkType);
  return Math.round(amountMl * (dt?.hydrationFactor ?? 1));
}

function recalcDay(log: DailyLog, goalMl: number): DailyLog {
  const totalMl = log.entries.reduce((s, e) => s + e.amountMl, 0);
  const totalEffectiveMl = log.entries.reduce((s, e) => s + e.effectiveMl, 0);
  return { ...log, totalMl, totalEffectiveMl, goalMet: totalEffectiveMl >= goalMl };
}

function buildStreak(logs: DailyLog[]) {
  const metDates = logs.filter(l => l.goalMet).map(l => l.date).sort();
  if (metDates.length === 0) return { current: 0, best: 0, metDates: [] };

  const metSet = new Set(metDates);
  const today = todayStr();
  const yest = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  let current = 0;
  let cursor: string | null = metSet.has(today) ? today : metSet.has(yest) ? yest : null;
  while (cursor && metSet.has(cursor)) {
    current++;
    cursor = format(subDays(parseISO(cursor), 1), 'yyyy-MM-dd');
  }

  let best = 1, run = 1;
  for (let i = 1; i < metDates.length; i++) {
    const diff = (parseISO(metDates[i]).getTime() - parseISO(metDates[i - 1]).getTime()) / 86400000;
    run = diff === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }

  return { current, best, metDates };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWaterLogs(goalMl: number, useHydrationFactors = true) {
  const { activeProfile } = useProfile();
  const profileId = activeProfile.id;

  const [logs, setLogsState] = useState<DailyLog[]>(() => loadLogs(profileId));

  // ── Reload when profile switches (useEffect, not during render) ───────────
  useEffect(() => {
    setLogsState(loadLogs(profileId));
  }, [profileId]);

  // ── Always persist to localStorage whenever logs change ───────────────────
  useEffect(() => {
    saveLogs(profileId, logs);
  }, [logs, profileId]);

  const effectiveGoal = activeProfile.goalMlOverride ?? goalMl;

  // ── Add a drink ────────────────────────────────────────────────────────────
  const addDrink = useCallback((
    amountMl: number,
    drinkType: DrinkTypeId,
    note?: string,
    timestampISO?: string,
  ): DrinkEntry => {
    const now = timestampISO ?? new Date().toISOString();
    const date = format(parseISO(now), 'yyyy-MM-dd');
    const effMl = getEffectiveMl(amountMl, drinkType, useHydrationFactors);
    const entry: DrinkEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      amountMl,
      drinkType,
      timestamp: now,
      note,
      effectiveMl: effMl,
    };

    setLogsState(prev => {
      const idx = prev.findIndex(l => l.date === date);
      let next: DailyLog[];
      if (idx >= 0) {
        const updated = { ...prev[idx], entries: [...prev[idx].entries, entry] };
        next = [...prev];
        next[idx] = recalcDay(updated, effectiveGoal);
      } else {
        const newLog: DailyLog = { date, entries: [entry], totalMl: 0, totalEffectiveMl: 0, goalMet: false };
        next = [...prev, recalcDay(newLog, effectiveGoal)];
      }
      return next.sort((a, b) => b.date.localeCompare(a.date));
    });

    return entry;
  }, [effectiveGoal, useHydrationFactors]);

  // ── Delete an entry ────────────────────────────────────────────────────────
  const deleteEntry = useCallback((entryId: string) => {
    setLogsState(prev =>
      prev
        .map(log => {
          if (!log.entries.find(e => e.id === entryId)) return log;
          const updated = { ...log, entries: log.entries.filter(e => e.id !== entryId) };
          return recalcDay(updated, effectiveGoal);
        })
        .filter(log => log.entries.length > 0)
    );
  }, [effectiveGoal]);

  // ── Edit an entry ──────────────────────────────────────────────────────────
  const editEntry = useCallback((
    entryId: string,
    patch: Partial<Pick<DrinkEntry, 'amountMl' | 'drinkType' | 'note'>>,
  ) => {
    setLogsState(prev => prev.map(log => {
      const idx = log.entries.findIndex(e => e.id === entryId);
      if (idx < 0) return log;
      const updated = { ...log.entries[idx], ...patch };
      updated.effectiveMl = getEffectiveMl(updated.amountMl, updated.drinkType, useHydrationFactors);
      const entries = [...log.entries];
      entries[idx] = updated;
      return recalcDay({ ...log, entries }, effectiveGoal);
    }));
  }, [effectiveGoal, useHydrationFactors]);

  // ── Clear / reset ──────────────────────────────────────────────────────────
  const clearAll  = useCallback(() => setLogsState([]), []);
  const resetData = useCallback(() => setLogsState([]), []);

  // ── Today's log ───────────────────────────────────────────────────────────
  const todayLog = useMemo((): DailyLog => {
    const date = todayStr();
    return logs.find(l => l.date === date) ?? {
      date, entries: [], totalMl: 0, totalEffectiveMl: 0, goalMet: false,
    };
  }, [logs]);

  // ── Stats — depends on goalMl so reruns when goal changes ─────────────────
  const stats = useMemo((): HydrationStats => {
    const streak = buildStreak(logs);

    const last7: HydrationStats['last7Days'] = Array.from({ length: 7 }, (_, i) => {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const log = logs.find(l => l.date === date);
      return { date, totalMl: log?.totalEffectiveMl ?? 0, goalMet: log?.goalMet ?? false };
    }).reverse();

    const allMl     = logs.map(l => l.totalEffectiveMl);
    const monthLogs = logs.filter(l => (Date.now() - parseISO(l.date).getTime()) / 86400000 <= 30);
    const weekMl    = last7.reduce((s, d) => s + d.totalMl, 0);
    const weekAvg   = Math.round(weekMl / 7);
    const monthAvg  = monthLogs.length
      ? Math.round(monthLogs.reduce((s, l) => s + l.totalEffectiveMl, 0) / monthLogs.length)
      : 0;
    const bestDayMl    = allMl.length ? Math.max(...allMl) : 0;
    const todayEff     = todayLog.totalEffectiveMl;
    const goalPercent  = Math.min(100, Math.round((todayEff / effectiveGoal) * 100));

    return {
      todayMl: todayLog.totalMl,
      todayEffectiveMl: todayEff,
      goalMl: effectiveGoal,
      goalPercent,
      remainingMl: Math.max(0, effectiveGoal - todayEff),
      streak,
      weekAvgMl: weekAvg,
      monthAvgMl: monthAvg,
      bestDayMl,
      totalDaysLogged: logs.length,
      goalMetCount: logs.filter(l => l.goalMet).length,
      last7Days: last7,
    };
  }, [logs, todayLog, effectiveGoal]);   // ← effectiveGoal (derived from goalMl param) is now a dep

  // ── Import ─────────────────────────────────────────────────────────────────
  const importLogs = useCallback((incoming: DailyLog[], merge: boolean) => {
    setLogsState(prev => {
      const base  = merge ? [...prev] : [];
      const map   = new Map<string, DailyLog>(base.map(l => [l.date, l]));
      for (const log of incoming) {
        if (merge && map.has(log.date)) {
          const ex  = map.get(log.date)!;
          const combined = { ...ex, entries: [...ex.entries, ...log.entries] };
          map.set(log.date, recalcDay(combined, effectiveGoal));
        } else {
          map.set(log.date, recalcDay(log, effectiveGoal));
        }
      }
      return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
    });
  }, [effectiveGoal]);

  return { logs, todayLog, stats, addDrink, deleteEntry, editEntry, clearAll, resetData, importLogs };
}
