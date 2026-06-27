import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, type TranslationKey } from './translations';
import type { Language } from '@/types/water';

type Locale = 'en' | 'ar' | 'fr';

interface I18nContextValue {
  locale: Locale;
  t: (key: TranslationKey) => string;
  setLanguage: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function resolveLocale(lang: Language): Locale {
  if (lang === 'system') {
    const nav = navigator.language.toLowerCase();
    if (nav.startsWith('ar')) return 'ar';
    if (nav.startsWith('fr')) return 'fr';
    return 'en';
  }
  if (lang === 'ar' || lang === 'fr') return lang;
  return 'en';
}

function applyRTL(locale: Locale) {
  const isRTL = locale === 'ar';
  document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', locale);
}

export function I18nProvider({ children, initialLanguage }: {
  children: React.ReactNode;
  initialLanguage: Language;
}) {
  const [locale, setLocale] = useState<Locale>(() => {
    const resolved = resolveLocale(initialLanguage);
    applyRTL(resolved);
    return resolved;
  });

  const setLanguage = useCallback((lang: Language) => {
    const resolved = resolveLocale(lang);
    setLocale(resolved);
    applyRTL(resolved);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return (translations[locale] as any)[key] ?? (translations.en as any)[key] ?? key;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, t, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
