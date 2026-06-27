import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import type { DailyLog, DrinkEntry } from '@/types/water';
import { DRINK_TYPES } from '@/types/water';

function drinkLabel(id: string) {
  return DRINK_TYPES.find(d => d.id === id)?.emoji + ' ' + id;
}

function mlToOz(ml: number) { return (ml * 0.033814).toFixed(1); }

// ── PDF ────────────────────────────────────────────────────────────────────

export async function exportToPDF(
  logs: DailyLog[],
  options: { unit: 'ml' | 'oz'; includeNotes: boolean; includeDrinkTypes: boolean },
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const u = options.unit;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(14, 165, 233); // sky-500
  doc.text('AquaFlow — Hydration Report', 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), 'PPP')}`, 14, 28);

  // Summary
  const totalMl = logs.reduce((s, l) => s + l.totalEffectiveMl, 0);
  const goalMet = logs.filter(l => l.goalMet).length;
  const avgMl = logs.length ? Math.round(totalMl / logs.length) : 0;

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Total: ${u === 'ml' ? totalMl + ' ml' : mlToOz(totalMl) + ' oz'}  |  Days: ${logs.length}  |  Goals met: ${goalMet}  |  Avg/day: ${u === 'ml' ? avgMl + ' ml' : mlToOz(avgMl) + ' oz'}`, 14, 38);

  // Table
  const head = ['Date', `Amount (${u})`, 'Goal Met'];
  if (options.includeDrinkTypes) head.splice(2, 0, 'Top Drink');
  if (options.includeNotes) head.push('Notes');

  const body = logs.map(log => {
    const row: (string | number)[] = [
      format(parseISO(log.date), 'PPP'),
      u === 'ml' ? log.totalEffectiveMl : mlToOz(log.totalEffectiveMl),
    ];
    if (options.includeDrinkTypes) {
      const top = log.entries.reduce<Record<string, number>>((acc, e) => {
        acc[e.drinkType] = (acc[e.drinkType] ?? 0) + e.amountMl;
        return acc;
      }, {});
      const topId = Object.entries(top).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
      row.push(drinkLabel(topId));
    }
    row.push(log.goalMet ? '✓' : '✗');
    if (options.includeNotes) {
      const notes = log.entries.map(e => e.note).filter(Boolean).join('; ');
      row.push(notes || '—');
    }
    return row;
  });

  (doc as any).autoTable({ head: [head], body, startY: 46, styles: { fontSize: 9 }, headStyles: { fillColor: [14, 165, 233] } });

  await saveAndSharePDF(doc, 'aquaflow-report.pdf');
}

// ── CSV ────────────────────────────────────────────────────────────────────

export async function exportToCSV(
  logs: DailyLog[],
  options: { unit: 'ml' | 'oz'; includeNotes: boolean; includeDrinkTypes: boolean },
) {
  const u = options.unit;
  const convert = (ml: number) => u === 'ml' ? ml : parseFloat(mlToOz(ml));
  const lines: string[] = [];

  lines.push(['Date', 'Time', `Amount (${u})`, 'Drink Type', 'Goal Met', 'Notes'].join(','));
  for (const log of logs) {
    for (const entry of log.entries) {
      const row = [
        format(parseISO(log.date), 'yyyy-MM-dd'),
        format(parseISO(entry.timestamp), 'HH:mm'),
        convert(entry.amountMl),
        options.includeDrinkTypes ? entry.drinkType : '',
        log.goalMet ? 'Yes' : 'No',
        options.includeNotes ? `"${(entry.note ?? '').replace(/"/g, '""')}"` : '',
      ];
      lines.push(row.join(','));
    }
  }

  const csv = lines.join('\n');
  await saveAndShareText(csv, 'aquaflow-export.csv', 'text/csv');
}

// ── JSON Backup ────────────────────────────────────────────────────────────

export async function exportToJSON(logs: DailyLog[]) {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'AquaFlow',
    logs,
  };
  const json = JSON.stringify(payload, null, 2);
  await saveAndShareText(json, 'aquaflow-backup.json', 'application/json');
}

export function parseJSONBackup(raw: string): DailyLog[] | null {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.logs)) return parsed.logs as DailyLog[];
    if (Array.isArray(parsed)) return parsed as DailyLog[];
  } catch {}
  return null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function saveAndSharePDF(doc: jsPDF, filename: string) {
  if (Capacitor.isNativePlatform()) {
    const b64 = doc.output('datauristring').split(',')[1];
    const { uri } = await Filesystem.writeFile({ path: filename, data: b64, directory: Directory.Cache });
    await Share.share({ title: 'AquaFlow Report', url: uri, dialogTitle: 'Share PDF' });
  } else {
    doc.save(filename);
  }
}

async function saveAndShareText(content: string, filename: string, mimeType: string) {
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({ path: filename, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: 'AquaFlow Data', url: uri, dialogTitle: 'Share File' });
  } else {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ── Auto backup ────────────────────────────────────────────────────────────

const BACKUP_KEY = 'aquaflow-auto-backup';

export async function writeAutoBackup(logs: DailyLog[]): Promise<boolean> {
  try {
    const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), logs });
    if (Capacitor.isNativePlatform()) {
      await Filesystem.writeFile({ path: 'aquaflow-autobackup.json', data: payload, directory: Directory.Documents, encoding: Encoding.UTF8 });
    } else {
      localStorage.setItem(BACKUP_KEY, payload);
    }
    return true;
  } catch { return false; }
}

export async function readAutoBackup(): Promise<DailyLog[] | null> {
  try {
    let raw: string;
    if (Capacitor.isNativePlatform()) {
      const { data } = await Filesystem.readFile({ path: 'aquaflow-autobackup.json', directory: Directory.Documents, encoding: Encoding.UTF8 });
      raw = data as string;
    } else {
      raw = localStorage.getItem(BACKUP_KEY) ?? '';
    }
    return parseJSONBackup(raw);
  } catch { return null; }
}
