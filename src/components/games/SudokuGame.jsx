import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Trophy, ShoppingBag, Settings, Lightbulb, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import GameShop from "./GameShop";
import GameSettings from "./GameSettings";

export default function SudokuGame({ currentUser, onExit }) {
  const [gameState, setGameState] = useState('menu');
  const [board, setBoard] = useState([]);
  const [solution, setSolution] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(3);
  const [showShop, setShowShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [equippedItems, setEquippedItems] = useState({});
  const [settings, setSettings] = useState({ soundEnabled: true, visualEffects: true });
  const [time, setTime] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (currentUser) loadEquippedItems();
  }, [currentUser]);

  const loadEquippedItems = async () => {
    try {
      const inventory = await base44.entities.UserInventory.filter({
        user_email: currentUser.email,
        game_name: 'sudoku',
        is_equipped: true
      });
      const items = {};
      inventory.forEach(item => items[item.item_type] = item);
      setEquippedItems(items);
      
      if (items.boost?.item_name === "Extra Hints") {
        setHints(5);
      }
    } catch (error) {
      console.error('Failed to load equipped items:', error);
    }
  };

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => setTime(prev => prev + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [gameState]);

  const playSound = (type) => {
    if (!settings.soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      switch(type) {
        case 'place': oscillator.frequency.value = 600; gainNode.gain.value = 0.1; break;
        case 'error': oscillator.frequency.value = 200; gainNode.gain.value = 0.2; break;
        case 'complete': oscillator.frequency.value = 1000; gainNode.gain.value = 0.15; break;
      }
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.08);
    } catch (e) {}
  };

  const generateSudoku = () => {
    const base = [
      [5,3,4,6,7,8,9,1,2],
      [6,7,2,1,9,5,3,4,8],
      [1,9,8,3,4,2,5,6,7],
      [8,5,9,7,6,1,4,2,3],
      [4,2,6,8,5,3,7,9,1],
      [7,1,3,9,2,4,8,5,6],
      [9,6,1,5,3,7,2,8,4],
      [2,8,7,4,1,9,6,3,5],
      [3,4,5,2,8,6,1,7,9]
    ];

    // Shuffle
    const shuffled = JSON.parse(JSON.stringify(base));
    for (let i = 0; i < 20; i++) {
      const r1 = Math.floor(Math.random() * 9);
      const r2 = Math.floor(Math.random() * 9);
      [shuffled[r1], shuffled[r2]] = [shuffled[r2], shuffled[r1]];
    }

    setSolution(shuffled);

    // Remove numbers based on difficulty
    const puzzle = shuffled.map(row => row.map(cell => ({ value: cell, isOriginal: false })));
    const cellsToKeep = settings.difficulty === 'easy' ? 45 : settings.difficulty === 'medium' ? 35 : 25;
    let kept = 0;
    
    while (kept < cellsToKeep) {
      const row = Math.floor(Math.random() * 9);
      const col = Math.floor(Math.random() * 9);
      if (!puzzle[row][col].isOriginal) {
        puzzle[row][col].isOriginal = true;
        kept++;
      }
    }

    puzzle.forEach(row => row.forEach(cell => {
      if (!cell.isOriginal) cell.value = 0;
    }));

    setBoard(puzzle);
  };

  const startGame = () => {
    setMistakes(0);
    setTime(0);
    setHints(equippedItems.boost?.item_name === "Extra Hints" ? 5 : 3);
    generateSudoku();
    setGameState('playing');
  };

  const handleCellClick = (row, col) => {
    if (board[row][col].isOriginal) return;
    setSelectedCell({ row, col });
  };

  const handleNumberInput = (num) => {
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    
    const newBoard = [...board];
    newBoard[row][col].value = num;
    setBoard(newBoard);

    if (num !== 0 && num !== solution[row][col]) {
      setMistakes(prev => prev + 1);
      playSound('error');
      if (mistakes >= 2) endGame();
    } else if (num !== 0) {
      playSound('place');
    }

    // Check win
    if (newBoard.every((row, r) => row.every((cell, c) => cell.value === solution[r][c]))) {
      playSound('complete');
      setTimeout(() => endGame(true), 500);
    }
  };

  const useHint = () => {
    if (hints <= 0 || !selectedCell) return;
    const { row, col } = selectedCell;
    
    const newBoard = [...board];
    newBoard[row][col].value = solution[row][col];
    newBoard[row][col].isOriginal = true;
    setBoard(newBoard);
    setHints(prev => prev - 1);
    playSound('place');
  };

  const endGame = async (won = false) => {
    setGameState('gameover');

    if (!currentUser) return;

    try {
      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'sudoku',
        score: won ? Math.max(1000 - time * 2 - mistakes * 100, 100) : 0,
        duration_seconds: time,
        reward_earned: won ? 10 : 0
      });
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  const themeColor = equippedItems.skin?.effect_data?.color || '#8b5cf6';

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-950 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowSettings(true)} className="p-3 bg-gray-700/80 backdrop-blur-sm rounded-full hover:bg-gray-600 transition shadow-lg">
          <Settings className="w-6 h-6 text-white" />
        </motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowShop(true)} className="p-3 bg-purple-600/80 backdrop-blur-sm rounded-full hover:bg-purple-700 transition shadow-lg">
          <ShoppingBag className="w-6 h-6 text-white" />
        </motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onExit} className="p-3 bg-red-500/80 backdrop-blur-sm rounded-full hover:bg-red-600 transition shadow-lg">
          <X className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      <AnimatePresence>
        {gameState === 'menu' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
            <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-8xl mb-6">🧩</motion.div>
            <motion.h2 initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-7xl font-black text-white mb-4 drop-shadow-2xl">SUDOKU</motion.h2>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-purple-200 text-xl mb-8">Fill the grid with numbers 1-9</motion.p>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: "spring" }}>
              <Button onClick={startGame} className="bg-gradient-to-r from-purple-600 to-pink-600 px-12 py-8 text-2xl shadow-2xl">
                <Play className="w-8 h-8 mr-3" />
                START PUZZLE
              </Button>
            </motion.div>
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", duration: 0.8 }}>
              <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-8" />
            </motion.div>
            <motion.h3 initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-6xl font-bold text-white mb-6">PUZZLE COMPLETE!</motion.h3>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring" }} className="bg-purple-600/30 rounded-3xl p-8 mb-8 border-2 border-purple-400/50">
              <p className="text-gray-200 text-xl mb-2">Time</p>
              <p className="text-5xl font-black text-purple-400">{Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}</p>
              <p className="text-yellow-400 text-lg mt-2">Mistakes: {mistakes}</p>
            </motion.div>
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}>
              <Button onClick={startGame} className="bg-gradient-to-r from-purple-600 to-pink-600 px-10 py-7 text-xl">PLAY AGAIN</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {gameState === 'playing' && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-2xl w-full">
          <div className="bg-black/60 backdrop-blur-md rounded-3xl p-6 border-2 border-purple-500/40">
            <div className="flex justify-between items-center mb-4">
              <div className="text-white space-x-6">
                <span className="font-bold">Time: {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}</span>
                <span className="font-bold text-red-400">Mistakes: {mistakes}/3</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={useHint} disabled={hints === 0} size="sm" className="bg-yellow-600">
                  <Lightbulb className="w-4 h-4 mr-1" />
                  Hint ({hints})
                </Button>
                <Button onClick={startGame} size="sm" variant="outline">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-9 gap-0 bg-white/10 p-1 rounded-xl">
              {board.map((row, rowIdx) => row.map((cell, colIdx) => (
                <button
                  key={`${rowIdx}-${colIdx}`}
                  onClick={() => handleCellClick(rowIdx, colIdx)}
                  disabled={cell.isOriginal}
                  style={{ backgroundColor: selectedCell?.row === rowIdx && selectedCell?.col === colIdx ? themeColor : undefined }}
                  className={`aspect-square flex items-center justify-center text-xl font-bold transition ${
                    cell.isOriginal ? 'bg-gray-700 text-white cursor-not-allowed' : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
                  } ${(colIdx + 1) % 3 === 0 && colIdx < 8 ? 'border-r-2 border-purple-500' : ''} ${(rowIdx + 1) % 3 === 0 && rowIdx < 8 ? 'border-b-2 border-purple-500' : ''}`}
                >
                  {cell.value !== 0 ? cell.value : ''}
                </button>
              )))}
            </div>

            <div className="grid grid-cols-9 gap-2 mt-4">
              {[1,2,3,4,5,6,7,8,9].map(num => (
                <Button key={num} onClick={() => handleNumberInput(num)} className="bg-gradient-to-br from-purple-600 to-pink-600 text-xl font-bold">{num}</Button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {showShop && <GameShop currentUser={currentUser} gameName="sudoku" onClose={() => { setShowShop(false); loadEquippedItems(); }} />}
      <GameSettings isOpen={showSettings} onClose={() => setShowSettings(false)} gameName="sudoku" onSettingsChange={setSettings} />
    </div>
  );
}