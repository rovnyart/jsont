"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "jsont-snake-scores";

export interface GameScore {
  highScore: number;
  gamesPlayed: number;
  lastScore: number;
}

const defaultScore: GameScore = {
  highScore: 0,
  gamesPlayed: 0,
  lastScore: 0,
};

/**
 * Hook for managing global game high score
 */
export function useGameScores() {
  const [score, setScore] = useState<GameScore>(defaultScore);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load score from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate that it's the new format (has highScore as a number)
        if (typeof parsed.highScore === 'number' && !isNaN(parsed.highScore)) {
          setScore(parsed);
        } else {
          // Old format or corrupted data - reset to defaults
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn("Could not load game scores:", e);
      localStorage.removeItem(STORAGE_KEY);
    }
    setIsLoaded(true);
  }, []);

  // Update score after game ends
  const updateScore = useCallback((newScore: number) => {
    setScore((prev) => {
      const updated: GameScore = {
        highScore: Math.max(prev.highScore, newScore),
        gamesPlayed: prev.gamesPlayed + 1,
        lastScore: newScore,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn("Could not save game scores:", e);
      }
      return updated;
    });
  }, []);

  // Check if a score is a new high score
  const isNewHighScore = useCallback(
    (newScore: number) => {
      return newScore > score.highScore;
    },
    [score.highScore]
  );

  return {
    highScore: score.highScore,
    gamesPlayed: score.gamesPlayed,
    lastScore: score.lastScore,
    updateScore,
    isNewHighScore,
    isLoaded,
  };
}
