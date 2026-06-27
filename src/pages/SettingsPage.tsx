import { useState } from 'react';
import {
  Palette, Globe, Gauge, Droplets, Bell, Database, Info,
  Sun, Moon, Monitor, Check, Pencil, Trash2, Plus, Zap, Quote, ToggleLeft,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useI18n } from '@/i18n/I18nContext';
import { useProfile } from '@/context/ProfileContext';
import { PROFILE_COLORS, PROFILE_COLOR_CLASSES, type ProfileColor } from '@/types/profile';
import type { AppSettings, Theme, Unit, Language } from '@/types/water';

interface SettingsPageProps {
  settings: AppSettings;
  onUpdate: (patch: Partial<AppSettings>) => void;
  onResetData: () => void;
  onToast: (msg: string, desc?: string) => void;
}

// ── Reusable checkbox row ─────────────────────────────────────────────────

function CheckRow({
  id, icon: Icon, label, desc, checked, onCheckedChange, disabled = false, divider = true,
}: {
  id: string;
  icon: React.ElementType;
  label: string;
  desc?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  divider?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-4 py-3 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${divider ? 'border-b border-border last:border-0' : ''}`}
    >
      <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center flex-none">
        <Icon size={15} className="text-sky-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={v => !disabled && onCheckedChange(Boolean(v))}
        disabled={disabled}
        className="flex-none data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
      />
    </label>
  );
}

// ── Segmented picker ──────────────────────────────────────────────────────

function SegmentedPicker<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string; icon?: React.ElementType }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 p-0.5 bg-muted rounded-xl">
      {options.map(opt => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
              value === opt.value
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {Icon && <Icon size={12} />}{opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Row with right-side child ─────────────────────────────────────────────

function Row({
  icon: Icon, label, desc, children, divider = true,
}: {
  icon: React.ElementType;
  label: string;
  desc?: string;
  children: React.ReactNode;
  divider?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${divider ? 'border-b border-border last:border-0' : ''}`}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center flex-none mt-0.5">
          <Icon size={15} className="text-sky-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">{label}</p>
          {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
        </div>
      </div>
      <div className="flex-none">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-0 pt-4 px-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-2">{children}</CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function SettingsPage({ settings, onUpdate, onResetData, onToast }: SettingsPageProps) {
  const { t, setLanguage } = useI18n();
  const { profiles, activeProfile, addProfile, renameProfile, changeProfileColor, deleteProfile, switchProfile } = useProfile();

  const [showResetConfirm,   setShowResetConfirm]   = useState(false);
  const [profileDialog,      setProfileDialog]      = useState<'add' | 'edit' | null>(null);
  const [editingProfileId,   setEditingProfileId]   = useState<string | null>(null);
  const [profileName,        setProfileName]        = useState('');
  const [profileColor,       setProfileColor]       = useState<ProfileColor>('blue');
  const [showDeleteProfile,  setShowDeleteProfile]  = useState<string | null>(null);

  const itemV = {
    hidden:  { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  function openAddProfile() {
    setProfileName(''); setProfileColor('blue'); setEditingProfileId(null);
    setProfileDialog('add');
  }
  function openEditProfile(id: string) {
    const p = profiles.find(p => p.id === id);
    if (!p) return;
    setProfileName(p.name); setProfileColor(p.color); setEditingProfileId(id);
    setProfileDialog('edit');
  }
  function saveProfile() {
    if (!profileName.trim()) return;
    if (profileDialog === 'add') {
      addProfile(profileName.trim(), profileColor);
    } else if (editingProfileId) {
      renameProfile(editingProfileId, profileName.trim());
      changeProfileColor(editingProfileId, profileColor);
    }
    onToast(t('settingsSaved'));
    setProfileDialog(null);
  }

  return (
    <motion.div
      initial="hidden" animate="visible"
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
      className="space-y-4 py-4"
    >

      {/* ── Appearance ──────────────────────────────────────────────────── */}
      <motion.div variants={itemV}>
        <Section title={t('appearance')}>
          <Row icon={Palette} label={t('theme')}>
            <SegmentedPicker
              value={settings.theme}
              onChange={v => onUpdate({ theme: v as Theme })}
              options={[
                { value: 'light',  label: t('themeLight'),  icon: Sun },
                { value: 'system', label: t('themeSystem'), icon: Monitor },
                { value: 'dark',   label: t('themeDark'),   icon: Moon },
              ]}
            />
          </Row>
          <Row icon={Globe} label={t('language')}>
            <SegmentedPicker
              value={settings.language}
              onChange={v => { onUpdate({ language: v as Language }); setLanguage(v as Language); }}
              options={[
                { value: 'en',     label: 'EN' },
                { value: 'ar',     label: 'AR' },
                { value: 'fr',     label: 'FR' },
                { value: 'system', label: 'Auto' },
              ]}
            />
          </Row>
          <CheckRow
            id="animations"
            icon={ToggleLeft}
            label={t('animations')}
            desc={t('animationsDesc')}
            checked={settings.animationsEnabled}
            onCheckedChange={v => onUpdate({ animationsEnabled: v })}
          />
          <CheckRow
            id="motivation"
            icon={Quote}
            label={t('showMotivation')}
            checked={settings.showMotivation}
            onCheckedChange={v => onUpdate({ showMotivation: v })}
            divider={false}
          />
        </Section>
      </motion.div>

      {/* ── Hydration & Units ────────────────────────────────────────────── */}
      <motion.div variants={itemV}>
        <Section title={t('hydration')}>
          <Row icon={Gauge} label={t('units')}>
            <SegmentedPicker
              value={settings.unit}
              onChange={v => onUpdate({ unit: v as Unit })}
              options={[
                { value: 'ml', label: 'ml' },
                { value: 'oz', label: 'oz' },
              ]}
            />
          </Row>
          <CheckRow
            id="hydration-factors"
            icon={Zap}
            label={t('hydrationFactors')}
            desc={t('hydrationFactorsDesc')}
            checked={settings.useHydrationFactors}
            onCheckedChange={v => onUpdate({ useHydrationFactors: v })}
          />
          <CheckRow
            id="show-factor"
            icon={Droplets}
            label={t('showHydrationFactor')}
            checked={settings.showHydrationFactor}
            onCheckedChange={v => onUpdate({ showHydrationFactor: v })}
            disabled={!settings.useHydrationFactors}
            divider={false}
          />
        </Section>
      </motion.div>

      {/* ── Notifications ────────────────────────────────────────────────── */}
      <motion.div variants={itemV}>
        <Section title={t('notifications')}>
          <CheckRow
            id="notif-goal"
            icon={Bell}
            label={t('goalAchieved')}
            checked={settings.notifications.goalAchieved}
            onCheckedChange={v => onUpdate({ notifications: { ...settings.notifications, goalAchieved: v } })}
          />
          <CheckRow
            id="notif-streak"
            icon={Bell}
            label={t('streakReminder')}
            checked={settings.notifications.streakReminder}
            onCheckedChange={v => onUpdate({ notifications: { ...settings.notifications, streakReminder: v } })}
          />
          <CheckRow
            id="notif-morning"
            icon={Sun}
            label={t('morningMotivation')}
            checked={settings.notifications.morningMotivation}
            onCheckedChange={v => onUpdate({ notifications: { ...settings.notifications, morningMotivation: v } })}
            divider={false}
          />
          {settings.notifications.morningMotivation && (
            <div className="flex items-center justify-between pb-3 pl-11">
              <p className="text-xs text-muted-foreground">{t('morningHour')}</p>
              <select
                value={settings.notifications.morningHour}
                onChange={e => onUpdate({ notifications: { ...settings.notifications, morningHour: Number(e.target.value) } })}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
              >
                {Array.from({ length: 13 }, (_, i) => i + 5).map(h => (
                  <option key={h} value={h}>{h}:00</option>
                ))}
              </select>
            </div>
          )}
        </Section>
      </motion.div>

      {/* ── Profiles ─────────────────────────────────────────────────────── */}
      <motion.div variants={itemV}>
        <Card className="rounded-2xl">
          <CardHeader className="pb-0 pt-4 px-4 flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('profiles')}
            </CardTitle>
            {profiles.length < 8 && (
              <Button size="sm" variant="ghost" onClick={openAddProfile}
                className="h-7 px-2 gap-1 text-sky-500 hover:text-sky-600 hover:bg-sky-500/10 text-xs">
                <Plus size={13} /> {t('addProfile')}
              </Button>
            )}
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-1.5 mt-2">
              {profiles.map(p => {
                const isActive = p.id === activeProfile.id;
                return (
                  <div key={p.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                      isActive ? 'border-sky-500/30 bg-sky-500/5' : 'border-border hover:bg-accent/30'
                    }`}
                  >
                    <button onClick={() => switchProfile(p.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      <div className={`w-9 h-9 rounded-full ${PROFILE_COLOR_CLASSES[p.color]} flex items-center justify-center text-white font-bold text-sm flex-none`}>
                        {p.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{isActive ? '● Active' : 'Tap to switch'}</p>
                      </div>
                    </button>
                    {isActive && <Check size={14} className="text-sky-500 flex-none" />}
                    <button onClick={() => openEditProfile(p.id)}
                      className="p-1.5 rounded-lg hover:bg-accent transition-colors flex-none">
                      <Pencil size={13} className="text-muted-foreground" />
                    </button>
                    {profiles.length > 1 && (
                      <button onClick={() => setShowDeleteProfile(p.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors flex-none">
                        <Trash2 size={13} className="text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Data management ─────────────────────────────────────────────── */}
      <motion.div variants={itemV}>
        <Section title={t('dataManagement')}>
          <Row icon={Database} label={t('resetData')} desc={t('resetDataDesc')} divider={false}>
            <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(true)}
              className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground text-xs">
              {t('resetData')}
            </Button>
          </Row>
        </Section>
      </motion.div>

      {/* ── About ────────────────────────────────────────────────────────── */}
      <motion.div variants={itemV}>
        <Section title={t('about')}>
          <div className="py-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                <Droplets size={24} className="text-sky-500" />
              </div>
              <div>
                <p className="font-bold text-base">{t('appName')}</p>
                <p className="text-xs text-muted-foreground">{t('version')} 1.0.0</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{t('appDescription')}</p>
            <div className="rounded-xl bg-muted/50 border border-border px-3 py-2">
              <p className="text-xs text-muted-foreground">🔒 {t('privacyNote')}</p>
            </div>
          </div>
        </Section>
      </motion.div>

      {/* Profile add/edit dialog */}
      <Dialog open={!!profileDialog} onOpenChange={o => !o && setProfileDialog(null)}>
        <DialogContent className="rounded-2xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>{profileDialog === 'add' ? t('addProfile') : t('editProfile')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">{t('profileName')}</Label>
              <Input value={profileName} onChange={e => setProfileName(e.target.value)}
                placeholder="e.g. Alex" className="mt-1" maxLength={32} autoFocus />
            </div>
            <div>
              <Label className="text-sm">{t('profileColor')}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {PROFILE_COLORS.map(c => (
                  <button key={c} onClick={() => setProfileColor(c)}
                    className={`w-9 h-9 rounded-full ${PROFILE_COLOR_CLASSES[c]} flex items-center justify-center transition-all ${
                      profileColor === c ? 'ring-2 ring-offset-2 ring-sky-500 ring-offset-background scale-110' : ''
                    }`}
                  >
                    {profileColor === c && <Check size={14} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setProfileDialog(null)}>{t('cancel')}</Button>
            <Button onClick={saveProfile} disabled={!profileName.trim()}
              className="bg-sky-500 hover:bg-sky-600 text-white">
              {t('saveProfile')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete profile confirm */}
      <AlertDialog open={!!showDeleteProfile} onOpenChange={o => !o && setShowDeleteProfile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteProfile')}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the profile and all its drink logs.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground"
              onClick={() => { if (showDeleteProfile) deleteProfile(showDeleteProfile); setShowDeleteProfile(null); onToast('Profile deleted'); }}>
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset all data confirm */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('resetConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('resetConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground"
              onClick={() => { onResetData(); setShowResetConfirm(false); }}>
              {t('resetConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </motion.div>
  );
}
