import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Trophy, ShoppingBag, Settings, Swords } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import GameShop from "./GameShop";
import GameSettings from "./GameSettings";

export default function MultiplayerCards({ currentUser, onExit }) {
  const [gameState, setGameState] = useState('menu');
  const [playerHealth, setPlayerHealth] = useState(30);
  const [opponentHealth, setOpponentHealth] = useState(30);
  const [playerHand, setPlayerHand] = useState([]);
  const [opponentHand, setOpponentHand] = useState([]);
  const [playerMana, setPlayerMana] = useState(1);
  const [opponentMana, setOpponentMana] = useState(1);
  const [turn, setTurn] = useState('player');
  const [showShop, setShowShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [equippedItems, setEquippedItems] = useState({});
  const [settings, setSettings] = useState({ soundEnabled: true, visualEffects: true });

  const cardTypes = [
    { name: 'Strike', cost: 1, damage: 3, type: 'attack' },
    { name: 'Defend', cost: 1, shield: 5, type: 'defense' },
    { name: 'Fireball', cost: 2, damage: 5, type: 'attack' },
    { name: 'Heal', cost: 2, heal: 4, type: 'heal' },
    { name: 'Lightning', cost: 3, damage: 8, type: 'attack' },
    { name: 'Barrier', cost: 2, shield: 8, type: 'defense' }
  ];

  useEffect(() => {
    if (currentUser) loadEquippedItems();
  }, [currentUser]);

  const loadEquippedItems = async () => {
    try {
      const inventory = await base44.entities.UserInventory.filter({
        user_email: currentUser.email,
        game_name: 'card-battle',
        is_equipped: true
      });
      const items = {};
      inventory.forEach(item => items[item.item_type] = item);
      setEquippedItems(items);
    } catch (error) {
      console.error('Failed to load equipped items:', error);
    }
  };

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
        case 'attack': oscillator.frequency.value = 300; gainNode.gain.value = 0.15; break;
        case 'defend': oscillator.frequency.value = 500; gainNode.gain.value = 0.12; break;
        case 'win': oscillator.frequency.value = 800; gainNode.gain.value = 0.18; break;
      }
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
  };

  const drawCards = (count) => {
    const cards = [];
    for (let i = 0; i < count; i++) {
      cards.push(cardTypes[Math.floor(Math.random() * cardTypes.length)]);
    }
    return cards;
  };

  const startGame = () => {
    setPlayerHealth(30);
    setOpponentHealth(30);
    setPlayerMana(1);
    setOpponentMana(1);
    setTurn('player');
    setPlayerHand(drawCards(5));
    setOpponentHand(drawCards(5));
    setGameState('playing');
  };

  const playCard = (card, index) => {
    if (turn !== 'player' || playerMana < card.cost) {
      toast.error('Not enough mana!');
      return;
    }

    setPlayerMana(prev => prev - card.cost);
    const newHand = [...playerHand];
    newHand.splice(index, 1);
    setPlayerHand(newHand);

    const damageMultiplier = equippedItems.boost?.effect_data?.score_multiplier || 1;

    if (card.type === 'attack') {
      setOpponentHealth(prev => Math.max(0, prev - Math.floor(card.damage * damageMultiplier)));
      playSound('attack');
    } else if (card.type === 'heal') {
      setPlayerHealth(prev => Math.min(30, prev + card.heal));
      playSound('defend');
    }

    setTimeout(() => opponentTurn(), 1000);
  };

  const opponentTurn = () => {
    setTurn('opponent');
    
    setTimeout(() => {
      const affordableCards = opponentHand.filter(c => c.cost <= opponentMana);
      if (affordableCards.length > 0) {
        const card = affordableCards[Math.floor(Math.random() * affordableCards.length)];
        setOpponentMana(prev => prev - card.cost);
        setOpponentHand(prev => prev.filter(c => c !== card));
        
        if (card.type === 'attack') {
          setPlayerHealth(prev => {
            const newHealth = Math.max(0, prev - card.damage);
            if (newHealth <= 0) endGame(false);
            return newHealth;
          });
          playSound('attack');
        }
      }
      
      setTurn('player');
      setPlayerMana(prev => Math.min(10, prev + 1));
      setOpponentMana(prev => Math.min(10, prev + 1));
      setPlayerHand(prev => [...prev, ...drawCards(1)]);
      setOpponentHand(prev => [...prev, ...drawCards(1)]);
    }, 1500);
  };

  useEffect(() => {
    if (opponentHealth <= 0) endGame(true);
  }, [opponentHealth]);

  const endGame = async (won) => {
    setGameState('gameover');

    if (!currentUser) return;

    try {
      await base44.entities.GameScore.create({
        user_email: currentUser.email,
        game_name: 'card-battle',
        score: won ? 1000 : 0,
        duration_seconds: 0,
        reward_earned: won ? 20 : 5
      });
      if (won) playSound('win');
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  const cardBgColor = equippedItems.skin?.effect_data?.color || '#6366f1';

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-950 via-purple-950 to-indigo-950 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowSettings(true)} className="p-3 bg-gray-700/80 backdrop-blur-sm rounded-full shadow-lg">
          <Settings className="w-6 h-6 text-white" />
        </motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowShop(true)} className="p-3 bg-purple-600/80 backdrop-blur-sm rounded-full shadow-lg">
          <ShoppingBag className="w-6 h-6 text-white" />
        </motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onExit} className="p-3 bg-red-500/80 backdrop-blur-sm rounded-full shadow-lg">
          <X className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      <AnimatePresence>
        {gameState === 'menu' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
            <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-8xl mb-6">🃏</motion.div>
            <motion.h2 initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-7xl font-black text-white mb-4">CARD BATTLE</motion.h2>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-indigo-200 text-xl mb-8">Strategic turn-based card combat!</motion.p>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: "spring" }}>
              <Button onClick={startGame} className="bg-gradient-to-r from-indigo-600 to-purple-600 px-12 py-8 text-2xl shadow-2xl">
                <Play className="w-8 h-8 mr-3" />
                START BATTLE
              </Button>
            </motion.div>
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-8" />
            <h3 className="text-6xl font-bold text-white mb-6">{playerHealth > 0 ? 'VICTORY!' : 'DEFEAT!'}</h3>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }} className="bg-indigo-600/30 rounded-3xl p-8 mb-8 border-2 border-indigo-400/50">
              <p className="text-white text-2xl">{playerHealth > 0 ? '🏆 You Won!' : '💀 You Lost!'}</p>
            </motion.div>
            <Button onClick={startGame} className="bg-gradient-to-r from-indigo-600 to-purple-600 px-10 py-7 text-xl">BATTLE AGAIN</Button>
          </motion.div>
        )}
      </AnimatePresence>

      {gameState === 'playing' && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-4xl w-full">
          <div className="bg-black/60 backdrop-blur-md rounded-3xl p-6 border-2 border-indigo-500/40">
            {/* Opponent */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <div className="text-white">
                  <div className="text-sm text-gray-400">Opponent</div>
                  <div className="text-2xl font-bold text-red-400">❤️ {opponentHealth}</div>
                </div>
                <div className="text-white">
                  <div className="text-sm text-gray-400">Mana</div>
                  <div className="text-xl font-bold text-blue-400">💎 {opponentMana}</div>
                </div>
              </div>
              <div className="flex gap-2 justify-center">
                {opponentHand.map((card, idx) => (
                  <div key={idx} className="w-20 h-28 bg-indigo-900 rounded-lg border-2 border-indigo-500" />
                ))}
              </div>
            </div>

            {/* Turn indicator */}
            <div className="text-center mb-4">
              <span className={`px-6 py-2 rounded-full font-bold ${turn === 'player' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-400'}`}>
                {turn === 'player' ? 'YOUR TURN' : "OPPONENT'S TURN"}
              </span>
            </div>

            {/* Player */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="text-white">
                  <div className="text-sm text-gray-400">You</div>
                  <div className="text-2xl font-bold text-green-400">❤️ {playerHealth}</div>
                </div>
                <div className="text-white">
                  <div className="text-sm text-gray-400">Mana</div>
                  <div className="text-xl font-bold text-cyan-400">💎 {playerMana}</div>
                </div>
              </div>
              <div className="flex gap-2 justify-center flex-wrap">
                {playerHand.map((card, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.05, y: -10 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => playCard(card, idx)}
                    disabled={turn !== 'player' || playerMana < card.cost}
                    style={{ backgroundColor: cardBgColor }}
                    className="w-24 h-32 rounded-xl border-2 border-white/30 p-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                  >
                    <div className="text-white">
                      <div className="text-xs font-bold">{card.name}</div>
                      <div className="text-2xl my-2">
                        {card.type === 'attack' ? '⚔️' : card.type === 'defense' ? '🛡️' : '❤️'}
                      </div>
                      <div className="text-xs">{card.damage ? `${card.damage} DMG` : card.shield ? `${card.shield} DEF` : `${card.heal} HP`}</div>
                      <div className="text-xs text-cyan-300 mt-1">💎 {card.cost}</div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {showShop && <GameShop currentUser={currentUser} gameName="card-battle" onClose={() => { setShowShop(false); loadEquippedItems(); }} />}
      <GameSettings isOpen={showSettings} onClose={() => setShowSettings(false)} gameName="card-battle" onSettingsChange={setSettings} />
    </div>
  );
}