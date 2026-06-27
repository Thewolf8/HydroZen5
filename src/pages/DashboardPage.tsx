import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Droplets, Flame, TrendingUp, Trophy, Trash2,
  Zap, Target, Clock, CheckCircle2, Calendar, Plus, Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useI18n } from '@/i18n/I18nContext';
import { formatAmount } from '@/lib/utils';
import { DRINK_TYPES, CONTAINER_PRESETS, type DrinkTypeId, type DrinkEntry } from '@/types/water';
import type { HydrationStats, Unit } from '@/types/water';
import { format, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import type { Page } from '@/App';

const MOTIVATION_QUOTES = [
  '💧 Every sip counts. Stay consistent!',
  '🌊 Water is the driving force of all nature.',
  '✨ Your body is 60% water — keep it topped up!',
  '🏆 Hydration = energy, focus, and better mood.',
  '🌿 Small habits, big results.',
];

const LAST_TYPE_KEY = 'aquaflow-last-drink-type';

// ── Circular progress ring ─────────────────────────────────────────────────

function ProgressRing({ percent, size = 180 }: { percent: number; size?: number }) {
  const r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  const done = percent >= 100;
  return (
    <svg width={size} height={size} className="drop-shadow-sm">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor"
        strokeWidth={12} className="text-sky-500/10" />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={done ? '#10b981' : '#0ea5e9'}
        strokeWidth={12} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut' }}
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <text x="50%" y="44%" textAnchor="middle" fill="currentColor"
        style={{ fontSize: 28, fontWeight: 700 }}>
        {percent}%
      </text>
      <text x="50%" y="60%" textAnchor="middle" className="fill-muted-foreground"
        style={{ fontSize: 11 }}>
        {done ? '🎉 Goal met!' : 'of goal'}
      </text>
    </svg>
  );
}

// ── Quick-add panel (embedded in dashboard) ───────────────────────────────

function QuickAddPanel({
  unit, onAdd,
}: {
  unit: Unit;
  onAdd: (ml: number, type: DrinkTypeId) => void;
}) {
  const { t } = useI18n();

  const [selectedType, setSelectedType] = useState<DrinkTypeId>(() => {
    return (localStorage.getItem(LAST_TYPE_KEY) as DrinkTypeId | null) ?? 'water';
  });
  const [pendingMl, setPendingMl] = useState<number | null>(null);

  function pickType(type: DrinkTypeId) {
    setSelectedType(type);
    localStorage.setItem(LAST_TYPE_KEY, type);
    setPendingMl(null);
  }

  function pickAmount(ml: number) {
    setPendingMl(ml);
  }

  function confirm() {
    if (pendingMl === null) return;
    onAdd(pendingMl, selectedType);
    setPendingMl(null);
  }

  function cancel() { setPendingMl(null); }

  const dt = DRINK_TYPES.find(d => d.id === selectedType)!;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Plus size={15} className="text-sky-500" />
          {t('quickAdd')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">

        {/* Step 1: Drink type selector */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">1. {t('drinkType')}</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {DRINK_TYPES.map(d => (
              <button
                key={d.id}
                onClick={() => pickType(d.id)}
                className={`flex-none flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                  selectedType === d.id
                    ? 'bg-sky-500/10 border-sky-500/40 text-sky-600 dark:text-sky-400'
                    : 'border-border text-muted-foreground hover:border-sky-500/30 hover:bg-accent'
                }`}
              >
                <span className="text-lg">{d.emoji}</span>
                <span className="capitalize whitespace-nowrap">{t(d.id as any)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Amount presets */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">2. {t('amount')}</p>
          <div className="grid grid-cols-4 gap-2">
            {CONTAINER_PRESETS.map(p => (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.93 }}
                onClick={() => pickAmount(p.ml)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                  pendingMl === p.ml
                    ? 'bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-500/25'
                    : 'border-border hover:border-sky-500/40 hover:bg-sky-500/5 text-muted-foreground'
                }`}
              >
                <span className="text-base">{p.icon}</span>
                <span>{formatAmount(p.ml, unit)}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Step 3: Confirm (only visible when amount is selected) */}
        <AnimatePresence>
          {pendingMl !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl bg-sky-500/5 border border-sky-500/20 p-3 flex items-center gap-3">
                <span className="text-2xl">{dt.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold capitalize">{t(selectedType as any)}</p>
                  <p className="text-xs text-sky-500 font-medium">{formatAmount(pendingMl, unit)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={cancel} className="h-8 px-3 text-xs">
                    {t('cancel')}
                  </Button>
                  <Button size="sm" onClick={confirm}
                    className="h-8 px-3 text-xs bg-sky-500 hover:bg-sky-600 text-white gap-1">
                    <Check size={13} /> {t('saveDrink')}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────

interface DashboardProps {
  stats: HydrationStats;
  unit: Unit;
  onQuickAdd: (ml: number, type: string) => void;
  onNavigate: (page: Page) => void;
  onDelete: (id: string) => void;
  recentEntries: DrinkEntry[];
  showMotivation: boolean;
}

export default function DashboardPage({
  stats, unit, onQuickAdd, onNavigate, onDelete, recentEntries, showMotivation,
}: DashboardProps) {
  const { t } = useI18n();
  const [deleteId, setDeleteId]  = useState<string | null>(null);
  const [quote] = useState(() => MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)]);

  const containerV = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };
  const itemV = {
    hidden:  { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.38 } },
  };

  const chartData = stats.last7Days.map(d => ({
    name: format(parseISO(d.date), 'EEE'),
    value: d.totalMl,
    met: d.goalMet,
  }));

  function timeAgo(iso: string) {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1)  return t('justNow');
    if (mins < 60) return `${mins}${t('minutesAgo')}`;
    return `${Math.floor(mins / 60)}${t('hoursAgo')}`;
  }

  return (
    <motion.div variants={containerV} initial="hidden" animate="visible" className="space-y-4 py-4">

      {/* Motivation */}
      {showMotivation && (
        <motion.div variants={itemV}
          className="rounded-2xl bg-gradient-to-r from-sky-500/10 to-cyan-500/5 border border-sky-500/15 px-4 py-3">
          <p className="text-sm text-muted-foreground">{quote}</p>
        </motion.div>
      )}

      {/* Progress ring + breakdown */}
      <motion.div variants={itemV}>
        <Card className="rounded-2xl">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-none"><ProgressRing percent={stats.goalPercent} /></div>
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('todayProgress')}</p>
                  <p className="text-2xl font-bold text-sky-500 mt-0.5">{formatAmount(stats.todayEffectiveMl, unit)}</p>
                  <p className="text-xs text-muted-foreground">{t('of')} {formatAmount(stats.goalMl, unit)}</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t('remaining')}</span>
                    <span className="font-medium text-foreground">{formatAmount(stats.remainingMl, unit)}</span>
                  </div>
                  <Progress value={stats.goalPercent} className="h-2 bg-sky-500/10" />
                </div>
                <div className="flex gap-2 text-xs">
                  <div className="flex-1 rounded-xl bg-orange-500/10 border border-orange-500/15 p-2 text-center">
                    <p className="text-orange-500 font-bold">{stats.streak.current}</p>
                    <p className="text-muted-foreground text-[10px]">{t('streakDays')}</p>
                  </div>
                  <div className="flex-1 rounded-xl bg-emerald-500/10 border border-emerald-500/15 p-2 text-center">
                    <p className="text-emerald-500 font-bold">{stats.goalMetCount}</p>
                    <p className="text-muted-foreground text-[10px]">{t('goalsMet')}</p>
                  </div>
                </div>
              </div>
            </div>
            <AnimatePresence>
              {stats.goalPercent >= 100 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 flex-none" />
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{t('achieved')}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stat chips */}
      <motion.div variants={itemV} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { icon: Droplets,   label: t('totalToday'), value: formatAmount(stats.todayMl, unit),       color: 'text-sky-500',    bg: 'bg-sky-500/10',    border: 'border-sky-500/20' },
          { icon: Zap,        label: t('effective'),  value: formatAmount(stats.todayEffectiveMl, unit), color: 'text-cyan-500',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20' },
          { icon: Flame,      label: t('streak'),     value: `${stats.streak.current}d`,              color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
          { icon: Trophy,     label: t('bestDay'),    value: formatAmount(stats.bestDayMl, unit),      color: 'text-amber-500',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} p-3`}>
            <div className="w-7 h-7 rounded-lg bg-background/40 flex items-center justify-center mb-2">
              <s.icon size={15} className={s.color} />
            </div>
            <p className="text-base font-bold">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Quick-add panel */}
      <motion.div variants={itemV}>
        <QuickAddPanel unit={unit} onAdd={onQuickAdd} />
      </motion.div>

      {/* Weekly chart */}
      <motion.div variants={itemV}>
        <Card className="rounded-2xl">
          <CardHeader className="pb-1 pt-4 px-4 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp size={15} className="text-sky-500" /> Last 7 Days
            </CardTitle>
            <span className="text-xs text-muted-foreground">Avg: {formatAmount(stats.weekAvgMl, unit)}/day</span>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={chartData} barSize={28}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={({ active, payload }) =>
                  active && payload?.[0] ? (
                    <div className="rounded-lg border bg-card px-2 py-1 text-xs shadow">
                      {formatAmount(payload[0].value as number, unit)}
                    </div>
                  ) : null
                } />
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.met ? '#10b981' : '#0ea5e9'} opacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent entries — delete buttons ALWAYS visible */}
      <motion.div variants={itemV}>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2 pt-4 px-4 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock size={15} className="text-sky-500" /> {t('recentLogs')}
            </CardTitle>
            <button onClick={() => onNavigate('history')} className="text-xs text-sky-500 hover:underline">
              {t('viewAll')}
            </button>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {recentEntries.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <Droplets size={32} className="text-sky-500/25 mx-auto" />
                <p className="text-sm text-muted-foreground">{t('noLogsToday')}</p>
                <p className="text-xs text-muted-foreground/60">{t('noLogsTodayDesc')}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentEntries.slice(0, 6).map(entry => {
                  const dt = DRINK_TYPES.find(d => d.id === entry.drinkType);
                  return (
                    <motion.div key={entry.id} layout
                      className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-xl hover:bg-accent/50 transition-colors"
                    >
                      <span className="text-xl flex-none">{dt?.emoji ?? '💧'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">{t(entry.drinkType as any)}</p>
                        <p className="text-xs text-muted-foreground">{timeAgo(entry.timestamp)}</p>
                        {entry.note && (
                          <p className="text-xs text-muted-foreground/70 truncate">{entry.note}</p>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-sky-500 flex-none">
                        {formatAmount(entry.amountMl, unit)}
                      </span>
                      {/* Delete always visible — important on mobile */}
                      <button
                        onClick={() => setDeleteId(entry.id)}
                        className="flex-none w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom stats */}
      <motion.div variants={itemV} className="grid grid-cols-3 gap-2 pb-2">
        {[
          { icon: Calendar, label: t('daysLogged'), value: stats.totalDaysLogged, color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
          { icon: Target,   label: t('goalsMet'),   value: stats.goalMetCount,    color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { icon: Trophy,   label: t('bestStreak'), value: `${stats.streak.best}d`, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} p-3 text-center`}>
            <s.icon size={16} className={`${s.color} mx-auto mb-1`} />
            <p className="text-base font-bold">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmDeleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }}
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
