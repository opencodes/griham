import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'griham_app_settings_v1';

export interface AppSettings {
  participantRsvpStatuses: string[];
  participantGenders: string[];
  participantAgeGroups: string[];
  participantGiftOptions: string[];
}

const defaultSettings: AppSettings = {
  participantRsvpStatuses: ['Pending Invitation', 'Invited', 'Attended'],
  participantGenders: ['Female', 'Male', 'Non-binary', 'Prefer not to say'],
  participantAgeGroups: ['Child', 'Teen', 'Adult', 'Senior'],
  participantGiftOptions: ['Flowers', 'Cash Gift', 'Gift Card', 'Home Decor'],
};

interface AppSettingsContextValue {
  settings: AppSettings;
  updateSettings: (next: AppSettings) => void;
  resetSettings: () => void;
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

function sanitizeList(values: unknown, fallback: string[]): string[] {
  if (!Array.isArray(values)) return fallback;
  const unique = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const normalized = value.trim();
    if (!normalized) continue;
    unique.add(normalized);
  }
  const list = Array.from(unique);
  return list.length > 0 ? list : fallback;
}

function sanitizeSettings(input: unknown): AppSettings {
  if (!input || typeof input !== 'object') return defaultSettings;
  const source = input as Partial<AppSettings>;
  return {
    participantRsvpStatuses: sanitizeList(source.participantRsvpStatuses, defaultSettings.participantRsvpStatuses),
    participantGenders: sanitizeList(source.participantGenders, defaultSettings.participantGenders),
    participantAgeGroups: sanitizeList(source.participantAgeGroups, defaultSettings.participantAgeGroups),
    participantGiftOptions: sanitizeList(source.participantGiftOptions, defaultSettings.participantGiftOptions),
  };
}

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSettings;
      return sanitizeSettings(JSON.parse(raw));
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (next: AppSettings) => {
    setSettings(sanitizeSettings(next));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <AppSettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used inside AppSettingsProvider');
  }
  return context;
}
