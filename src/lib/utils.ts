import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function mlToOz(ml: number) { return parseFloat((ml * 0.033814).toFixed(1)); }
export function ozToMl(oz: number) { return Math.round(oz / 0.033814); }

export function formatAmount(ml: number, unit: 'ml' | 'oz'): string {
  if (unit === 'oz') return `${mlToOz(ml)} oz`;
  if (ml >= 1000) return `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1)} L`;
  return `${ml} ml`;
}
