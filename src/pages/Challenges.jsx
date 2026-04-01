import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Flame, TrendingUp, Users, Play, Plus, X, 
  Calendar, Award, Music, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function Challenges() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [challengeForm, setChallengeForm] = useState({
    challenge_name: "",
    hashtag: "",
    description: "",
    category: "trending",
    prize_description: ""
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.log("Not authenticated");
      }
    };
    fetchUser();
  }, []);

  const { data: challenges = [] } = useQuery({
    queryKey: ['all-challenges'],
    queryFn: async () => {
      return await base44.entities.Challenge.filter({ is_active: true }, '-total_views');
    }
  });

  const createChallengeMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Challenge.create({
        ...data,
        creator_email: currentUser.email,
        start_date: new Date().toISOString(),
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-challenges'] });
      toast.success('Challenge created! 🔥');
      setShowCreateModal(false);
      setChallengeForm({
        challenge_name: "",
        hashtag: "",
        description: "",
        category: "trending",
        prize_description: ""
      });
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 p-6 pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-2">
              <Flame className="w-10 h-10 text-orange-500" />
              Hashtag Challenges
            </h1>
            <p className="text-gray-400">Join trending challenges and win prizes</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Challenge
          </Button>
        </div>

        {/* Challenges Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((challenge, index) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="bg-white/5 border-white/10 hover:border-purple-500/50 transition group cursor-pointer"
                onClick={() => navigate(createPageUrl("Discover") + `?challenge=${challenge.id}`)}
              >
                <CardContent className="p-0">
                  {/* Banner */}
                  <div className="relative aspect-video bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center overflow-hidden">
                    <Flame className="w-20 h-20 text-white/20" />
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-red-500 text-white border-0">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Trending
                      </Badge>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-white font-bold text-xl mb-2">{challenge.challenge_name}</h3>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">{challenge.description}</p>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-purple-500/20 text-purple-300">
                        #{challenge.hashtag}
                      </Badge>
                      <Badge className="bg-blue-500/20 text-blue-300">
                        {challenge.category}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Play className="w-4 h-4 text-purple-400" />
                        {challenge.total_videos || 0} videos
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <Users className="w-4 h-4 text-pink-400" />
                        {(challenge.total_views || 0).toLocaleString()} views
                      </div>
                    </div>

                    {challenge.prize_description && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 text-yellow-300 text-sm">
                          <Award className="w-4 h-4" />
                          <span className="font-semibold">{challenge.prize_description}</span>
                        </div>
                      </div>
                    )}

                    <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Join Challenge
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Create Challenge Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 border border-white/20"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white">Create Challenge</h2>
                <button onClick={() => setShowCreateModal(false)}>
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-white text-sm mb-2 block">Challenge Name</label>
                  <Input
                    value={challengeForm.challenge_name}
                    onChange={(e) => setChallengeForm({...challengeForm, challenge_name: e.target.value})}
                    placeholder="e.g., Dance Battle 2026"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <label className="text-white text-sm mb-2 block">Hashtag</label>
                  <Input
                    value={challengeForm.hashtag}
                    onChange={(e) => setChallengeForm({...challengeForm, hashtag: e.target.value.replace(/^#/, '')})}
                    placeholder="e.g., dancebattle2026"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <label className="text-white text-sm mb-2 block">Description</label>
                  <Textarea
                    value={challengeForm.description}
                    onChange={(e) => setChallengeForm({...challengeForm, description: e.target.value})}
                    placeholder="Describe your challenge..."
                    className="bg-white/10 border-white/20 text-white min-h-24"
                  />
                </div>
                <div>
                  <label className="text-white text-sm mb-2 block">Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['trending', 'dance', 'comedy', 'fitness', 'music', 'art'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setChallengeForm({...challengeForm, category: cat})}
                        className={`p-2 rounded-lg text-sm capitalize ${
                          challengeForm.category === cat
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/10 text-gray-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-white text-sm mb-2 block">Prize (Optional)</label>
                  <Input
                    value={challengeForm.prize_description}
                    onChange={(e) => setChallengeForm({...challengeForm, prize_description: e.target.value})}
                    placeholder="e.g., $500 cash prize"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <Button
                  onClick={() => createChallengeMutation.mutate(challengeForm)}
                  disabled={!challengeForm.challenge_name || !challengeForm.hashtag || createChallengeMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-6 text-lg font-bold"
                >
                  {createChallengeMutation.isPending ? 'Creating...' : 'Launch Challenge'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}