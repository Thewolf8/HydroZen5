import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Users } from 'lucide-react';
import { useProfile } from '@/context/ProfileContext';
import { PROFILE_COLOR_CLASSES } from '@/types/profile';
import { useI18n } from '@/i18n/I18nContext';

export default function ProfileSwitcher() {
  const { profiles, activeProfile, switchProfile } = useProfile();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  if (profiles.length <= 1) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border hover:border-sky-500/40 hover:bg-sky-500/5 transition-all"
      >
        <div className={`w-6 h-6 rounded-full ${PROFILE_COLOR_CLASSES[activeProfile.color]} flex items-center justify-center text-white text-xs font-bold`}>
          {activeProfile.name[0].toUpperCase()}
        </div>
        <span className="text-sm font-medium max-w-[80px] truncate">{activeProfile.name}</span>
        <ChevronDown size={13} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-border bg-card shadow-xl shadow-black/10 z-50 overflow-hidden"
            >
              <div className="p-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                  {t('switchProfile')}
                </p>
                {profiles.map(p => {
                  const isActive = p.id === activeProfile.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { switchProfile(p.id); setOpen(false); }}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm transition-colors ${
                        isActive ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'hover:bg-accent'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full ${PROFILE_COLOR_CLASSES[p.color]} flex items-center justify-center text-white text-xs font-bold flex-none`}>
                        {p.name[0].toUpperCase()}
                      </div>
                      <span className="flex-1 text-left font-medium truncate">{p.name}</span>
                      {isActive && <Check size={14} className="flex-none" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
