"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  GameParams,
  JsonKeyInfo,
  VALUE_TYPE_COLORS,
} from "@/lib/game/game-utils";

interface Position {
  x: number;
  y: number;
}

type Direction = "up" | "down" | "left" | "right";

interface Food {
  position: Position;
  isBonus: boolean;
}

interface SnakeGameProps {
  gameParams: GameParams;
  jsonKeys: JsonKeyInfo[];
  onGameOver: (score: number, length: number, foodsEaten: number) => void;
  isPaused: boolean;
  wallWrap: boolean;
}

// Grid configuration
const GRID_SIZE = 20; // cells
const CELL_SIZE = 24; // pixels

// Direction vectors
const DIRECTION_VECTORS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// Direction characters for snake head
const DIRECTION_CHARS: Record<Direction, string> = {
  up: "^",
  down: "v",
  left: "<",
  right: ">",
};

export function SnakeGame({
  gameParams,
  jsonKeys,
  onGameOver,
  isPaused,
  wallWrap,
}: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Game state
  const [snake, setSnake] = useState<Position[]>([]);
  const [direction, setDirection] = useState<Direction>("right");
  const [nextDirection, setNextDirection] = useState<Direction>("right");
  const [food, setFood] = useState<Food | null>(null);
  const [score, setScore] = useState(0);
  const [foodsEaten, setFoodsEaten] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(gameParams.initialSpeed);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Initialize game
  const initGame = useCallback(() => {
    const startX = Math.floor(GRID_SIZE / 2);
    const startY = Math.floor(GRID_SIZE / 2);
    const initialSnake: Position[] = [];

    // Create initial snake segments
    for (let i = 0; i < gameParams.startLength; i++) {
      initialSnake.push({ x: startX - i, y: startY });
    }

    setSnake(initialSnake);
    setDirection("right");
    setNextDirection("right");
    setScore(0);
    setFoodsEaten(0);
    setCurrentSpeed(gameParams.initialSpeed);
    setGameOver(false);
    setGameStarted(true);
    lastUpdateRef.current = 0;
  }, [gameParams.startLength, gameParams.initialSpeed]);

  // Spawn food at random position
  const spawnFood = useCallback(
    (currentSnake: Position[]) => {
      const occupiedCells = new Set(
        currentSnake.map((p) => `${p.x},${p.y}`)
      );

      let newPosition: Position;
      let attempts = 0;
      do {
        newPosition = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE),
        };
        attempts++;
      } while (
        occupiedCells.has(`${newPosition.x},${newPosition.y}`) &&
        attempts < 100
      );

      const isBonus = Math.random() < gameParams.bonusFoodChance;
      setFood({ position: newPosition, isBonus });
    },
    [gameParams.bonusFoodChance]
  );

  // Start game on mount
  useEffect(() => {
    initGame();
  }, [initGame]);

  // Spawn initial food
  useEffect(() => {
    if (gameStarted && snake.length > 0 && !food) {
      spawnFood(snake);
    }
  }, [gameStarted, snake, food, spawnFood]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;

      const keyMap: Record<string, Direction> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        W: "up",
        s: "down",
        S: "down",
        a: "left",
        A: "left",
        d: "right",
        D: "right",
      };

      const newDirection = keyMap[e.key];
      if (newDirection) {
        e.preventDefault();
        // Prevent 180-degree turns
        const opposites: Record<Direction, Direction> = {
          up: "down",
          down: "up",
          left: "right",
          right: "left",
        };
        if (newDirection !== opposites[direction]) {
          setNextDirection(newDirection);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [direction, gameOver]);

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver || isPaused) {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      return;
    }

    const gameLoop = (timestamp: number) => {
      if (!lastUpdateRef.current) {
        lastUpdateRef.current = timestamp;
      }

      const elapsed = timestamp - lastUpdateRef.current;

      if (elapsed >= currentSpeed) {
        lastUpdateRef.current = timestamp;

        // Move snake
        setSnake((prevSnake) => {
          const newDirection = nextDirection;
          setDirection(newDirection);

          const head = prevSnake[0];
          const vector = DIRECTION_VECTORS[newDirection];
          let newHead: Position = {
            x: head.x + vector.x,
            y: head.y + vector.y,
          };

          // Check wall collision or wrap
          if (
            newHead.x < 0 ||
            newHead.x >= GRID_SIZE ||
            newHead.y < 0 ||
            newHead.y >= GRID_SIZE
          ) {
            if (wallWrap) {
              // Wrap around to other side (Nokia mode)
              newHead = {
                x: (newHead.x + GRID_SIZE) % GRID_SIZE,
                y: (newHead.y + GRID_SIZE) % GRID_SIZE,
              };
            } else {
              setGameOver(true);
              onGameOver(score, prevSnake.length, foodsEaten);
              return prevSnake;
            }
          }

          // Check self collision
          if (
            prevSnake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)
          ) {
            setGameOver(true);
            onGameOver(score, prevSnake.length, foodsEaten);
            return prevSnake;
          }

          // Check food collision
          let ateFood = false;
          let ateBonusFood = false;
          if (
            food &&
            newHead.x === food.position.x &&
            newHead.y === food.position.y
          ) {
            ateFood = true;
            ateBonusFood = food.isBonus;
          }

          const newSnake = [newHead, ...prevSnake];
          if (!ateFood) {
            newSnake.pop(); // Remove tail if didn't eat
          } else {
            // Update score and spawn new food
            const points = ateBonusFood ? 25 : 10;
            setScore((s) => s + points);
            setFoodsEaten((f) => f + 1);
            setFood(null); // Will trigger respawn

            // Increase speed
            setCurrentSpeed((s) =>
              Math.max(gameParams.minSpeed, s - gameParams.speedAcceleration)
            );
          }

          return newSnake;
        });
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [
    gameStarted,
    gameOver,
    isPaused,
    currentSpeed,
    nextDirection,
    food,
    score,
    foodsEaten,
    gameParams.minSpeed,
    gameParams.speedAcceleration,
    onGameOver,
    wallWrap,
  ]);

  // Spawn food when eaten
  useEffect(() => {
    if (gameStarted && !food && !gameOver && snake.length > 0) {
      spawnFood(snake);
    }
  }, [food, gameStarted, gameOver, snake, spawnFood]);

  // Render game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid dots
    ctx.fillStyle = "#1a1a1a";
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        ctx.beginPath();
        ctx.arc(
          x * CELL_SIZE + CELL_SIZE / 2,
          y * CELL_SIZE + CELL_SIZE / 2,
          1,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }

    // Draw food
    if (food) {
      const foodX = food.position.x * CELL_SIZE + CELL_SIZE / 2;
      const foodY = food.position.y * CELL_SIZE + CELL_SIZE / 2;

      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (food.isBonus) {
        ctx.fillStyle = "#fbbf24"; // amber for bonus
        ctx.fillText("[ ]", foodX, foodY);
      } else {
        ctx.fillStyle = "#4ade80"; // green for regular
        ctx.fillText("{ }", foodX, foodY);
      }
    }

    // Draw snake
    snake.forEach((segment, index) => {
      const x = segment.x * CELL_SIZE;
      const y = segment.y * CELL_SIZE;

      if (index === 0) {
        // Draw head
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          DIRECTION_CHARS[direction],
          x + CELL_SIZE / 2,
          y + CELL_SIZE / 2
        );
      } else {
        // Draw body segment with JSON key info
        const keyIndex = (index - 1) % Math.max(1, jsonKeys.length);
        const keyInfo = jsonKeys[keyIndex];

        // Background color based on value type
        const bgColor = keyInfo
          ? VALUE_TYPE_COLORS[keyInfo.valueType]
          : "#6b7280";

        // Draw rounded rectangle background
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        const padding = 2;
        const radius = 4;
        const rectX = x + padding;
        const rectY = y + padding;
        const rectW = CELL_SIZE - padding * 2;
        const rectH = CELL_SIZE - padding * 2;

        ctx.moveTo(rectX + radius, rectY);
        ctx.lineTo(rectX + rectW - radius, rectY);
        ctx.quadraticCurveTo(rectX + rectW, rectY, rectX + rectW, rectY + radius);
        ctx.lineTo(rectX + rectW, rectY + rectH - radius);
        ctx.quadraticCurveTo(
          rectX + rectW,
          rectY + rectH,
          rectX + rectW - radius,
          rectY + rectH
        );
        ctx.lineTo(rectX + radius, rectY + rectH);
        ctx.quadraticCurveTo(rectX, rectY + rectH, rectX, rectY + rectH - radius);
        ctx.lineTo(rectX, rectY + radius);
        ctx.quadraticCurveTo(rectX, rectY, rectX + radius, rectY);
        ctx.closePath();
        ctx.fill();

        // Draw key text
        if (keyInfo) {
          ctx.fillStyle = "#000000";
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(keyInfo.displayKey, x + CELL_SIZE / 2, y + CELL_SIZE / 2);
        }
      }
    });

    // Draw pause overlay
    if (isPaused && !gameOver) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);

      ctx.font = "14px monospace";
      ctx.fillStyle = "#888888";
      ctx.fillText(
        "Press SPACE to resume",
        canvas.width / 2,
        canvas.height / 2 + 30
      );
    }
  }, [snake, food, direction, isPaused, gameOver, jsonKeys]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex justify-between w-full max-w-[480px] text-sm font-mono">
        <div className="text-muted-foreground">
          Score: <span className="text-foreground font-bold">{score}</span>
        </div>
        <div className="text-muted-foreground">
          Length: <span className="text-foreground font-bold">{snake.length}</span>
        </div>
        <div className="text-muted-foreground">
          Speed:{" "}
          <span className="text-foreground font-bold">
            {currentSpeed <= 60 ? "MAX!" : currentSpeed <= 80 ? "Fast" : currentSpeed <= 100 ? "Quick" : "Normal"}
          </span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={GRID_SIZE * CELL_SIZE}
        height={GRID_SIZE * CELL_SIZE}
        className="border border-border rounded-lg"
        style={{ imageRendering: "pixelated" }}
      />

      <div className="text-xs text-muted-foreground font-mono">
        Use Arrow Keys or WASD to move
      </div>
    </div>
  );
}
