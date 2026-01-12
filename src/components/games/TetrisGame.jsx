import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, RotateCcw, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const SHAPES = [
  [[1,1,1,1]], // I
  [[1,1],[1,1]], // O
  [[1,1,1],[0,1,0]], // T
  [[1,1,1],[1,0,0]], // L
  [[1,1,1],[0,0,1]], // J
  [[1,1,0],[0,1,1]], // S
  [[0,1,1],[1,1,0]]  // Z
];

const COLORS = ['#00f0ff', '#fbbf24', '#a855f7', '#f97316', '#3b82f6', '#10b981', '#ef4444'];

export default function TetrisGame({ currentUser, onExit }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const boardRef = useRef(Array(20).fill(null).map(() => Array(10).fill(0)));
  const pieceRef = useRef(null);
  const gameLoopRef = useRef(null);
  const startTimeRef = useRef(null);

  const ROWS = 20;
  const COLS = 10;
  const CELL_SIZE = 28;

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (gameState === 'playing') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      drawGame(ctx);
      
      const gameLoop = setInterval(() => {
        movePieceDown();
        drawGame(ctx);
      }, Math.max(100, 600 - level * 50));

      gameLoopRef.current = gameLoop;
      return () => clearInterval(gameLoop);
    }
  }, [gameState, level]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (gameState !== 'playing') return;
      e.preventDefault();
      
      switch(e.key) {
        case 'ArrowLeft':
        case 'a':
          movePiece(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
          movePiece(1, 0);
          break;
        case 'ArrowDown':
        case 's':
          movePieceDown();
          break;
        case 'ArrowUp':
        case 'w':
        case ' ':
          rotatePiece();
          break;
      }
      drawGame(canvasRef.current.getContext('2d'));
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState]);

  const startGame = () => {
    boardRef.current = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    setScore(0);
    setLines(0);
    setLevel(1);
    spawnPiece();
    setGameState('playing');
    startTimeRef.current = Date.now();
  };

  const spawnPiece = () => {
    const shapeIndex = Math.floor(Math.random() * SHAPES.length);
    pieceRef.current = {
      shape: SHAPES[shapeIndex],
      color: COLORS[shapeIndex],
      x: Math.floor(COLS / 2) - 1,
      y: 0
    };

    if (checkCollision()) {
      endGame();
    }
  };

  const checkCollision = (offsetX = 0, offsetY = 0, newShape = null) => {
    const piece = pieceRef.current;
    const shape = newShape || piece.shape;
    
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newX = piece.x + col + offsetX;
          const newY = piece.y + row + offsetY;
          
          if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
          if (newY >= 0 && boardRef.current[newY][newX]) return true;
        }
      }
    }
    return false;
  };

  const movePiece = (dx, dy) => {
    if (!checkCollision(dx, dy)) {
      pieceRef.current.x += dx;
      pieceRef.current.y += dy;
      return true;
    }
    return false;
  };

  const movePieceDown = () => {
    if (!movePiece(0, 1)) {
      lockPiece();
      clearLines();
      spawnPiece();
    }
  };

  const rotatePiece = () => {
    const piece = pieceRef.current;
    const rotated = piece.shape[0].map((_, i) =>
      piece.shape.map(row => row[i]).reverse()
    );
    
    if (!checkCollision(0, 0, rotated)) {
      pieceRef.current.shape = rotated;
    }
  };

  const lockPiece = () => {
    const piece = pieceRef.current;
    piece.shape.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) {
          const y = piece.y + r;
          const x = piece.x + c;
          if (y >= 0) {
            boardRef.current[y][x] = piece.color;
          }
        }
      });
    });
  };

  const clearLines = () => {
    let linesCleared = 0;
    
    for (let row = ROWS - 1; row >= 0; row--) {
      if (boardRef.current[row].every(cell => cell !== 0)) {
        boardRef.current.splice(row, 1);
        boardRef.current.unshift(Array(COLS).fill(0));
        linesCleared++;
        row++;
      }
    }

    if (linesCleared > 0) {
      const points = [0, 100, 300, 500, 800][linesCleared] * level;
      setScore(prev => prev + points);
      setLines(prev => {
        const newLines = prev + linesCleared;
        setLevel(Math.floor(newLines / 10) + 1);
        return newLines;
      });
      toast.success(`${linesCleared} line${linesCleared > 1 ? 's' : ''}! +${points}`);
    }
  };

  const drawGame = (ctx) => {
    // Background
    const gradient = ctx.createLinearGradient(0, 0, COLS * CELL_SIZE, ROWS * CELL_SIZE);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, COLS * CELL_SIZE, ROWS * CELL_SIZE);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, ROWS * CELL_SIZE);
      ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(COLS * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Board
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (boardRef.current[row][col]) {
          ctx.shadowColor = boardRef.current[row][col];
          ctx.shadowBlur = 10;
          ctx.fillStyle = boardRef.current[row][col];
          ctx.fillRect(col * CELL_SIZE + 2, row * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          ctx.shadowBlur = 0;
        }
      }
    }

    // Current piece
    if (pieceRef.current) {
      const piece = pieceRef.current;
      ctx.shadowColor = piece.color;
      ctx.shadowBlur = 15;
      piece.shape.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell) {
            ctx.fillStyle = piece.color;
            ctx.fillRect(
              (piece.x + c) * CELL_SIZE + 2,
              (piece.y + r) * CELL_SIZE + 2,
              CELL_SIZE - 4,
              CELL_SIZE - 4
            );
          }
        });
      });
      ctx.shadowBlur = 0;
    }
  };

  const endGame = async () => {
    setGameState('gameover');
    
    if (!currentUser) return;

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'tetris',
        score: score,
        duration_seconds: duration,
        reward_earned: 0
      });

      toast.success(`🎮 Game Complete!`);
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-950 via-cyan-950 to-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative"
      >
        <button
          onClick={onExit}
          className="absolute -top-14 right-0 p-3 bg-red-500 rounded-full hover:bg-red-600 transition shadow-lg"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <AnimatePresence>
          {gameState === 'menu' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-lg rounded-2xl z-10"
            >
              <div className="text-center">
                <div className="text-7xl mb-4">🟦</div>
                <h2 className="text-5xl font-bold text-white mb-3 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
                  Neon Tetris
                </h2>
                <p className="text-gray-300 mb-2">{isMobile ? 'Tap buttons to play' : 'Arrow Keys or WASD'}</p>
                {!isMobile && <p className="text-cyan-400 mb-6">Space/Up to Rotate</p>}
                <Button onClick={startGame} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 px-10 py-7 text-xl shadow-2xl">
                  <Play className="w-6 h-6 mr-3" />
                  Start Game
                </Button>
              </div>
            </motion.div>
          )}

          {gameState === 'gameover' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center z-10 rounded-2xl"
            >
              <div className="text-center">
                <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6 animate-pulse" />
                <h3 className="text-5xl font-bold text-white mb-4">Game Over!</h3>
                <div className="bg-cyan-600/20 rounded-xl p-6 mb-6">
                  <p className="text-gray-300 text-lg mb-2">Final Score</p>
                  <p className="text-6xl font-bold text-cyan-400">{score}</p>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-gray-400 text-sm">Lines</p>
                      <p className="text-2xl font-bold text-white">{lines}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Level</p>
                      <p className="text-2xl font-bold text-yellow-400">{level}</p>
                    </div>
                  </div>
                </div>
                <Button onClick={startGame} className="bg-gradient-to-r from-cyan-600 to-blue-600 px-8 py-6 text-lg">
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Play Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-3xl shadow-2xl border border-cyan-500/30">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-white text-center">
              <div className="text-sm text-gray-400">Score</div>
              <div className="font-bold text-xl text-cyan-400">{score}</div>
            </div>
            <div className="text-white text-center">
              <div className="text-sm text-gray-400">Lines</div>
              <div className="font-bold text-xl text-green-400">{lines}</div>
            </div>
            <div className="text-white text-center">
              <div className="text-sm text-gray-400">Level</div>
              <div className="font-bold text-xl text-yellow-400">{level}</div>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={COLS * CELL_SIZE}
            height={ROWS * CELL_SIZE}
            className="border-4 border-cyan-500/50 rounded-xl shadow-2xl"
          />
          
          {/* Mobile Controls */}
          {isMobile && gameState === 'playing' && (
            <div className="mt-4 flex gap-2 justify-center">
              <Button
                onTouchStart={() => { movePiece(-1, 0); drawGame(canvasRef.current.getContext('2d')); }}
                className="bg-cyan-600 hover:bg-cyan-700 h-16 px-8 text-2xl"
              >
                ←
              </Button>
              <Button
                onTouchStart={() => { movePiece(0, 1); drawGame(canvasRef.current.getContext('2d')); }}
                className="bg-cyan-600 hover:bg-cyan-700 h-16 px-8 text-2xl"
              >
                ↓
              </Button>
              <Button
                onTouchStart={() => { rotatePiece(); drawGame(canvasRef.current.getContext('2d')); }}
                className="bg-yellow-600 hover:bg-yellow-700 h-16 px-8 text-2xl"
              >
                ↻
              </Button>
              <Button
                onTouchStart={() => { movePiece(1, 0); drawGame(canvasRef.current.getContext('2d')); }}
                className="bg-cyan-600 hover:bg-cyan-700 h-16 px-8 text-2xl"
              >
                →
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}