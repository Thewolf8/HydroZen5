import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, FileSpreadsheet, Archive, Download, Upload,
  Clock, CheckCircle2, AlertCircle, Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/i18n/I18nContext';
import type { DailyLog, Unit } from '@/types/water';
import { format, subDays } from 'date-fns';
import {
  exportToPDF, exportToCSV, exportToJSON,
  parseJSONBackup, writeAutoBackup, readAutoBackup,
} from '@/services/exportService';

type ExportRange = 'all' | '7d' | '30d';

interface ExportPageProps {
  logs: DailyLog[];
  unit: Unit;
  onImport: (logs: DailyLog[], merge: boolean) => void;
  onToast: (msg: string, desc?: string) => void;
}

export default function ExportPage({ logs, unit, onImport, onToast }: ExportPageProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [range,              setRange]              = useState<ExportRange>('all');
  const [includeNotes,       setIncludeNotes]       = useState(true);
  const [includeDrinkTypes,  setIncludeDrinkTypes]  = useState(true);
  const [includeFactors,     setIncludeFactors]     = useState(false);
  const [exporting,          setExporting]          = useState<string | null>(null);
  const [backupStatus,       setBackupStatus]       = useState<'idle' | 'ok' | 'err'>('idle');
  const [lastBackupTime,     setLastBackupTime]     = useState<string | null>(
    () => localStorage.getItem('aquaflow-last-backup')
  );

  function filterLogs(): DailyLog[] {
    if (range === 'all') return logs;
    const cutoff = subDays(new Date(), range === '7d' ? 7 : 30);
    return logs.filter(l => new Date(l.date) >= cutoff);
  }

  async function doExport(type: 'pdf' | 'csv' | 'json') {
    setExporting(type);
    const filtered = filterLogs();
    const opts = { unit, includeNotes, includeDrinkTypes, includeHydrationFactors: includeFactors };
    try {
      if (type === 'pdf')  await exportToPDF(filtered, opts);
      if (type === 'csv')  await exportToCSV(filtered, opts);
      if (type === 'json') await exportToJSON(filtered);
      onToast(t('exportSuccess'), `${filtered.length} days exported`);
    } catch (e) {
      onToast(t('exportFailed'), String(e));
    } finally {
      setExporting(null);
    }
  }

  async function doBackup() {
    setBackupStatus('idle');
    const ok = await writeAutoBackup(logs);
    if (ok) {
      const ts = new Date().toLocaleString();
      localStorage.setItem('aquaflow-last-backup', ts);
      setLastBackupTime(ts);
      setBackupStatus('ok');
      onToast(t('backupSuccess'));
    } else {
      setBackupStatus('err');
      onToast(t('backupFailed'));
    }
  }

  async function doRestore() {
    const restored = await readAutoBackup();
    if (restored) {
      onImport(restored, false);
      onToast(t('backupRestoreSuccess'), `${restored.length} days restored`);
    } else {
      onToast(t('backupRestoreNotFound'));
    }
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const raw = ev.target?.result as string;
      const parsed = parseJSONBackup(raw);
      if (parsed) {
        onImport(parsed, true);
        onToast(t('backupRestoreSuccess'), `${parsed.length} days imported`);
      } else {
        onToast(t('error'), 'Invalid backup file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const itemV = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  const exportButtons = [
    {
      id: 'pdf',
      icon: FileText,
      label: t('exportPDF'),
      desc: 'Formatted hydration report',
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      btnClass: 'bg-rose-500 hover:bg-rose-600 text-white',
    },
    {
      id: 'csv',
      icon: FileSpreadsheet,
      label: t('exportCSV'),
      desc: 'Spreadsheet-compatible data',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      btnClass: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    },
    {
      id: 'json',
      icon: Archive,
      label: t('exportJSON'),
      desc: 'Full backup for reimport',
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      btnClass: 'bg-violet-500 hover:bg-violet-600 text-white',
    },
  ] as const;

  const filteredCount = filterLogs().length;

  return (
    <motion.div
      initial="hidden" animate="visible"
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
      className="space-y-5 py-4"
    >

      {/* ── Date range ──────────────────────────────────────────── */}
      <motion.div variants={itemV}>
        <Card className="rounded-2xl">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock size={15} className="text-sky-500" />
              {t('exportRange')}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="flex gap-1.5 p-1 bg-muted rounded-xl">
              {([
                { key: 'all', label: t('exportAll') },
                { key: '7d',  label: t('exportLastWeek') },
                { key: '30d', label: t('exportLastMonth') },
              ] as const).map(r => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    range === r.key
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-xl bg-sky-500/5 border border-sky-500/15 px-3 py-2">
              <Info size={13} className="text-sky-500 flex-none" />
              <span>{filteredCount} days of data will be exported</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Options ─────────────────────────────────────────────── */}
      <motion.div variants={itemV}>
        <Card className="rounded-2xl">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Options</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {[
              { key: 'notes',   label: t('exportIncludeNotes'),         val: includeNotes,      set: setIncludeNotes },
              { key: 'types',   label: t('exportIncludeDrinkTypes'),    val: includeDrinkTypes, set: setIncludeDrinkTypes },
              { key: 'factors', label: t('exportIncludeHydrationFactors'), val: includeFactors,  set: setIncludeFactors },
            ].map(o => (
              <div key={o.key} className="flex items-center justify-between py-1">
                <Label className="text-sm cursor-pointer" htmlFor={`opt-${o.key}`}>{o.label}</Label>
                <Switch id={`opt-${o.key}`} checked={o.val} onCheckedChange={o.set} />
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Export buttons ───────────────────────────────────────── */}
      <motion.div variants={itemV} className="space-y-3">
        {exportButtons.map(btn => (
          <div
            key={btn.id}
            className={`rounded-2xl border ${btn.border} ${btn.bg} p-4 flex items-center gap-4`}
          >
            <div className={`w-11 h-11 rounded-xl ${btn.bg} flex items-center justify-center flex-none`}>
              <btn.icon size={22} className={btn.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{btn.label}</p>
              <p className="text-xs text-muted-foreground">{btn.desc}</p>
            </div>
            <Button
              size="sm"
              onClick={() => doExport(btn.id as 'pdf' | 'csv' | 'json')}
              disabled={!!exporting || filteredCount === 0}
              className={`flex-none gap-1.5 ${btn.btnClass}`}
            >
              {exporting === btn.id ? (
                <span className="flex items-center gap-1.5">
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                  </svg>
                  Exporting...
                </span>
              ) : (
                <><Download size={13} /> Export</>
              )}
            </Button>
          </div>
        ))}
      </motion.div>

      {/* ── Backup & Restore ─────────────────────────────────────── */}
      <motion.div variants={itemV}>
        <Card className="rounded-2xl">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Archive size={15} className="text-sky-500" />
              {t('backupTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {/* Last backup info */}
            {lastBackupTime && (
              <div className="flex items-center gap-2 text-xs rounded-xl bg-emerald-500/5 border border-emerald-500/15 px-3 py-2">
                <CheckCircle2 size={13} className="text-emerald-500 flex-none" />
                <span className="text-muted-foreground">{t('lastBackup')}: {lastBackupTime}</span>
              </div>
            )}

            {backupStatus === 'err' && (
              <div className="flex items-center gap-2 text-xs rounded-xl bg-destructive/5 border border-destructive/15 px-3 py-2">
                <AlertCircle size={13} className="text-destructive flex-none" />
                <span className="text-destructive">{t('backupFailed')}</span>
              </div>
            )}

            {/* Backup now */}
            <Button
              onClick={doBackup}
              variant="outline"
              className="w-full gap-2 border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10"
            >
              <Download size={15} /> {t('backupNow')}
            </Button>

            {/* Restore from auto backup */}
            <Button
              onClick={doRestore}
              variant="outline"
              className="w-full gap-2"
            >
              <Upload size={15} /> {t('restoreBackup')}
            </Button>

            {/* Import from file */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full gap-2"
              >
                <Upload size={15} /> {t('importJSON')}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Imported data is merged with existing logs
            </p>
          </CardContent>
        </Card>
      </motion.div>

    </motion.div>
  );
}
