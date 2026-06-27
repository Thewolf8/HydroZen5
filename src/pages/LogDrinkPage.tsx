import { useState } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Minus, Plus, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/i18n/I18nContext';
import { DRINK_TYPES, CONTAINER_PRESETS, type DrinkTypeId } from '@/types/water';
import type { Unit } from '@/types/water';
import { formatAmount, mlToOz, ozToMl } from '@/lib/utils';

interface LogDrinkPageProps {
  unit: Unit;
  useHydrationFactors: boolean;
  showHydrationFactor: boolean;
  onSave: (amountMl: number, drinkType: DrinkTypeId, note?: string) => void;
  onCancel: () => void;
}

export default function LogDrinkPage({
  unit, useHydrationFactors, showHydrationFactor, onSave, onCancel,
}: LogDrinkPageProps) {
  const { t } = useI18n();

  const [selectedType, setSelectedType] = useState<DrinkTypeId>('water');
  const [amountMl, setAmountMl] = useState(250);
  const [customInput, setCustomInput] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const drinkInfo = DRINK_TYPES.find(d => d.id === selectedType)!;
  const effectiveMl = useHydrationFactors
    ? Math.round(amountMl * drinkInfo.hydrationFactor)
    : amountMl;

  const displayAmount = unit === 'oz' ? mlToOz(amountMl) : amountMl;
  const displayUnit = unit === 'oz' ? 'fl oz' : 'ml';

  function applyPreset(ml: number) {
    setAmountMl(ml);
    setUseCustom(false);
    setCustomInput('');
  }

  function applyCustom(raw: string) {
    setCustomInput(raw);
    const n = parseFloat(raw);
    if (!isNaN(n) && n > 0) {
      const ml = unit === 'oz' ? ozToMl(n) : Math.round(n);
      setAmountMl(Math.min(ml, 5000));
    }
  }

  function stepAmount(delta: number) {
    const step = unit === 'oz' ? ozToMl(1) : 50;
    setAmountMl(prev => Math.max(10, Math.min(5000, prev + delta * step)));
    setUseCustom(false);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => {
      onSave(amountMl, selectedType, note.trim() || undefined);
      setSaved(false);
    }, 400);
  }

  const itemV = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <motion.div
      initial="hidden" animate="visible"
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
      className="space-y-5 py-4 max-w-lg mx-auto"
    >
      {/* ── Amount selector ──────────────────────────────────────── */}
      <motion.div variants={itemV}>
        <Card className="rounded-2xl">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">{t('amount')}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {/* Big display + stepper */}
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => stepAmount(-1)}
                className="w-12 h-12 rounded-xl border border-border flex items-center justify-center hover:bg-accent transition-colors active:scale-95">
                <Minus size={20} />
              </button>
              <div className="flex-1 text-center">
                <motion.p
                  key={amountMl}
                  initial={{ scale: 1.15, color: '#0ea5e9' }}
                  animate={{ scale: 1, color: 'currentColor' }}
                  transition={{ duration: 0.2 }}
                  className="text-4xl font-bold tabular-nums"
                >
                  {unit === 'oz' ? mlToOz(amountMl) : amountMl}
                </motion.p>
                <p className="text-sm text-muted-foreground">{displayUnit}</p>
              </div>
              <button onClick={() => stepAmount(1)}
                className="w-12 h-12 rounded-xl border border-border flex items-center justify-center hover:bg-accent transition-colors active:scale-95">
                <Plus size={20} />
              </button>
            </div>

            {/* Preset buttons */}
            <div className="grid grid-cols-4 gap-2">
              {CONTAINER_PRESETS.map(p => {
                const isActive = !useCustom && amountMl === p.ml;
                return (
                  <motion.button
                    key={p.id}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => applyPreset(p.ml)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-500/25'
                        : 'border-border hover:border-sky-500/40 hover:bg-sky-500/5 text-muted-foreground'
                    }`}
                  >
                    <span className="text-base">{p.icon}</span>
                    <span>{formatAmount(p.ml, unit)}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Custom input */}
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={`${t('customAmount')} (${displayUnit})`}
                value={customInput}
                onChange={e => { setUseCustom(true); applyCustom(e.target.value); }}
                onFocus={() => setUseCustom(true)}
                className={useCustom ? 'border-sky-500 ring-1 ring-sky-500/30' : ''}
              />
            </div>

            {/* Hydration factor info */}
            {showHydrationFactor && useHydrationFactors && drinkInfo.hydrationFactor < 1 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs space-y-0.5"
              >
                <p className="text-amber-600 dark:text-amber-400 font-medium">
                  {t('hydrationFactor')}: {drinkInfo.hydrationFactor * 100}%
                </p>
                <p className="text-muted-foreground">
                  {t('effectiveHydration')}: <strong>{formatAmount(effectiveMl, unit)}</strong>
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Drink type ───────────────────────────────────────────── */}
      <motion.div variants={itemV}>
        <Card className="rounded-2xl">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">{t('drinkType')}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {DRINK_TYPES.map(dt => {
                const isActive = selectedType === dt.id;
                return (
                  <motion.button
                    key={dt.id}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setSelectedType(dt.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-sky-500/10 border-sky-500/40 text-sky-600 dark:text-sky-400'
                        : 'border-border hover:border-sky-500/30 hover:bg-accent text-muted-foreground'
                    }`}
                  >
                    <span className="text-xl">{dt.emoji}</span>
                    <span className="capitalize leading-none text-center">{t(dt.id as any)}</span>
                    {isActive && (
                      <motion.div
                        layoutId="drinkTypeIndicator"
                        className="w-1.5 h-1.5 rounded-full bg-sky-500"
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Note ─────────────────────────────────────────────────── */}
      <motion.div variants={itemV}>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">{t('note')} <span className="text-muted-foreground font-normal text-xs">({t('optional')})</span></CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('noteOptional')}
              rows={2}
              maxLength={200}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Summary card ─────────────────────────────────────────── */}
      <motion.div variants={itemV}>
        <div className="rounded-2xl bg-gradient-to-br from-sky-500/10 to-cyan-500/5 border border-sky-500/20 px-4 py-3 flex items-center gap-3">
          <span className="text-3xl">{drinkInfo.emoji}</span>
          <div className="flex-1">
            <p className="font-semibold capitalize">{t(selectedType as any)}</p>
            <p className="text-sm text-muted-foreground">
              {formatAmount(amountMl, unit)}
              {useHydrationFactors && drinkInfo.hydrationFactor < 1 && (
                <> → <span className="text-sky-500 font-medium">{formatAmount(effectiveMl, unit)}</span> effective</>
              )}
            </p>
          </div>
          <Droplets size={20} className="text-sky-500 flex-none" />
        </div>
      </motion.div>

      {/* ── Actions ──────────────────────────────────────────────── */}
      <motion.div variants={itemV} className="flex gap-3 pb-4">
        <Button variant="outline" onClick={onCancel} className="flex-none px-6">
          {t('cancel')}
        </Button>
        <motion.div className="flex-1" whileTap={{ scale: 0.97 }}>
          <Button
            onClick={handleSave}
            disabled={saved}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white gap-2 font-semibold h-12"
          >
            {saved ? (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                <Check size={18} /> Saved!
              </motion.span>
            ) : (
              <><Droplets size={18} /> {t('saveDrink')}</>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
