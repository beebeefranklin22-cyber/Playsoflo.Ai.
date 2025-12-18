import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function PongGame({ currentUser, onExit }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const gameLoopRef = useRef(null);
  const ballRef = useRef({ x: 200, y: 150, dx: 3, dy: 3 });
  const playerRef = useRef({ x: 10, y: 120, width: 10, height: 60 });
  const aiRef = useRef({ x: 380, y: 120, width: 10, height: 60 });
  const startTimeRef = useRef(null);

  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 300;

  useEffect(() => {
    if (gameState === 'playing') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const gameLoop = setInterval(() => {
        updateGame();
        drawGame(ctx);
      }, 1000 / 60);

      gameLoopRef.current = gameLoop;
      return () => clearInterval(gameLoop);
    }
  }, [gameState]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (gameState !== 'playing') return;
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;
      playerRef.current.y = Math.max(0, Math.min(CANVAS_HEIGHT - playerRef.current.height, y - playerRef.current.height / 2));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [gameState]);

  const startGame = () => {
    ballRef.current = { x: 200, y: 150, dx: 3, dy: 3 };
    setScore(0);
    setAiScore(0);
    setGameState('playing');
    startTimeRef.current = Date.now();
  };

  const updateGame = () => {
    const ball = ballRef.current;
    const player = playerRef.current;
    const ai = aiRef.current;

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Ball collision with top/bottom
    if (ball.y <= 0 || ball.y >= CANVAS_HEIGHT) {
      ball.dy = -ball.dy;
    }

    // Ball collision with paddles
    if (ball.x <= player.x + player.width && ball.y >= player.y && ball.y <= player.y + player.height) {
      ball.dx = Math.abs(ball.dx);
    }
    if (ball.x >= ai.x && ball.y >= ai.y && ball.y <= ai.y + ai.height) {
      ball.dx = -Math.abs(ball.dx);
    }

    // AI movement
    if (ball.y < ai.y + ai.height / 2) {
      ai.y = Math.max(0, ai.y - 2.5);
    } else {
      ai.y = Math.min(CANVAS_HEIGHT - ai.height, ai.y + 2.5);
    }

    // Scoring
    if (ball.x < 0) {
      setAiScore(prev => prev + 1);
      resetBall();
    }
    if (ball.x > CANVAS_WIDTH) {
      setScore(prev => prev + 1);
      resetBall();
    }

    // Check win condition
    if (score >= 5 || aiScore >= 5) {
      endGame();
    }
  };

  const resetBall = () => {
    ballRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      dx: (Math.random() > 0.5 ? 1 : -1) * 3,
      dy: (Math.random() > 0.5 ? 1 : -1) * 3
    };
  };

  const drawGame = (ctx) => {
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw center line
    ctx.strokeStyle = '#333';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(playerRef.current.x, playerRef.current.y, playerRef.current.width, playerRef.current.height);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(aiRef.current.x, aiRef.current.y, aiRef.current.width, aiRef.current.height);

    // Draw ball
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ballRef.current.x, ballRef.current.y, 5, 0, Math.PI * 2);
    ctx.fill();
  };

  const endGame = async () => {
    setGameState('gameover');
    
    if (!currentUser || score < aiScore) return;

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const finalScore = score * 10;

    try {
      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'pong',
        score: finalScore,
        duration_seconds: duration,
        reward_earned: 0
      });

      if (score > aiScore) {
        toast.success(`🎮 Victory! Final Score: ${finalScore}`);
      }
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative">
        <button onClick={onExit} className="absolute -top-12 right-0 p-2 bg-red-500 rounded-full hover:bg-red-600">
          <X className="w-6 h-6 text-white" />
        </button>

        {gameState === 'menu' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-4">🏓 Retro Pong</h2>
              <p className="text-gray-400 mb-4">Move mouse to control paddle • First to 5 wins</p>
              <Button onClick={startGame} className="bg-purple-600 hover:bg-purple-700 px-8 py-6 text-lg">
                <Play className="w-5 h-5 mr-2" />
                Start Game
              </Button>
            </div>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="text-center">
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-white mb-2">
                {score > aiScore ? 'You Win!' : 'AI Wins!'}
              </h3>
              <p className="text-gray-400 mb-4">{score} - {aiScore}</p>
              <Button onClick={startGame} className="bg-purple-600 hover:bg-purple-700">
                Play Again
              </Button>
            </div>
          </div>
        )}

        <div className="bg-gray-900 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4 text-white font-bold text-2xl">
            <div>You: {score}</div>
            <div>AI: {aiScore}</div>
          </div>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border-2 border-purple-500 rounded cursor-none"
          />
        </div>
      </motion.div>
    </div>
  );
}