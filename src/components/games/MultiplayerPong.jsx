import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Users, Copy, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function MultiplayerPong({ currentUser, onExit }) {
  const queryClient = useQueryClient();
  const [gameMode, setGameMode] = useState('menu'); // menu, lobby, playing, gameover
  const [session, setSession] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const canvasRef = useRef(null);
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.GameSession.create({
        game_name: 'multiplayer-pong',
        host_email: currentUser.email,
        players: [currentUser.email],
        max_players: 2,
        status: 'waiting'
      });
    },
    onSuccess: (data) => {
      setSession(data);
      setIsHost(true);
      setGameMode('lobby');
      toast.success('Session created! Share the code with a friend');
    }
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['pong-sessions'],
    queryFn: async () => {
      return await base44.entities.GameSession.filter({
        game_name: 'multiplayer-pong',
        status: 'waiting'
      });
    },
    enabled: gameMode === 'menu',
    refetchInterval: 3000
  });

  const joinSessionMutation = useMutation({
    mutationFn: async (sessionId) => {
      const s = await base44.entities.GameSession.filter({ id: sessionId });
      const currentSession = s[0];
      
      if (!currentSession.players.includes(currentUser.email)) {
        await base44.entities.GameSession.update(sessionId, {
          players: [...currentSession.players, currentUser.email],
          status: 'in_progress'
        });
      }
      
      return await base44.entities.GameSession.filter({ id: sessionId }).then(r => r[0]);
    },
    onSuccess: (data) => {
      setSession(data);
      setIsHost(false);
      setGameMode('playing');
      startGame();
    }
  });

  const startGame = () => {
    // Simple pong implementation
    setScore1(0);
    setScore2(0);
    // Game would update via polling or real-time sync
  };

  const copySessionCode = () => {
    navigator.clipboard.writeText(session.id);
    toast.success('Session code copied!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative max-w-4xl w-full">
        <button onClick={onExit} className="absolute -top-12 right-0 p-2 bg-red-500 rounded-full hover:bg-red-600 z-10">
          <X className="w-6 h-6 text-white" />
        </button>

        {gameMode === 'menu' && (
          <div className="bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/20">
            <h2 className="text-5xl font-bold text-white mb-6 text-center flex items-center justify-center gap-3">
              <Users className="w-12 h-12" />
              Pong Battle
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Button
                onClick={() => createSessionMutation.mutate()}
                disabled={createSessionMutation.isPending}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-8 text-lg"
              >
                <Play className="w-6 h-6 mr-2" />
                Create Game
              </Button>

              <div className="bg-white/10 rounded-2xl p-4">
                <p className="text-white font-bold mb-3">Join Existing Game:</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => joinSessionMutation.mutate(s.id)}
                      className="w-full text-left p-3 bg-white/10 hover:bg-white/20 rounded-lg transition"
                    >
                      <p className="text-white text-sm">Host: {s.host_email.split('@')[0]}</p>
                      <p className="text-gray-400 text-xs">{s.players.length}/2 players</p>
                    </button>
                  ))}
                  {sessions.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-4">No games available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {gameMode === 'lobby' && session && (
          <div className="bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/20 text-center">
            <h3 className="text-3xl font-bold text-white mb-4">Waiting for Player 2...</h3>
            
            <div className="bg-purple-500/20 border-2 border-purple-500 rounded-xl p-6 mb-6">
              <p className="text-gray-300 mb-2">Session Code:</p>
              <div className="flex items-center justify-center gap-3">
                <p className="text-white text-3xl font-mono font-bold">{session.id.slice(0, 8)}</p>
                <Button
                  onClick={copySessionCode}
                  variant="outline"
                  size="sm"
                  className="border-white/20"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xl">
                {currentUser.email[0].toUpperCase()}
              </div>
              <p className="text-white text-xl">VS</p>
              <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            <p className="text-gray-400">Share the code with a friend to start</p>
          </div>
        )}

        {gameMode === 'playing' && (
          <div className="bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/20">
            <div className="flex items-center justify-between mb-6 text-white font-bold text-2xl">
              <div>Player 1: {score1}</div>
              <div>Player 2: {score2}</div>
            </div>
            
            <div className="bg-black rounded-xl p-4 h-96 flex items-center justify-center">
              <p className="text-white text-lg">
                {isHost ? 'Control with mouse' : 'Waiting for host...'}
              </p>
            </div>

            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">First to 5 points wins • Earn up to 1.5 SFC</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}