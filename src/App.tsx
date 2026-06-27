import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { I18nProvider } from '@/i18n/I18nContext';
import { ProfileProvider } from '@/context/ProfileContext';
import { useSettings } from '@/hooks/useSettings';
import { useWaterLogs } from '@/hooks/useWaterLogs';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import Onboarding, { ONBOARDED_KEY } from '@/components/Onboarding';
import DashboardPage from '@/pages/DashboardPage';
import LogDrinkPage from '@/pages/LogDrinkPage';
import HistoryPage from '@/pages/HistoryPage';
import GoalsPage from '@/pages/GoalsPage';
import ExportPage from '@/pages/ExportPage';
import SettingsPage from '@/pages/SettingsPage';
import type { DrinkTypeId } from '@/types/water';
import { scheduleGoalAchievedNotification } from '@/services/notificationService';
import './App.css';

export type Page = 'dashboard' | 'log' | 'history' | 'goals' | 'export' | 'settings';

function AppInner() {
  const { settings, setDailyGoal, setReminder, updateSettings } = useSettings();

  // Pass goalMl directly so useWaterLogs reruns stats when it changes
  const {
    logs, todayLog, stats,
    addDrink, deleteEntry, clearAll, resetData, importLogs,
  } = useWaterLogs(settings.dailyGoalMl, settings.useHydrationFactors);

  const [page, setPage]           = useState<Page>('dashboard');
  const [prevGoalMet, setPrevGoalMet] = useState(false);

  const showToast = useCallback((msg: string, desc?: string) => {
    toast(msg, desc ? { description: desc } : undefined);
  }, []);

  // Goal-achieved notification
  useEffect(() => {
    const nowMet = stats.goalPercent >= 100;
    if (nowMet && !prevGoalMet && settings.notifications.goalAchieved) {
      scheduleGoalAchievedNotification('🎉 Goal achieved!', "You've hit your daily hydration target!");
      toast.success('🎉 Daily goal reached!', { description: 'Keep it up!' });
    }
    setPrevGoalMet(nowMet);
  }, [stats.goalPercent]);  // eslint-disable-line

  function handleAddDrink(amountMl: number, drinkType: string, note?: string) {
    addDrink(amountMl, drinkType as DrinkTypeId, note);
    toast.success('💧 Drink logged!', { description: `+${amountMl} ml added` });
    setPage('dashboard');
  }

  function handleQuickAdd(amountMl: number, drinkType: string) {
    addDrink(amountMl, drinkType as DrinkTypeId);
    toast.success('💧 Drink logged!', { description: `+${amountMl} ml` });
  }

  const pageVariants = {
    hidden:  { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
    exit:    { opacity: 0, y: -6, transition: { duration: 0.15 } },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header currentPage={page} />
      <MobileNav currentPage={page} onNavigate={setPage} onAddNew={() => setPage('log')} />

      <main className="md:ml-64 pt-16 pb-20 md:pb-4 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <AnimatePresence mode="wait">
            <motion.div key={page} variants={pageVariants} initial="hidden" animate="visible" exit="exit">

              {page === 'dashboard' && (
                <DashboardPage
                  stats={stats}
                  unit={settings.unit}
                  onQuickAdd={handleQuickAdd}
                  onNavigate={setPage}
                  onDelete={id => { deleteEntry(id); showToast('Entry deleted'); }}
                  recentEntries={todayLog.entries.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp))}
                  showMotivation={settings.showMotivation}
                />
              )}

              {page === 'log' && (
                <LogDrinkPage
                  unit={settings.unit}
                  useHydrationFactors={settings.useHydrationFactors}
                  showHydrationFactor={settings.showHydrationFactor}
                  onSave={handleAddDrink}
                  onCancel={() => setPage('dashboard')}
                />
              )}

              {page === 'history' && (
                <HistoryPage
                  logs={logs}
                  stats={stats}
                  unit={settings.unit}
                  goalMl={settings.dailyGoalMl}
                  onDelete={id => { deleteEntry(id); showToast('Entry deleted'); }}
                  onClearAll={() => { clearAll(); showToast('History cleared'); }}
                />
              )}

              {page === 'goals' && (
                <GoalsPage
                  settings={settings}
                  unit={settings.unit}
                  onSaveGoal={ml => setDailyGoal(ml)}
                  onSaveReminder={patch => setReminder(patch)}
                  onToast={showToast}
                />
              )}

              {page === 'export' && (
                <ExportPage
                  logs={logs}
                  unit={settings.unit}
                  onImport={(incoming, merge) => { importLogs(incoming, merge); showToast('Data imported!'); }}
                  onToast={showToast}
                />
              )}

              {page === 'settings' && (
                <SettingsPage
                  settings={settings}
                  onUpdate={updateSettings}
                  onResetData={() => { resetData(); showToast('All data cleared'); }}
                  onToast={showToast}
                />
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const { settings } = useSettings();
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem(ONBOARDED_KEY) === 'true');

  if (!onboarded) {
    return (
      <I18nProvider initialLanguage={settings.language}>
        <ProfileProvider>
          <Onboarding onComplete={() => setOnboarded(true)} />
        </ProfileProvider>
      </I18nProvider>
    );
  }

  return (
    <I18nProvider initialLanguage={settings.language}>
      <ProfileProvider>
        <AppInner />
      </ProfileProvider>
    </I18nProvider>
  );
}
