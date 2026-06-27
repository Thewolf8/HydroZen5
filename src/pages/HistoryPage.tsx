import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, subDays, subMonths, subYears, isToday, isYesterday } from 'date-fns';
import {
  Trash2, BarChart2, List, Calendar, Filter, Droplets, TrendingUp,
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { useI18n } from '@/i18n/I18nContext';
import { DRINK_TYPES, type DrinkTypeId } from '@/types/water';
import type { DailyLog, HydrationStats, Unit } from '@/types/water';
import { formatAmount } from '@/lib/utils';

type ViewMode = 'chart' | 'list' | 'calendar';
type Range = '7d' | '30d' | '90d' | '1y' | 'all';

interface HistoryPageProps {
  logs: DailyLog[];
  stats: HydrationStats;
  unit: Unit;
  goalMl: number;
  onDelete: (entryId: string) => void;
  onClearAll: () => void;
}

function DateLabel(date: string) {
  if (isToday(parseISO(date)))     return 'Today';
  if (isYesterday(parseISO(date))) return 'Yesterday';
  return format(parseISO(date), 'EEE, MMM d');
}

export default function HistoryPage({
  logs, stats, unit, goalMl, onDelete, onClearAll,
}: HistoryPageProps) {
  const { t } = useI18n();
  const [view, setView]   = useState<ViewMode>('chart');
  const [range, setRange] = useState<Range>('30d');
  const [typeFilter, setTypeFilter] = useState<DrinkTypeId | 'all'>('all');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [showClearAll, setShowClearAll] = useState(false);

  // Filter logs by range
  const filteredLogs = useMemo(() => {
    const cutoff = {
      '7d':  subDays(new Date(), 7),
      '30d': subDays(new Date(), 30),
      '90d': subDays(new Date(), 90),
      '1y':  subYears(new Date(), 1),
      'all': new Date(0),
    }[range];

    return logs
      .filter(l => parseISO(l.date) >= cutoff)
      .map(l => ({
        ...l,
        entries: typeFilter === 'all'
          ? l.entries
          : l.entries.filter(e => e.drinkType === typeFilter),
      }))
      .filter(l => l.entries.length > 0)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [logs, range, typeFilter]);

  // Summary stats for filtered range
  const rangeSummary = useMemo(() => {
    const total = filteredLogs.reduce((s, l) => s + l.totalEffectiveMl, 0);
    const met   = filteredLogs.filter(l => l.goalMet).length;
    const avg   = filteredLogs.length ? Math.round(total / filteredLogs.length) : 0;
    return { total, met, avg, days: filteredLogs.length };
  }, [filteredLogs]);

  // Drink type breakdown
  const breakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const log of filteredLogs) {
      for (const e of log.entries) {
        map[e.drinkType] = (map[e.drinkType] ?? 0) + e.amountMl;
      }
    }
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .map(([id, ml]) => ({ id, ml, pct: total ? Math.round((ml / total) * 100) : 0 }))
      .sort((a, b) => b.ml - a.ml);
  }, [filteredLogs]);

  // Chart data
  const chartData = [...filteredLogs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map(l => ({
      name: format(parseISO(l.date), range === '7d' ? 'EEE' : 'M/d'),
      value: l.totalEffectiveMl,
      goal: goalMl,
      met: l.goalMet,
    }));

  const RANGES: { key: Range; label: string }[] = [
    { key: '7d', label: '7D' }, { key: '30d', label: '30D' },
    { key: '90d', label: '90D' }, { key: '1y', label: '1Y' },
    { key: 'all', label: t('allTime') },
  ];

  return (
    <div className="space-y-5 py-4">

      {/* ── Range tabs ─────────────────────────────────────────────── */}
      <div className="flex gap-1.5 p-1 bg-muted rounded-xl">
        {RANGES.map(r => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              range === r.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* ── Summary stats ──────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: t('days'), value: rangeSummary.days, color: 'text-sky-500' },
          { label: t('totalIntake'), value: formatAmount(rangeSummary.total, unit), color: 'text-cyan-500' },
          { label: t('avgPerDay'), value: formatAmount(rangeSummary.avg, unit), color: 'text-violet-500' },
          { label: t('goalMetCount'), value: rangeSummary.met, color: 'text-emerald-500' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-3 text-center">
            <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── View toggle ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 p-0.5 bg-muted rounded-xl">
          {([['chart', BarChart2], ['list', List], ['calendar', Calendar]] as const).map(([v, Icon]) => (
            <button
              key={v}
              onClick={() => setView(v as ViewMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={13} />{t(v as any)}
            </button>
          ))}
        </div>
        {logs.length > 0 && (
          <button onClick={() => setShowClearAll(true)}
            className="text-xs text-destructive/70 hover:text-destructive transition-colors flex items-center gap-1">
            <Trash2 size={12} /> {t('clearAll')}
          </button>
        )}
      </div>

      {/* ── Type filter pills ──────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        <button
          onClick={() => setTypeFilter('all')}
          className={`flex-none px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            typeFilter === 'all' ? 'bg-sky-500 border-sky-500 text-white' : 'border-border text-muted-foreground hover:border-sky-500/40'
          }`}
        >
          All
        </button>
        {DRINK_TYPES.map(dt => (
          <button
            key={dt.id}
            onClick={() => setTypeFilter(typeFilter === dt.id ? 'all' : dt.id)}
            className={`flex-none flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              typeFilter === dt.id ? 'bg-sky-500 border-sky-500 text-white' : 'border-border text-muted-foreground hover:border-sky-500/40'
            }`}
          >
            <span>{dt.emoji}</span> {t(dt.id as any)}
          </button>
        ))}
      </div>

      {filteredLogs.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Droplets size={48} className="text-sky-500/20 mx-auto" />
          <p className="text-muted-foreground">{t('noHistory')}</p>
          <p className="text-xs text-muted-foreground/70">{t('noHistoryDesc')}</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">

          {/* ── Chart view ─────────────────────────────────────────── */}
          {view === 'chart' && (
            <motion.div key="chart" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="space-y-4">
              <Card className="rounded-2xl">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp size={15} className="text-sky-500" /> Daily Intake
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData} barSize={range === '7d' ? 30 : 14}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false}
                        tickFormatter={v => unit === 'oz' ? `${Math.round(v*0.0338)}oz` : `${v}ml`} width={42} />
                      <Tooltip
                        content={({ active, payload }) =>
                          active && payload?.[0] ? (
                            <div className="rounded-lg border bg-card px-2 py-1 text-xs shadow-md space-y-0.5">
                              <p>{formatAmount(payload[0].value as number, unit)}</p>
                              <p className="text-muted-foreground">Goal: {formatAmount(goalMl, unit)}</p>
                            </div>
                          ) : null
                        }
                      />
                      <Bar dataKey="value" radius={[4,4,0,0]}>
                        {chartData.map((d, i) => (
                          <Cell key={i} fill={d.met ? '#10b981' : '#0ea5e9'} opacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Drink breakdown */}
              <Card className="rounded-2xl">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold">{t('drinkBreakdown')}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {breakdown.map(b => {
                    const dt = DRINK_TYPES.find(d => d.id === b.id);
                    return (
                      <div key={b.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <span>{dt?.emoji}</span>
                            <span className="capitalize text-muted-foreground">{t(b.id as any)}</span>
                          </span>
                          <span className="font-medium">{formatAmount(b.ml, unit)} <span className="text-muted-foreground">({b.pct}%)</span></span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${b.pct}%` }}
                            className="h-full bg-sky-500 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── List view ─────────────────────────────────────────── */}
          {view === 'list' && (
            <motion.div key="list" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="space-y-3">
              {filteredLogs.map(log => {
                const isExpanded = expandedDate === log.date;
                return (
                  <Card key={log.date} className="rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandedDate(isExpanded ? null : log.date)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-accent/30 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-none ${
                        log.goalMet ? 'bg-emerald-500/10' : 'bg-sky-500/10'
                      }`}>
                        {log.goalMet
                          ? <CheckCircle2 size={16} className="text-emerald-500" />
                          : <Droplets size={16} className="text-sky-500" />
                        }
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold">{DateLabel(log.date)}</p>
                        <p className="text-xs text-muted-foreground">{log.entries.length} drinks</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${log.goalMet ? 'text-emerald-500' : 'text-sky-500'}`}>
                          {formatAmount(log.totalEffectiveMl, unit)}
                        </p>
                        <p className="text-xs text-muted-foreground">{Math.round((log.totalEffectiveMl/goalMl)*100)}%</p>
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-muted-foreground flex-none" /> : <ChevronDown size={16} className="text-muted-foreground flex-none" />}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border px-4 py-2 space-y-1">
                            {log.entries.sort((a,b) => b.timestamp.localeCompare(a.timestamp)).map(entry => {
                              const dt = DRINK_TYPES.find(d => d.id === entry.drinkType);
                              return (
                                <div key={entry.id} className="flex items-center gap-3 py-1.5 group">
                                  <span className="text-base flex-none">{dt?.emoji ?? '💧'}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium capitalize">{t(entry.drinkType as any)}</p>
                                    <p className="text-xs text-muted-foreground">{format(parseISO(entry.timestamp), 'h:mm a')}</p>
                                    {entry.note && <p className="text-xs text-muted-foreground/70 truncate">{entry.note}</p>}
                                  </div>
                                  <span className="text-xs font-semibold text-sky-500">{formatAmount(entry.amountMl, unit)}</span>
                                  <button
                                    onClick={() => setDeleteEntryId(entry.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
              })}
            </motion.div>
          )}

          {/* ── Calendar / heatmap view ────────────────────────────── */}
          {view === 'calendar' && (
            <motion.div key="cal" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              <Card className="rounded-2xl">
                <CardContent className="pt-4 pb-4 px-4">
                  <div className="grid grid-cols-7 gap-1">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                      <div key={d} className="text-center text-[10px] text-muted-foreground pb-1">{d}</div>
                    ))}
                    {/* Fill empty cells at start of first week */}
                    {(() => {
                      const last90 = Array.from({ length: 90 }, (_, i) => {
                        const d = format(subDays(new Date(), 89 - i), 'yyyy-MM-dd');
                        const log = logs.find(l => l.date === d);
                        return { date: d, log };
                      });
                      const firstDay = parseISO(last90[0].date).getDay();
                      const empties = Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} />);
                      return [
                        ...empties,
                        ...last90.map(({ date, log }) => {
                          const pct = log ? Math.min(1, log.totalEffectiveMl / goalMl) : 0;
                          const opacity = pct === 0 ? 0.08 : 0.15 + pct * 0.85;
                          return (
                            <div
                              key={date}
                              title={`${format(parseISO(date), 'MMM d')}: ${log ? formatAmount(log.totalEffectiveMl, unit) : 'No data'}`}
                              className="aspect-square rounded-sm"
                              style={{ background: pct >= 1 ? `rgba(16,185,129,${opacity})` : `rgba(14,165,233,${opacity})` }}
                            />
                          );
                        }),
                      ];
                    })()}
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <span>Less</span>
                    {[0.15, 0.35, 0.55, 0.75, 1].map((o, i) => (
                      <div key={i} className="w-3 h-3 rounded-sm" style={{ background: `rgba(14,165,233,${o})` }} />
                    ))}
                    <span>More</span>
                    <span className="ml-2 flex items-center gap-1">
                      <div className="w-3 h-3 rounded-sm bg-emerald-500/80" /> Goal met
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Delete entry confirm */}
      <AlertDialog open={!!deleteEntryId} onOpenChange={o => !o && setDeleteEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmDeleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground"
              onClick={() => { if (deleteEntryId) { onDelete(deleteEntryId); setDeleteEntryId(null); } }}>
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear all confirm */}
      <AlertDialog open={showClearAll} onOpenChange={setShowClearAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clearAllTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('clearAllDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground"
              onClick={() => { onClearAll(); setShowClearAll(false); }}>
              {t('clearConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
