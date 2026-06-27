import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Bell, BellOff, Plus, Trash2, Clock, Zap, Sparkles, Check,
  Scale, Activity, Calculator,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n/I18nContext';
import type { AppSettings, Unit } from '@/types/water';
import { formatAmount } from '@/lib/utils';
import {
  requestPermission,
  scheduleWaterReminders,
  cancelNotifications,
} from '@/services/notificationService';

interface GoalsPageProps {
  settings: AppSettings;
  unit: Unit;
  onSaveGoal: (ml: number) => void;
  onSaveReminder: (patch: Partial<AppSettings['reminder']>) => void;
  onToast: (msg: string, desc?: string) => void;
}

const GOAL_PRESETS = [
  { ml: 1500, labelKey: 'goalPreset1500' as const },
  { ml: 2000, labelKey: 'goalPreset2000' as const },
  { ml: 2500, labelKey: 'goalPreset2500' as const },
  { ml: 3000, labelKey: 'goalPreset3000' as const },
  { ml: 3500, labelKey: 'goalPreset3500' as const },
];

// Activity level → ml per kg of body weight
const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary',    mlPerKg: 30, desc: 'Office work, little exercise' },
  { id: 'light',     label: 'Light',        mlPerKg: 33, desc: '1–3 days exercise per week' },
  { id: 'moderate',  label: 'Moderate',     mlPerKg: 36, desc: '3–5 days exercise per week' },
  { id: 'active',    label: 'Active',       mlPerKg: 40, desc: '6–7 days exercise per week' },
  { id: 'athlete',   label: 'Athlete',      mlPerKg: 45, desc: 'Twice daily training' },
] as const;
type ActivityId = typeof ACTIVITY_LEVELS[number]['id'];

function pad(n: number) { return String(n).padStart(2, '0'); }

function generateTimes(wake: number, sleep: number, interval: number): string[] {
  const times: string[] = [];
  let cur = wake * 60;
  while (cur <= sleep * 60) {
    times.push(`${pad(Math.floor(cur / 60))}:${pad(cur % 60)}`);
    cur += interval;
  }
  return times;
}

export default function GoalsPage({
  settings, unit, onSaveGoal, onSaveReminder, onToast,
}: GoalsPageProps) {
  const { t } = useI18n();
  const rem = settings.reminder;

  // ── Goal state ────────────────────────────────────────────────────────────
  const [goalMl,         setGoalMl]         = useState(settings.dailyGoalMl);
  const [customGoalInput, setCustomGoalInput] = useState('');
  const [goalSaved,       setGoalSaved]       = useState(false);

  // ── Weight calculator state ───────────────────────────────────────────────
  const [showCalculator, setShowCalculator] = useState(false);
  const [weightInput,    setWeightInput]    = useState('');
  const [weightUnit,     setWeightUnit]     = useState<'kg' | 'lbs'>('kg');
  const [activity,       setActivity]       = useState<ActivityId>('moderate');
  const [calcResult,     setCalcResult]     = useState<number | null>(null);

  // ── Reminder state ────────────────────────────────────────────────────────
  const [remEnabled,  setRemEnabled]  = useState(rem.enabled);
  const [wakeHour,    setWakeHour]    = useState(rem.wakeHour);
  const [sleepHour,   setSleepHour]   = useState(rem.sleepHour);
  const [intervalMin, setIntervalMin] = useState(rem.intervalMinutes);
  const [useInterval, setUseInterval] = useState(rem.useInterval);
  const [customTimes, setCustomTimes] = useState<string[]>(rem.times);
  const [smartMode,   setSmartMode]   = useState(rem.smartMode);
  const [newTime,     setNewTime]     = useState('');
  const [applying,    setApplying]    = useState(false);

  const previewTimes = useInterval
    ? generateTimes(wakeHour, sleepHour, intervalMin)
    : customTimes;

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSaveGoal() {
    onSaveGoal(goalMl);
    setGoalSaved(true);
    setTimeout(() => setGoalSaved(false), 1500);
    onToast(t('goalUpdated'));
  }

  function calculateGoal() {
    const w = parseFloat(weightInput);
    if (isNaN(w) || w <= 0) return;
    const kg = weightUnit === 'lbs' ? w * 0.453592 : w;
    const level = ACTIVITY_LEVELS.find(l => l.id === activity)!;
    const ml = Math.round(kg * level.mlPerKg / 50) * 50; // round to nearest 50ml
    setCalcResult(ml);
  }

  function applyCalculated() {
    if (calcResult === null) return;
    setGoalMl(calcResult);
    setShowCalculator(false);
    setCalcResult(null);
    setWeightInput('');
  }

  async function handleApplyReminders() {
    if (!remEnabled) {
      await cancelNotifications(Object.values(rem.notificationIds).map(Number));
      onSaveReminder({ enabled: false, times: [], notificationIds: {}, wakeHour, sleepHour, intervalMinutes: intervalMin, useInterval, smartMode });
      onToast(t('remindersCleared'));
      return;
    }
    setApplying(true);
    const granted = await requestPermission();
    if (!granted) { onToast(t('permissionDenied')); setApplying(false); return; }
    await cancelNotifications(Object.values(rem.notificationIds).map(Number));
    const finalTimes = useInterval ? generateTimes(wakeHour, sleepHour, intervalMin) : [...customTimes].sort();
    const notifIds = await scheduleWaterReminders(finalTimes, t('drinkReminder'), t('drinkReminderDesc'));
    onSaveReminder({ enabled: true, times: finalTimes, notificationIds: notifIds, wakeHour, sleepHour, intervalMinutes: intervalMin, useInterval, smartMode });
    setApplying(false);
    onToast(t('remindersScheduled'), `${finalTimes.length} reminders set`);
  }

  function addCustomTime() {
    if (!newTime || customTimes.includes(newTime)) return;
    setCustomTimes(prev => [...prev, newTime].sort());
    setNewTime('');
  }

  const itemV = {
    hidden:  { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <motion.div
      initial="hidden" animate="visible"
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
      className="space-y-5 py-4"
    >

      {/* ── Daily Goal ──────────────────────────────────────────────────── */}
      <motion.div variants={itemV}>
        <Card className="rounded-2xl">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target size={16} className="text-sky-500" />
              {t('dailyGoal')}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {/* Big display */}
            <div className="rounded-2xl bg-sky-500/5 border border-sky-500/15 p-4 text-center">
              <motion.p key={goalMl} initial={{ scale: 1.1 }} animate={{ scale: 1 }}
                className="text-4xl font-bold text-sky-500">
                {formatAmount(goalMl, unit)}
              </motion.p>
              <p className="text-xs text-muted-foreground mt-1">{t('dailyGoalDesc')}</p>
            </div>

            {/* Slider */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>500 ml</span><span>5 000 ml</span>
              </div>
              <Slider min={500} max={5000} step={50}
                value={[goalMl]}
                onValueChange={([v]) => setGoalMl(v)} />
            </div>

            {/* Presets */}
            <div className="grid grid-cols-1 gap-1.5">
              {GOAL_PRESETS.map(p => (
                <button key={p.ml} onClick={() => setGoalMl(p.ml)}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-all ${
                    goalMl === p.ml
                      ? 'bg-sky-500/10 border-sky-500/40 text-sky-600 dark:text-sky-400'
                      : 'border-border hover:border-sky-500/30 hover:bg-accent'
                  }`}
                >
                  <span>{t(p.labelKey)}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatAmount(p.ml, unit)}</span>
                    {goalMl === p.ml && <Check size={14} className="text-sky-500" />}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom input */}
            <Input
              type="number"
              placeholder={`${t('customGoal')} (ml)`}
              value={customGoalInput}
              onChange={e => {
                setCustomGoalInput(e.target.value);
                const n = parseInt(e.target.value);
                if (!isNaN(n) && n >= 200 && n <= 10000) setGoalMl(n);
              }}
            />

            {/* Calculator toggle */}
            <button
              onClick={() => setShowCalculator(s => !s)}
              className="flex items-center gap-2 text-sm text-sky-500 hover:text-sky-600 transition-colors w-full justify-center py-1"
            >
              <Calculator size={15} />
              Calculate by weight & activity
            </button>

            {/* Save button */}
            <Button
              onClick={handleSaveGoal}
              className={`w-full gap-2 font-semibold transition-all ${
                goalSaved
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-sky-500 hover:bg-sky-600 text-white'
              }`}
            >
              {goalSaved ? <><Check size={16} /> {t('goalSaved')}</> : t('setGoal')}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Weight Calculator ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCalculator && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            variants={itemV}
          >
            <Card className="rounded-2xl border-sky-500/20">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Scale size={15} className="text-sky-500" />
                  Hydration Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Based on body weight and activity level (WHO / sports medicine guidelines: 30–45 ml per kg/day).
                </p>

                {/* Weight input */}
                <div className="space-y-2">
                  <Label className="text-sm">Your weight</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="e.g. 70"
                      value={weightInput}
                      onChange={e => setWeightInput(e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex gap-1 p-0.5 bg-muted rounded-xl">
                      {(['kg', 'lbs'] as const).map(u => (
                        <button key={u} onClick={() => setWeightUnit(u)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            weightUnit === u ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                          }`}
                        >{u}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Activity level */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Activity size={13} /> Activity level
                  </Label>
                  <div className="space-y-1.5">
                    {ACTIVITY_LEVELS.map(level => (
                      <label key={level.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                          activity === level.id
                            ? 'border-sky-500/40 bg-sky-500/5'
                            : 'border-border hover:border-sky-500/20 hover:bg-accent/30'
                        }`}
                      >
                        <Checkbox
                          checked={activity === level.id}
                          onCheckedChange={() => setActivity(level.id)}
                          className="data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{level.label}</p>
                          <p className="text-xs text-muted-foreground">{level.desc}</p>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{level.mlPerKg} ml/kg</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Calculate button */}
                <Button
                  onClick={calculateGoal}
                  disabled={!weightInput || parseFloat(weightInput) <= 0}
                  variant="outline"
                  className="w-full gap-2 border-sky-500/30 text-sky-600 dark:text-sky-400"
                >
                  <Calculator size={15} /> Calculate
                </Button>

                {/* Result */}
                <AnimatePresence>
                  {calcResult !== null && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-3"
                    >
                      <div className="text-center">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">Recommended daily intake</p>
                        <p className="text-3xl font-bold text-emerald-500">{formatAmount(calcResult, unit)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {ACTIVITY_LEVELS.find(l => l.id === activity)?.label} · {weightInput} {weightUnit}
                        </p>
                      </div>
                      <Button
                        onClick={applyCalculated}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
                      >
                        <Check size={15} /> Use this as my goal
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reminder Schedule ────────────────────────────────────────────── */}
      <motion.div variants={itemV}>
        <Card className="rounded-2xl">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell size={16} className="text-sky-500" />
              {t('reminderSchedule')}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-5">

            {/* Enable toggle — using checkbox for RTL */}
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium">{t('reminderEnabled')}</p>
                <p className="text-xs text-muted-foreground">
                  {remEnabled ? `${previewTimes.length} reminder${previewTimes.length !== 1 ? 's' : ''} scheduled` : 'Off'}
                </p>
              </div>
              <Checkbox
                checked={remEnabled}
                onCheckedChange={v => setRemEnabled(Boolean(v))}
                className="w-5 h-5 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
              />
            </label>

            <AnimatePresence>
              {remEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  {/* Mode toggle */}
                  <div className="flex gap-1.5 p-1 bg-muted rounded-xl">
                    {[
                      { key: true,  label: t('useInterval'),  icon: Clock },
                      { key: false, label: t('customTimes'),  icon: Sparkles },
                    ].map(({ key, label, icon: Icon }) => (
                      <button key={String(key)} onClick={() => setUseInterval(key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          useInterval === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Icon size={12} /> {label}
                      </button>
                    ))}
                  </div>

                  {useInterval ? (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <Label>{t('reminderWake')}</Label>
                          <span className="font-mono font-medium">{pad(wakeHour)}:00</span>
                        </div>
                        <Slider min={4} max={12} step={1} value={[wakeHour]} onValueChange={([v]) => setWakeHour(v)} />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <Label>{t('reminderSleep')}</Label>
                          <span className="font-mono font-medium">{pad(sleepHour)}:00</span>
                        </div>
                        <Slider min={18} max={23} step={1} value={[sleepHour]} onValueChange={([v]) => setSleepHour(v)} />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <Label>{t('reminderInterval')}</Label>
                          <span className="font-mono font-medium">Every {intervalMin} min</span>
                        </div>
                        <Slider min={30} max={240} step={15} value={[intervalMin]} onValueChange={([v]) => setIntervalMin(v)} />
                      </div>
                      {/* Preview */}
                      <div className="rounded-xl bg-muted/50 border border-border px-3 py-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Preview ({previewTimes.length} reminders):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {previewTimes.slice(0, 12).map(t => (
                            <Badge key={t} variant="secondary" className="font-mono text-xs">{t}</Badge>
                          ))}
                          {previewTimes.length > 12 && (
                            <Badge variant="outline" className="text-xs">+{previewTimes.length - 12} more</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {customTimes.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">No times added yet</p>
                      )}
                      {customTimes.map(ct => (
                        <div key={ct} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border">
                          <span className="font-mono text-sm font-medium">{ct}</span>
                          <button onClick={() => setCustomTimes(prev => prev.filter(x => x !== ct))}
                            className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                          className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm font-mono" />
                        <Button size="sm" onClick={addCustomTime} variant="outline" className="gap-1">
                          <Plus size={14} /> {t('addReminderTime')}
                        </Button>
                      </div>
                      <button onClick={() => setCustomTimes(generateTimes(wakeHour, sleepHour, intervalMin))}
                        className="text-xs text-sky-500 hover:underline">
                        {t('generateTimes')} (every {intervalMin}min)
                      </button>
                    </div>
                  )}

                  {/* Smart mode checkbox */}
                  <label className="flex items-start gap-3 pt-1 border-t border-border cursor-pointer">
                    <Checkbox
                      checked={smartMode}
                      onCheckedChange={v => setSmartMode(Boolean(v))}
                      className="mt-0.5 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                    />
                    <div>
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <Zap size={13} className="text-amber-500" />
                        {t('smartReminders')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t('smartRemindersDesc')}</p>
                    </div>
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              onClick={handleApplyReminders}
              disabled={applying}
              className="w-full gap-2 font-semibold bg-sky-500 hover:bg-sky-600 text-white"
            >
              {remEnabled ? <Bell size={15} /> : <BellOff size={15} />}
              {applying ? 'Applying...' : t('applyReminders')}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

    </motion.div>
  );
}
