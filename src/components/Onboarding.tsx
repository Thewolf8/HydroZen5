import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, Bell, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/i18n/I18nContext';
import { useProfile } from '@/context/ProfileContext';
import { PROFILE_COLORS, PROFILE_COLOR_CLASSES, type ProfileColor } from '@/types/profile';

export const ONBOARDED_KEY = 'aquaflow-onboarded';

const GOAL_PRESETS = [1500, 2000, 2500, 3000, 3500];

interface OnboardingProps { onComplete: () => void; }

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { t } = useI18n();
  const { activeProfile, renameProfile } = useProfile();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [selectedGoal, setSelectedGoal] = useState(2000);
  const [profileName, setProfileName] = useState('');
  const [selectedColor, setSelectedColor] = useState<ProfileColor>('blue');

  const totalSteps = 4;
  const isLast = step === totalSteps - 1;

  const finish = useCallback(() => {
    if (profileName.trim()) renameProfile(activeProfile.id, profileName.trim());
    try {
      const s = JSON.parse(localStorage.getItem('aquaflow-settings') || '{}');
      localStorage.setItem('aquaflow-settings', JSON.stringify({ ...s, dailyGoalMl: selectedGoal }));
    } catch {}
    localStorage.setItem(ONBOARDED_KEY, 'true');
    onComplete();
  }, [profileName, activeProfile, renameProfile, selectedGoal, onComplete]);

  const advance = () => {
    if (isLast) { finish(); return; }
    setDirection(1);
    setStep(s => s + 1);
  };
  const back = () => { if (step > 0) { setDirection(-1); setStep(s => s - 1); } };
  const skip = () => { localStorage.setItem(ONBOARDED_KEY, 'true'); onComplete(); };

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 60 : -60 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60 }),
  };

  const slides = [
    {
      id: 'welcome',
      illustration: (
        <div className="relative flex items-center justify-center w-full h-48">
          <div className="w-28 h-28 rounded-[28px] bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shadow-lg">
            <Droplets className="w-14 h-14 text-sky-500" />
          </div>
          {['💧','🫧','🥤','💙'].map((e, i) => (
            <motion.div key={i} className="absolute text-2xl"
              animate={{ y: [0,-8,0] }} transition={{ duration: 2+i*0.4, repeat: Infinity, delay: i*0.5 }}
              style={{ top: i<2 ? (i===0?'10%':'18%') : '62%', left: i%2===0 ? (i===0?'10%':'52%') : (i===1?'68%':'22%') }}
            >{e}</motion.div>
          ))}
        </div>
      ),
      title: t('onboardingWelcomeTitle'),
      desc: t('onboardingWelcomeDesc'),
      extra: null,
    },
    {
      id: 'goal',
      illustration: (
        <div className="flex flex-col items-center justify-center w-full h-48 gap-3">
          <div className="w-28 h-28 rounded-full border-8 border-sky-500/20 flex items-center justify-center relative overflow-hidden">
            <motion.div className="absolute bottom-0 left-0 right-0 bg-sky-500/30 rounded-b-full"
              initial={{ height: '0%' }} animate={{ height: '65%' }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
            <span className="relative text-2xl font-bold text-sky-500">2L</span>
          </div>
        </div>
      ),
      title: t('onboardingGoalTitle'),
      desc: t('onboardingGoalDesc'),
      extra: (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {GOAL_PRESETS.map(ml => (
              <button key={ml} onClick={() => setSelectedGoal(ml)}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  selectedGoal === ml
                    ? 'bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-500/30'
                    : 'border-border text-muted-foreground hover:border-sky-500/50 hover:text-sky-500'
                }`}
              >
                {(ml/1000).toFixed(1)} L
              </button>
            ))}
          </div>
          <p className="text-xs text-center text-muted-foreground">Recommended: 2.0 L for most adults</p>
        </div>
      ),
    },
    {
      id: 'reminders',
      illustration: (
        <div className="flex flex-col items-center justify-center w-full h-48 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <Bell className="w-7 h-7 text-sky-500" />
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {['08:00','10:00','12:00','14:00','16:00','18:00'].map((t, i) => (
              <motion.div key={t} initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} transition={{ delay: i*0.1 }}
                className="px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-xs text-sky-500 font-mono font-medium flex items-center gap-1"
              >
                <Droplets size={9} /> {t}
              </motion.div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Smart mode stops when goal is met ✓</p>
        </div>
      ),
      title: t('onboardingReminderTitle'),
      desc: t('onboardingReminderDesc'),
      extra: null,
    },
    {
      id: 'done',
      illustration: (
        <div className="flex flex-col items-center justify-center w-full h-48 gap-4">
          <motion.div className="w-24 h-24 rounded-full bg-emerald-500/10 border-4 border-emerald-500 flex items-center justify-center"
            initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:300, damping:20 }}
          >
            <Check className="w-12 h-12 text-emerald-500" />
          </motion.div>
          <div className="flex gap-3 text-2xl">
            {['💧','✨','🎉'].map((e, i) => (
              <motion.span key={i} animate={{ y:[0,-10,0] }} transition={{ duration:1, repeat:Infinity, delay:i*0.3 }}>{e}</motion.span>
            ))}
          </div>
        </div>
      ),
      title: t('onboardingDoneTitle'),
      desc: t('onboardingDoneDesc'),
      extra: (
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">{t('yourName')}</Label>
            <Input value={profileName} onChange={e => setProfileName(e.target.value)}
              placeholder="e.g. Alex" className="mt-1" maxLength={32} />
          </div>
          <div>
            <Label className="text-sm font-medium">{t('profileColor')}</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {PROFILE_COLORS.map(c => (
                <button key={c} onClick={() => setSelectedColor(c)}
                  className={`w-8 h-8 rounded-full ${PROFILE_COLOR_CLASSES[c]} flex items-center justify-center transition-all ${
                    selectedColor === c ? 'ring-2 ring-offset-2 ring-sky-500 ring-offset-background scale-110' : ''
                  }`}
                >
                  {selectedColor === c && <Check size={14} className="text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ];

  const current = slides[step];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <motion.div key={i} animate={{ width: i === step ? 24 : 8, opacity: i === step ? 1 : 0.3 }}
              className="h-2 rounded-full bg-sky-500" />
          ))}
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div key={current.id} custom={direction} variants={variants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {current.illustration}
            <div className="mt-6 text-center space-y-2">
              <h1 className="text-2xl font-bold">{current.title}</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">{current.desc}</p>
            </div>
            {current.extra && <div className="mt-5">{current.extra}</div>}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-3 mt-8">
          {step > 0 && (
            <Button variant="outline" onClick={back} className="flex-none px-3">
              <ChevronLeft size={18} />
            </Button>
          )}
          <Button onClick={advance}
            className="flex-1 bg-sky-500 hover:bg-sky-600 text-white gap-2 font-semibold"
          >
            {isLast ? t('getStarted') : t('next')}
            {!isLast && <ChevronRight size={16} />}
          </Button>
        </div>

        {step < slides.length - 1 && (
          <button onClick={skip}
            className="w-full text-center text-xs text-muted-foreground mt-4 hover:text-foreground transition-colors py-2"
          >
            {t('skip')}
          </button>
        )}
      </div>
    </div>
  );
}
