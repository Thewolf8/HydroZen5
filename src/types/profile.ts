export type ProfileColor =
  | 'blue'
  | 'emerald'
  | 'violet'
  | 'rose'
  | 'amber'
  | 'teal'
  | 'orange'
  | 'pink';

export const PROFILE_COLORS: ProfileColor[] = [
  'blue', 'emerald', 'violet', 'rose', 'amber', 'teal', 'orange', 'pink',
];

export const PROFILE_COLOR_CLASSES: Record<ProfileColor, string> = {
  blue:    'bg-blue-500',
  emerald: 'bg-emerald-500',
  violet:  'bg-violet-500',
  rose:    'bg-rose-500',
  amber:   'bg-amber-500',
  teal:    'bg-teal-500',
  orange:  'bg-orange-500',
  pink:    'bg-pink-500',
};

export interface Profile {
  id: string;
  name: string;
  color: ProfileColor;
  createdAt: string;
  /** Per-profile daily goal override (if null, use app default) */
  goalMlOverride: number | null;
}
