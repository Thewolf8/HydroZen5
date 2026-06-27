import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Profile, ProfileColor } from '@/types/profile';
import {
  getProfiles, getActiveProfile, setActiveProfileId,
  addProfile as svcAdd, renameProfile as svcRename,
  changeProfileColor as svcColor, setProfileGoal as svcGoal,
  deleteProfile as svcDelete,
} from '@/services/profileService';

interface ProfileContextValue {
  profiles: Profile[];
  activeProfile: Profile;
  switchProfile: (id: string) => void;
  addProfile: (name: string, color: ProfileColor) => void;
  renameProfile: (id: string, name: string) => void;
  changeProfileColor: (id: string, color: ProfileColor) => void;
  setProfileGoal: (id: string, goalMlOverride: number | null) => void;
  deleteProfile: (id: string) => void;
  refreshProfiles: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>(getProfiles);
  const [activeProfile, setActiveProfile] = useState<Profile>(getActiveProfile);

  const refresh = useCallback(() => {
    setProfiles(getProfiles());
    setActiveProfile(getActiveProfile());
  }, []);

  const switchProfile = useCallback((id: string) => {
    setActiveProfileId(id);
    refresh();
  }, [refresh]);

  const addProfile = useCallback((name: string, color: ProfileColor) => {
    svcAdd(name, color);
    refresh();
  }, [refresh]);

  const renameProfile = useCallback((id: string, name: string) => {
    svcRename(id, name);
    refresh();
  }, [refresh]);

  const changeProfileColor = useCallback((id: string, color: ProfileColor) => {
    svcColor(id, color);
    refresh();
  }, [refresh]);

  const setProfileGoal = useCallback((id: string, goalMlOverride: number | null) => {
    svcGoal(id, goalMlOverride);
    refresh();
  }, [refresh]);

  const deleteProfile = useCallback((id: string) => {
    svcDelete(id);
    refresh();
  }, [refresh]);

  return (
    <ProfileContext.Provider value={{
      profiles, activeProfile,
      switchProfile, addProfile, renameProfile, changeProfileColor,
      setProfileGoal, deleteProfile, refreshProfiles: refresh,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
