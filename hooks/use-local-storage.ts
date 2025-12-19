"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { decodeShareUrl, clearShareUrl } from "@/lib/share";

const STORAGE_KEY = "jsont-editor-content";

export function useLocalStorage(initialValue: string = "") {
  const [value, setValue] = useState(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);
  const loadedFromUrl = useRef(false);

  // Load from URL hash or localStorage on mount
  useEffect(() => {
    // First, check if there's shared data in the URL
    const hash = window.location.hash;
    if (hash && hash.includes("d=")) {
      const result = decodeShareUrl(hash);
      if (result.success && result.data) {
        loadedFromUrl.current = true;
        setTimeout(() => setValue(result.data!), 0);
        // Clear the URL hash to keep it clean (but don't trigger a reload)
        clearShareUrl();
        setTimeout(() => setIsLoaded(true), 0);
        return;
      }
    }

    // Fallback to localStorage
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
