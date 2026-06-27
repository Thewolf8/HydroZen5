import type { Profile, ProfileColor } from '@/types/profile';

const PROFILES_KEY = 'aquaflow-profiles';
const ACTIVE_KEY   = 'aquaflow-active-profile';

function loadProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) return JSON.parse(raw) as Profile[];
  } catch {}
  return [];
}

function saveProfiles(profiles: Profile[]) {
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch {}
}

function ensureDefault(): Profile[] {
  let profiles = loadProfiles();
  if (profiles.length === 0) {
    const defaultProfile: Profile = {
      id: 'default',
      name: 'Me',
      color: 'blue',
      createdAt: new Date().toISOString(),
      goalMlOverride: null,
    };
    profiles = [defaultProfile];
    saveProfiles(profiles);
  }
  return profiles;
}

export function getProfiles(): Profile[] { return ensureDefault(); }

export function getActiveProfile(): Profile {
  const profiles = ensureDefault();
  const activeId = localStorage.getItem(ACTIVE_KEY);
  return profiles.find(p => p.id === activeId) ?? profiles[0];
}

export function setActiveProfileId(id: string) {
  try { localStorage.setItem(ACTIVE_KEY, id); } catch {}
}

export function addProfile(name: string, color: ProfileColor): Profile | null {
  const profiles = loadProfiles();
  if (profiles.length >= 8) return null;
  const p: Profile = {
    id: `profile-${Date.now()}`,
    name: name.trim().slice(0, 32) || 'Profile',
    color,
    createdAt: new Date().toISOString(),
    goalMlOverride: null,
  };
  saveProfiles([...profiles, p]);
  return p;
}

export function renameProfile(id: string, name: string): boolean {
  const profiles = loadProfiles();
  const idx = profiles.findIndex(p => p.id === id);
  if (idx < 0) return false;
  profiles[idx] = { ...profiles[idx], name: name.trim().slice(0, 32) || profiles[idx].name };
  saveProfiles(profiles);
  return true;
}

export function changeProfileColor(id: string, color: ProfileColor): boolean {
  const profiles = loadProfiles();
  const idx = profiles.findIndex(p => p.id === id);
  if (idx < 0) return false;
  profiles[idx] = { ...profiles[idx], color };
  saveProfiles(profiles);
  return true;
}

export function setProfileGoal(id: string, goalMlOverride: number | null): boolean {
  const profiles = loadProfiles();
  const idx = profiles.findIndex(p => p.id === id);
  if (idx < 0) return false;
  profiles[idx] = { ...profiles[idx], goalMlOverride };
  saveProfiles(profiles);
  return true;
}

export function deleteProfile(id: string): boolean {
  const profiles = loadProfiles();
  if (profiles.length <= 1) return false;
  const next = profiles.filter(p => p.id !== id);
  saveProfiles(next);
  const activeId = localStorage.getItem(ACTIVE_KEY);
  if (activeId === id) {
    try { localStorage.setItem(ACTIVE_KEY, next[0].id); } catch {}
    try { localStorage.removeItem(`aquaflow-logs-${id}`); } catch {}
  }
  return true;
}
