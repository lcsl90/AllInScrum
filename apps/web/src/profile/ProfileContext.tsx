import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { loadProfile, saveProfile, type StoredProfile } from './profile-cookie.ts';

interface ProfileContextValue {
  readonly profile: StoredProfile;
  updateProfile(changes: Partial<StoredProfile>): void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

/** Hält Name und Foto des Nutzers und spiegelt jede Änderung ins Cookie. */
export function ProfileProvider(props: { children: ReactNode }) {
  const [profile, setProfile] = useState(loadProfile);

  // Speichert auch beim ersten Laden – das verlängert die Cookie-Laufzeit bei jedem Besuch.
  useEffect(() => saveProfile(profile), [profile]);

  const updateProfile = useCallback((changes: Partial<StoredProfile>) => {
    setProfile((current) => ({ ...current, ...changes }));
  }, []);

  const value = useMemo(() => ({ profile, updateProfile }), [profile, updateProfile]);
  return <ProfileContext.Provider value={value}>{props.children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile braucht einen ProfileProvider');
  return context;
}
