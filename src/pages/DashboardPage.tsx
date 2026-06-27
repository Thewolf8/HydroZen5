import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Droplets, Flame, TrendingUp, Trophy, Plus, Trash2,
  Zap, Target, Clock, CheckCircle2, Calendar,
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
import { DRINK_TYPES, CONTAINER_PRESETS, type DrinkEntry } from '@/types/water';
import type { HydrationStats, Unit } from '@/types/water';
import { format, parseISO, formatDistanceToNowStrict } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import type { Page } from '@/App';

const MOTIVATION_QUOTES = [
  '💧 Every sip counts. Stay consistent!',
  '🌊 Water is the driving force of all nature.',
  '✨ Your body is 60% water — keep it topped up!',
  '🏆 Hydration = energy, focus, and better mood.',
  '🌿 Small habits, big results.',
];

interface DashboardProps {
  stats: HydrationStats;
  unit: Unit;
  onAddDrink: (ml: number, type: string) => void;
  onNavigate: (page: Page) => void;
  onDelete: (id: string) => void;
  recentEntries: DrinkEntry[];
  showMotivation: boolean;
}

// ── Circular progress ring ─────────────────────────────────────────────────

function ProgressRing({ percent, size = 180 }: { percent: number; size?: number }) {
  const r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  const isComplete = percent >= 100;

  return (
    <svg width={size} height={size} className="drop-shadow-md">
      {/* Track */}
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor"
        strokeWidth={12} className="text-sky-500/10" />
      {/* Progress */}
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={isComplete ? '#10b981' : '#0ea5e9'}
        strokeWidth={12} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut' }}
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      {/* Center text */}
      <text x="50%" y="44%" textAnchor="middle" className="fill-foreground"
        style={{ fontSize: 28, fontWeight: 700 }}>
        {percent}%
      </text>
      <text x="50%" y="60%" textAnchor="middle" className="fill-muted-foreground"
        style={{ fontSize: 11 }}>
        {isComplete ? '🎉 Goal met!' : 'of daily goal'}
      </text>
    </svg>
  );
}

export default function DashboardPage({ stats, unit, onAddDrink, onNavigate, onDelete, recentEntries, showMotivation }: DashboardProps) {
  const { t } = useI18n();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [quote] = useState(() => MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  const statsCards = [
    {
      icon: Droplets,
      label: t('totalToday'),
      value: formatAmount(stats.todayMl, unit),
      color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/20',
    },
    {
      icon: Zap,
      label: t('effective'),
      value: formatAmount(stats.todayEffectiveMl, unit),
      color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20',
    },
    {
      icon: Flame,
      label: t('streak'),
      value: `${stats.streak.current}d`,
      color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20',
    },
    {
      icon: Trophy,
      label: t('bestDay'),
      value: formatAmount(stats.bestDayMl, unit),
      color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
    },
  ];

  // Last 7 days chart data
  const chartData = stats.last7Days.map(d => ({
    name: format(parseISO(d.date), 'EEE'),
    value: d.totalMl,
    met: d.goalMet,
  }));

  function getTimeAgo(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return t('justNow');
    if (mins < 60) return `${mins}${t('minutesAgo')}`;
    return `${Math.floor(mins / 60)}${t('hoursAgo')}`;
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5 py-4">

      {/* Motivation quote */}
      {showMotivation && (
        <motion.div variants={itemVariants}
          className="rounded-2xl bg-gradient-to-r from-sky-500/10 to-cyan-500/5 border border-sky-500/15 px-4 py-3"
        >
          <p className="text-sm text-muted-foreground">{quote}</p>
        </motion.div>
      )}

      {/* Progress ring + info */}
      <motion.div variants={itemVariants}>
        <Card className="rounded-2xl border-border overflow-hidden">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center justify-between gap-4">
              {/* Ring */}
              <div className="flex-none">
                <ProgressRing percent={stats.goalPercent} />
              </div>

              {/* Breakdown */}
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('todayProgress')}</p>
                  <p className="text-2xl font-bold text-sky-500 mt-0.5">{formatAmount(stats.todayEffectiveMl, unit)}</p>
                  <p className="text-xs text-muted-foreground">of {formatAmount(stats.goalMl, unit)}</p>
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

            {/* Goal achieved banner */}
            <AnimatePresence>
              {stats.goalPercent >= 100 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 flex items-center gap-2"
                >
                  <CheckCircle2 size={16} className="text-emerald-500 flex-none" />
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{t('achieved')}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stat cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statsCards.map(s => (
          <div key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} p-4`}>
            <div className={`w-8 h-8 rounded-xl bg-background/40 flex items-center justify-center mb-2`}>
              <s.icon size={16} className={s.color} />
            </div>
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Quick Add */}
      <motion.div variants={itemVariants}>
        <Card className="rounded-2xl">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Plus size={16} className="text-sky-500" />
              {t('quickAdd')}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-4 gap-2 mb-3">
              {CONTAINER_PRESETS.slice(1).map(preset => (
                <motion.button
                  key={preset.id}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => onAddDrink(preset.ml, 'water')}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl bg-sky-500/5 border border-sky-500/15 hover:bg-sky-500/15 hover:border-sky-500/40 transition-all"
                >
                  <span className="text-lg">{preset.icon}</span>
                  <span className="text-xs font-semibold">{formatAmount(preset.ml, unit)}</span>
                </motion.button>
              ))}
            </div>
            {/* Drink type shortcuts */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {DRINK_TYPES.slice(0, 6).map(dt => (
                <button
                  key={dt.id}
                  onClick={() => onAddDrink(250, dt.id)}
                  className="flex-none flex flex-col items-center gap-1 px-3 py-2 rounded-xl border border-border hover:border-sky-500/40 hover:bg-sky-500/5 transition-all"
                >
                  <span className="text-base">{dt.emoji}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{dt.id}</span>
                </button>
              ))}
            </div>
            <Button onClick={() => onNavigate('log')} className="w-full mt-3 bg-sky-500 hover:bg-sky-600 text-white gap-2">
              <Droplets size={16} />
              {t('logDrink')}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Weekly chart */}
      <motion.div variants={itemVariants}>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2 pt-4 px-4 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp size={16} className="text-sky-500" />
              Last 7 Days
            </CardTitle>
            <span className="text-xs text-muted-foreground">Avg: {formatAmount(stats.weekAvgMl, unit)}/day</span>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={chartData} barSize={24}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'currentColor' }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.[0] ? (
                      <div className="rounded-lg border bg-card px-2 py-1 text-xs shadow-md">
                        {formatAmount(payload[0].value as number, unit)}
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.met ? '#10b981' : '#0ea5e9'} opacity={d.met ? 1 : 0.6} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Goal met</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> Partial</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent entries */}
      <motion.div variants={itemVariants}>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2 pt-4 px-4 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock size={16} className="text-sky-500" />
              {t('recentLogs')}
            </CardTitle>
            <button onClick={() => onNavigate('history')}
              className="text-xs text-sky-500 hover:underline">
              {t('viewAll')}
            </button>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {recentEntries.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <Droplets size={32} className="text-sky-500/30 mx-auto" />
                <p className="text-sm text-muted-foreground">{t('noLogsToday')}</p>
                <p className="text-xs text-muted-foreground/70">{t('noLogsTodayDesc')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentEntries.slice(0, 5).map(entry => {
                  const dt = DRINK_TYPES.find(d => d.id === entry.drinkType)!;
                  return (
                    <motion.div key={entry.id} layout
                      className="flex items-center gap-3 py-2 rounded-xl hover:bg-accent/50 px-2 -mx-2 group transition-colors"
                    >
                      <span className="text-lg flex-none">{dt?.emoji ?? '💧'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">{entry.drinkType}</p>
                        <p className="text-xs text-muted-foreground">{getTimeAgo(entry.timestamp)}</p>
                      </div>
                      <span className="text-sm font-semibold text-sky-500">{formatAmount(entry.amountMl, unit)}</span>
                      <button onClick={() => setDeleteId(entry.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* More stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
        {[
          { icon: Calendar, label: t('daysLogged'), value: stats.totalDaysLogged, color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
          { icon: Target,   label: t('goalsMet'),   value: stats.goalMetCount,   color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { icon: Trophy,   label: t('bestStreak'), value: `${stats.streak.best}d`, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} p-3 text-center`}>
            <s.icon size={18} className={`${s.color} mx-auto mb-1`} />
            <p className="text-lg font-bold">{s.value}</p>
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
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) onDelete(deleteId); setDeleteId(null); }}>
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
