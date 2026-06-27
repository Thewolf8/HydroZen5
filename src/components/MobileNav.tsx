import { motion } from 'framer-motion';
import { LayoutDashboard, PlusCircle, History, Target, Settings, Download, Droplets } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import type { Page } from '@/App';

interface MobileNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onAddNew: () => void;
}

export default function MobileNav({ currentPage, onNavigate, onAddNew }: MobileNavProps) {
  const { t } = useI18n();

  const navItems: { page: Page; labelKey: string; icon: typeof LayoutDashboard }[] = [
    { page: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
    { page: 'log',       labelKey: 'log',       icon: PlusCircle },
    { page: 'history',   labelKey: 'history',   icon: History },
    { page: 'goals',     labelKey: 'goals',     icon: Target },
    { page: 'export',    labelKey: 'export',    icon: Download },
    { page: 'settings',  labelKey: 'settings',  icon: Settings },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border md:hidden">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;
            const isLog = item.page === 'log';

            return (
              <button
                key={item.page}
                onClick={() => isLog ? onAddNew() : onNavigate(item.page)}
                className={`relative flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${
                  isActive ? 'text-sky-500' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -top-px left-1/4 right-1/4 h-0.5 bg-sky-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <div className={`transition-all duration-200 ${
                  isLog
                    ? 'bg-sky-500 text-white rounded-xl p-2 shadow-md shadow-sky-500/30'
                    : isActive
                    ? 'p-1.5 rounded-xl bg-sky-500/10'
                    : 'p-1.5 rounded-xl'
                }`}>
                  <Icon size={isLog ? 22 : 18} />
                </div>
                <span className="text-[9px] mt-0.5 leading-tight">{t(item.labelKey as any)}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Side Navigation */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex-col z-40">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Droplets className="w-5 h-5 text-sky-500" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">{t('appName')}</h1>
              <p className="text-xs text-muted-foreground">{t('tagline')}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 space-y-1">
          {navItems.filter(item => item.page !== 'log').map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={`relative flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-sky-500/10 text-sky-500'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="desktopActiveTab"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-sky-500 rounded-r-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon size={18} />
                {t(item.labelKey as any)}
              </button>
            );
          })}
        </div>

        <div className="p-4">
          <button
            onClick={onAddNew}
            className="flex items-center justify-center gap-2 w-full py-3 bg-sky-500 text-white rounded-xl font-medium hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/20"
          >
            <PlusCircle size={18} />
            {t('addDrink')}
          </button>
        </div>
      </nav>

      <div className="hidden md:block w-64" />
    </>
  );
}
