import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import type { DailyLog } from '@/types/water';
import { DRINK_TYPES } from '@/types/water';

function drinkEmoji(id: string) {
  return DRINK_TYPES.find(d => d.id === id)?.emoji ?? '💧';
}

function mlToOz(ml: number) { return (ml * 0.033814).toFixed(1); }

// ── PDF ────────────────────────────────────────────────────────────────────

export async function exportToPDF(
  logs: DailyLog[],
  options: { unit: 'ml' | 'oz'; includeNotes: boolean; includeDrinkTypes: boolean },
) {
  const u = options.unit;
  const conv = (ml: number) => u === 'oz' ? `${mlToOz(ml)} oz` : `${ml} ml`;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  // Header
  doc.setFontSize(22);
  doc.setTextColor(14, 165, 233);
  doc.text('AquaFlow — Hydration Report', 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generated: ${format(new Date(), 'PPP')}`, 14, 28);
  doc.setDrawColor(14, 165, 233);
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);

  // Summary row
  const totalMl  = logs.reduce((s, l) => s + l.totalEffectiveMl, 0);
  const goalMet  = logs.filter(l => l.goalMet).length;
  const avgMl    = logs.length ? Math.round(totalMl / logs.length) : 0;

  doc.setFontSize(10);
  doc.setTextColor(40);
  doc.text(
    `Total: ${conv(totalMl)}   |   Days logged: ${logs.length}   |   Goals met: ${goalMet}   |   Avg / day: ${conv(avgMl)}`,
    14, 40,
  );

  // Build table
  const head: string[][] = [['Date', `Amount (${u})`, 'Goal']];
  if (options.includeDrinkTypes) head[0].splice(2, 0, 'Top Drink');
  if (options.includeNotes)      head[0].push('Notes');

  const body: (string | number)[][] = logs.map(log => {
    const row: (string | number)[] = [
      format(parseISO(log.date), 'PPP'),
      conv(log.totalEffectiveMl),
    ];
    if (options.includeDrinkTypes) {
      const top = log.entries.reduce<Record<string, number>>((acc, e) => {
        acc[e.drinkType] = (acc[e.drinkType] ?? 0) + e.amountMl;
        return acc;
      }, {});
      const topId = Object.entries(top).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
      row.push(`${drinkEmoji(topId)} ${topId}`);
    }
    row.push(log.goalMet ? '✓' : '✗');
    if (options.includeNotes) {
      row.push(log.entries.map(e => e.note).filter(Boolean).join('; ') || '—');
    }
    return row;
  });

  // Use autoTable as a FUNCTION (jspdf-autotable v5 API)
  autoTable(doc, {
    head,
    body,
    startY: 48,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 250, 255] },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' } },
  });

  await saveAndSharePDF(doc, 'aquaflow-report.pdf');
}

// ── CSV ────────────────────────────────────────────────────────────────────

export async function exportToCSV(
  logs: DailyLog[],
  options: { unit: 'ml' | 'oz'; includeNotes: boolean; includeDrinkTypes: boolean },
) {
  const u = options.unit;
  const conv = (ml: number) => u === 'oz' ? parseFloat(mlToOz(ml)) : ml;

  const lines: string[] = [];
  lines.push(['Date', 'Time', `Amount (${u})`, 'Effective', 'Drink Type', 'Goal Met', 'Notes']
    .filter((_, i) => {
      if (i === 4) return options.includeDrinkTypes;
      if (i === 6) return options.includeNotes;
      return true;
    })
    .join(','));

  for (const log of logs.sort((a, b) => a.date.localeCompare(b.date))) {
    for (const entry of log.entries) {
      const cols = [
        format(parseISO(log.date), 'yyyy-MM-dd'),
        format(parseISO(entry.timestamp), 'HH:mm'),
        conv(entry.amountMl),
        conv(entry.effectiveMl),
        options.includeDrinkTypes ? entry.drinkType : undefined,
        log.goalMet ? 'Yes' : 'No',
        options.includeNotes ? `"${(entry.note ?? '').replace(/"/g, '""')}"` : undefined,
      ].filter(v => v !== undefined);
      lines.push(cols.join(','));
    }
  }

  await saveAndShareText(lines.join('\n'), 'aquaflow-export.csv', 'text/csv');
}

// ── JSON Backup ────────────────────────────────────────────────────────────

export async function exportToJSON(logs: DailyLog[]) {
  const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), app: 'AquaFlow', logs }, null, 2);
  await saveAndShareText(payload, 'aquaflow-backup.json', 'application/json');
}

export function parseJSONBackup(raw: string): DailyLog[] | null {
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p.logs)) return p.logs as DailyLog[];
    if (Array.isArray(p))      return p as DailyLog[];
  } catch {}
  return null;
}

// ── Auto backup ────────────────────────────────────────────────────────────

export async function writeAutoBackup(logs: DailyLog[]): Promise<boolean> {
  try {
    const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), logs });
    if (Capacitor.isNativePlatform()) {
      await Filesystem.writeFile({ path: 'aquaflow-autobackup.json', data: payload, directory: Directory.Documents, encoding: Encoding.UTF8 });
    } else {
      localStorage.setItem('aquaflow-auto-backup', payload);
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
      raw = localStorage.getItem('aquaflow-auto-backup') ?? '';
    }
    return parseJSONBackup(raw);
  } catch { return null; }
}

// ── File helpers ───────────────────────────────────────────────────────────

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
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
}
