"use client";

import { useState, useEffect, useCallback } from "react";

const SETTINGS_KEY = "jsont-settings";

export type IndentStyle = "2" | "4" | "tab";

export interface Settings {
  indentStyle: IndentStyle;
  formatOnPaste: boolean;
}

const defaultSettings: Settings = {
  indentStyle: "2",
  formatOnPaste: false,
};

// Read settings directly from localStorage (for use outside React lifecycle)
export function getSettingsFromStorage(): Settings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return defaultSettings;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (e) {
      console.warn("Could not load settings:", e);
    }
    setIsLoaded(true);
  }, []);

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => {
        const newSettings = { ...prev, [key]: value };
        // Save to localStorage immediately (synchronous)
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
        } catch (e) {
          console.warn("Could not save settings:", e);
        }
        return newSettings;
      });
    },
    []
  );

  // Get indent string based on setting
  const getIndent = useCallback((): string | number => {
    switch (settings.indentStyle) {
      case "2":
        return 2;
      case "4":
        return 4;
      case "tab":
        return "\t";
      default:
        return 2;
    }
  }, [settings.indentStyle]);

  return {
    settings,
    updateSetting,
    getIndent,
    isLoaded,
  };
}
