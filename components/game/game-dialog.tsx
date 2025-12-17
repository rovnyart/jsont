"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SnakeGame } from "./snake-game";
import { useGameScores } from "@/hooks/use-game-scores";
import {
  extractJsonKeys,
  DEFAULT_GAME_PARAMS,
} from "@/lib/game/game-utils";
import { Trophy, Play, RotateCcw, X } from "lucide-react";

type GameState = "start" | "playing" | "paused" | "gameover";

interface GameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jsonData: unknown;
}

export function GameDialog({
  open,
  onOpenChange,
  jsonData,
}: GameDialogProps) {
  const [gameState, setGameState] = useState<GameState>("start");
  const [finalScore, setFinalScore] = useState(0);
  const [finalLength, setFinalLength] = useState(0);
  const [finalFoodsEaten, setFinalFoodsEaten] = useState(0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [gameKey, setGameKey] = useState(0); // Force remount on restart
  const [wallWrap, setWallWrap] = useState(false); // Snake goes through walls

  // Extract JSON keys for visual snake segments (keeps the JSON theming)
  const jsonKeys = extractJsonKeys(jsonData);

  // High scores (global, not per-JSON)
  const { highScore, gamesPlayed, updateScore, isNewHighScore: checkNewHighScore } =
    useGameScores();

  // Handle game over - defer state updates to avoid React render-time setState error
  const handleGameOver = useCallback(
    (score: number, length: number, foodsEaten: number) => {
      // Use setTimeout to defer state updates outside of SnakeGame's render cycle
      setTimeout(() => {
        setFinalScore(score);
        setFinalLength(length);
        setFinalFoodsEaten(foodsEaten);
        setIsNewHighScore(checkNewHighScore(score));
        updateScore(score);
        setGameState("gameover");
      }, 0);
    },
    [checkNewHighScore, updateScore]
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      } else if (e.key === " " || e.key === "Space") {
        e.preventDefault();
        if (gameState === "start") {
          setGameState("playing");
        } else if (gameState === "playing") {
          setGameState("paused");
        } else if (gameState === "paused") {
          setGameState("playing");
        } else if (gameState === "gameover") {
          handleRestart();
        }
      } else if (e.key === "r" || e.key === "R") {
        if (gameState === "playing" || gameState === "paused" || gameState === "gameover") {
          e.preventDefault();
          handleRestart();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, gameState, onOpenChange]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setGameState("start");
      setFinalScore(0);
      setIsNewHighScore(false);
    }
  }, [open]);

  const handleStart = () => {
    setGameState("playing");
  };

  const handleRestart = () => {
    setGameKey((k) => k + 1);
    setGameState("playing");
    setFinalScore(0);
    setIsNewHighScore(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] max-w-[560px] h-auto max-h-[95vh] p-0 gap-0 border-border bg-background overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        {/* Visually hidden title for accessibility */}
        <DialogTitle className="sr-only">JSON Snake Game</DialogTitle>

        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold font-mono">JSON SNAKE</span>
              <span className="text-xs text-muted-foreground">v1.0</span>
            </div>
            <div className="flex items-center gap-4 text-sm font-mono">
              <div className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span className="text-muted-foreground">High:</span>
                <span className="font-bold">{highScore}</span>
              </div>
              <div className="text-muted-foreground">
                Games: <span className="text-foreground">{gamesPlayed}</span>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="ml-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close game"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Game area */}
          <div className="flex-1 flex items-center justify-center p-4 min-h-[520px]">
            {gameState === "start" && (
              <div className="flex flex-col items-center gap-6 text-center">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold font-mono">Ready to Play?</h2>
                  <p className="text-muted-foreground text-sm max-w-xs">
                    Classic snake with a twist - your snake displays JSON keys
                    colored by their value types as it grows!
                  </p>
                </div>

                {/* Color legend */}
                <div className="text-xs text-muted-foreground">
                  <div className="mb-2 font-medium">Snake segment colors:</div>
                  <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-[#22c55e]"></span> string
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-[#3b82f6]"></span> number
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-[#eab308]"></span> boolean
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-[#a855f7]"></span> object
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-[#06b6d4]"></span> array
                    </span>
                  </div>
                </div>

                {/* Wall wrap option */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="wall-wrap"
                    checked={wallWrap}
                    onCheckedChange={(checked) => setWallWrap(checked === true)}
                  />
                  <Label htmlFor="wall-wrap" className="text-sm cursor-pointer">
                    Snake goes through walls (Nokia mode)
                  </Label>
                </div>

                <Button onClick={handleStart} size="lg" className="gap-2">
                  <Play className="h-5 w-5" />
                  Start Game
                </Button>

                <div className="text-xs text-muted-foreground font-mono">
                  Press SPACE to start · ESC to exit
                </div>
              </div>
            )}

            {(gameState === "playing" || gameState === "paused") && (
              <SnakeGame
                key={gameKey}
                gameParams={DEFAULT_GAME_PARAMS}
                jsonKeys={jsonKeys}
                onGameOver={handleGameOver}
                isPaused={gameState === "paused"}
                wallWrap={wallWrap}
              />
            )}

            {gameState === "gameover" && (
              <div className="flex flex-col items-center gap-6 text-center">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold font-mono text-destructive">
                    GAME OVER
                  </h2>
                  {isNewHighScore && (
                    <div className="flex items-center justify-center gap-2 text-amber-500">
                      <Trophy className="h-5 w-5" />
                      <span className="font-bold">New High Score!</span>
                      <Trophy className="h-5 w-5" />
                    </div>
                  )}
                </div>

                {/* Final stats */}
                <div className="grid grid-cols-3 gap-4 text-sm font-mono">
                  <div className="bg-muted/50 rounded-lg px-4 py-3">
                    <div className="text-muted-foreground text-xs">Score</div>
                    <div className="text-2xl font-bold">{finalScore}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg px-4 py-3">
                    <div className="text-muted-foreground text-xs">Length</div>
                    <div className="text-2xl font-bold">{finalLength}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg px-4 py-3">
                    <div className="text-muted-foreground text-xs">Food</div>
                    <div className="text-2xl font-bold">{finalFoodsEaten}</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleRestart} size="lg" className="gap-2">
                    <RotateCcw className="h-5 w-5" />
                    Play Again
                  </Button>
                  <Button
                    onClick={() => onOpenChange(false)}
                    variant="outline"
                    size="lg"
                  >
                    Exit
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground font-mono">
                  Press SPACE to play again · ESC to exit
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground font-mono flex justify-between">
            <span>Arrow Keys / WASD to move</span>
            <span>SPACE to pause · R to restart · ESC to exit</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
