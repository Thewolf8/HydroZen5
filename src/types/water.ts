// ── Drink types ───────────────────────────────────────────────────────────────

export type DrinkTypeId =
  | 'water'
  | 'sparkling'
  | 'tea'
  | 'coffee'
  | 'juice'
  | 'sports'
  | 'milk'
  | 'herbal'
  | 'coconut'
  | 'smoothie'
  | 'soda'
  | 'other';

export interface DrinkType {
  id: DrinkTypeId;
  /** Hydration factor: 1.0 = fully hydrating, <1 = partial */
  hydrationFactor: number;
  /** Tailwind color class */
  color: string;
  /** Emoji for quick display */
  emoji: string;
}

export const DRINK_TYPES: DrinkType[] = [
  { id: 'water',     hydrationFactor: 1.00, color: 'text-sky-500',    emoji: '💧' },
  { id: 'sparkling', hydrationFactor: 1.00, color: 'text-cyan-400',   emoji: '🫧' },
  { id: 'tea',       hydrationFactor: 0.90, color: 'text-amber-600',  emoji: '🍵' },
  { id: 'coffee',    hydrationFactor: 0.80, color: 'text-stone-500',  emoji: '☕' },
  { id: 'juice',     hydrationFactor: 0.85, color: 'text-orange-400', emoji: '🍊' },
  { id: 'sports',    hydrationFactor: 0.95, color: 'text-lime-500',   emoji: '🏃' },
  { id: 'milk',      hydrationFactor: 0.90, color: 'text-slate-300',  emoji: '🥛' },
  { id: 'herbal',    hydrationFactor: 0.95, color: 'text-green-500',  emoji: '🌿' },
  { id: 'coconut',   hydrationFactor: 1.00, color: 'text-teal-400',   emoji: '🥥' },
  { id: 'smoothie',  hydrationFactor: 0.80, color: 'text-purple-400', emoji: '🥤' },
  { id: 'soda',      hydrationFactor: 0.70, color: 'text-rose-400',   emoji: '🥃' },
  { id: 'other',     hydrationFactor: 0.85, color: 'text-muted-foreground', emoji: '🫙' },
];

// ── Preset container sizes ────────────────────────────────────────────────────

export interface ContainerPreset {
  id: string;
  labelKey: string;
  ml: number;
  icon: string;
}

export const CONTAINER_PRESETS: ContainerPreset[] = [
  { id: 'espresso', labelKey: 'containerEspresso', ml: 30,   icon: '☕' },
  { id: 'small',    labelKey: 'containerSmall',    ml: 100,  icon: '🥃' },
  { id: 'cup',      labelKey: 'containerCup',      ml: 200,  icon: '🍶' },
  { id: 'glass',    labelKey: 'containerGlass',    ml: 250,  icon: '🥂' },
  { id: 'bottle',   labelKey: 'containerBottle',   ml: 500,  icon: '🍶' },
  { id: 'large',    labelKey: 'containerLarge',    ml: 750,  icon: '💧' },
  { id: 'xlarge',   labelKey: 'containerXLarge',   ml: 1000, icon: '🫙' },
];

// ── Core data models ──────────────────────────────────────────────────────────

export interface DrinkEntry {
  id: string;
  /** Amount in millilitres (always stored as ml, display can be oz) */
  amountMl: number;
  drinkType: DrinkTypeId;
  /** ISO datetime */
  timestamp: string;
  note?: string;
  /** Effective hydration = amountMl × hydrationFactor */
  effectiveMl: number;
}

export interface DailyLog {
  /** YYYY-MM-DD */
  date: string;
  entries: DrinkEntry[];
  /** Cached sum of effectiveMl */
  totalEffectiveMl: number;
  /** Cached sum of raw amountMl */
  totalMl: number;
  /** Whether the daily goal was met */
  goalMet: boolean;
}

// ── Streak / Achievement ──────────────────────────────────────────────────────

export interface Streak {
  current: number;
  best: number;
  /** ISO dates of goal-met days */
  metDates: string[];
}

// ── Weekly/Monthly stats ──────────────────────────────────────────────────────

export interface HydrationStats {
  todayMl: number;
  todayEffectiveMl: number;
  goalMl: number;
  goalPercent: number;
  remainingMl: number;
  streak: Streak;
  weekAvgMl: number;
  monthAvgMl: number;
  bestDayMl: number;
  totalDaysLogged: number;
  goalMetCount: number;
  /** Last 7 days (including today) */
  last7Days: { date: string; totalMl: number; goalMet: boolean }[];
}

// ── Settings ──────────────────────────────────────────────────────────────────

export type Unit = 'ml' | 'oz';
export type Language = 'en' | 'ar' | 'fr' | 'system';
export type Theme = 'dark' | 'light' | 'system';

export interface ReminderSchedule {
  enabled: boolean;
  /** 24h time strings e.g. ["08:00", "10:00", ...] */
  times: string[];
  /** Notification IDs keyed by time string */
  notificationIds: Record<string, number>;
  /** Smart mode: skip reminders if goal already met */
  smartMode: boolean;
  /** Wake hour - reminders start at this hour */
  wakeHour: number;
  /** Sleep hour - reminders stop after this hour */
  sleepHour: number;
  /** Interval in minutes between auto-generated reminders */
  intervalMinutes: number;
  /** Whether to use auto-interval or custom times */
  useInterval: boolean;
}

export interface NotificationPreferences {
  goalAchieved: boolean;
  streakReminder: boolean;
  morningMotivation: boolean;
  morningHour: number;
}

export interface AppSettings {
  unit: Unit;
  dailyGoalMl: number;
  language: Language;
  theme: Theme;
  animationsEnabled: boolean;
  reminder: ReminderSchedule;
  notifications: NotificationPreferences;
  showHydrationFactor: boolean;
  /** If true, coffee/soda reduce hydration score, otherwise all drinks count 1:1 */
  useHydrationFactors: boolean;
  /** Show motivational quotes on dashboard */
  showMotivation: boolean;
  /** Customizable container sizes (overrides defaults) */
  customContainers: { id: string; labelKey: string; ml: number; icon: string }[];
}

// ── Filters ───────────────────────────────────────────────────────────────────

export interface HistoryFilters {
  range: 'week' | 'month' | '3months' | 'year' | 'all';
  drinkType: DrinkTypeId | 'all';
}

// ── Export preferences ────────────────────────────────────────────────────────

export interface ExportPreferences {
  includeNotes: boolean;
  includeDrinkTypes: boolean;
  includeHydrationFactors: boolean;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

export interface ToastParams {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}
