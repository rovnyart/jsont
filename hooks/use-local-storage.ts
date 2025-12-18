"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "jsont-editor-content";

export function useLocalStorage(initialValue: string = "") {
  const [value, setValue] = useState(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setTimeout(() => setValue(stored), 0);
      }
    } catch (e) {
      // localStorage might be unavailable (private browsing, etc.)
      console.warn("Could not read from localStorage:", e);
    }
    setTimeout(() => setIsLoaded(true), 0);
  }, []);

  // Save to localStorage when value changes (debounced)
  useEffect(() => {
    if (!isLoaded) return;

    const timeoutId = setTimeout(() => {
      try {
        if (value) {
          localStorage.setItem(STORAGE_KEY, value);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        console.warn("Could not write to localStorage:", e);
      }
    }, 500); // Debounce by 500ms to avoid excessive writes

    return () => clearTimeout(timeoutId);
  }, [value, isLoaded]);

  const clearStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("Could not clear localStorage:", e);
    }
  }, []);

  return { value, setValue, isLoaded, clearStorage };
}
