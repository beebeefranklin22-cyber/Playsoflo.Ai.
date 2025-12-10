import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Plus, X, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function LivestreamPolls({ streamId, isCreator, currentUser }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [pollForm, setPollForm] = useState({
    question: "",
    options: ["", ""],
    duration_seconds: 60
  });

  const { data: polls = [] } = useQuery({
    queryKey: ['stream-polls', streamId],
    queryFn: () => base44.entities.LivestreamPoll.filter({ stream_id: streamId, status: 'active' }),
    refetchInterval: 3000,
    initialData: []
  });

  const { data: myVotes = [] } = useQuery({
    queryKey: ['my-poll-votes', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.PollVote.filter({ user_email: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const createPollMutation = useMutation({
    mutationFn: async (data) => {
      const endsAt = new Date();
      endsAt.setSeconds(endsAt.getSeconds() + data.duration_seconds);
      
      return await base44.entities.LivestreamPoll.create({
        ...data,
        stream_id: streamId,
        creator_email: currentUser.email,
        ends_at: endsAt.toISOString(),
        options: data.options.map((text, idx) => ({ id: idx, text, votes: 0 }))
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-polls'] });
      setShowCreate(false);
      setPollForm({ question: "", options: ["", ""], duration_seconds: 60 });
      toast.success('Poll created!');
    }
  });

  const voteMutation = useMutation({
    mutationFn: async ({ pollId, optionId }) => {
      await base44.entities.PollVote.create({
        poll_id: pollId,
        user_email: currentUser.email,
        option_id: optionId
      });

      const poll = polls.find(p => p.id === pollId);
      const updatedOptions = poll.options.map(opt => 
        opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
      );
      
      await base44.asServiceRole.entities.LivestreamPoll.update(pollId, {
        options: updatedOptions
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-polls'] });
      queryClient.invalidateQueries({ queryKey: ['my-poll-votes'] });
      toast.success('Vote recorded!');
    }
  });

  const addOption = () => {
    setPollForm({ ...pollForm, options: [...pollForm.options, ""] });
  };

  const removeOption = (idx) => {
    setPollForm({ ...pollForm, options: pollForm.options.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-4">
      {isCreator && (
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Poll
        </Button>
      )}

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-white/10 border-white/20">
              <CardContent className="p-4 space-y-3">
                <Input
                  placeholder="Poll Question"
                  value={pollForm.question}
                  onChange={(e) => setPollForm({ ...pollForm, question: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
                {pollForm.options.map((option, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder={`Option ${idx + 1}`}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...pollForm.options];
                        newOptions[idx] = e.target.value;
                        setPollForm({ ...pollForm, options: newOptions });
                      }}
                      className="bg-white/10 border-white/20 text-white flex-1"
                    />
                    {pollForm.options.length > 2 && (
                      <Button onClick={() => removeOption(idx)} size="icon" variant="ghost">
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button onClick={addOption} variant="outline" className="w-full">
                  Add Option
                </Button>
                <Input
                  type="number"
                  placeholder="Duration (seconds)"
                  value={pollForm.duration_seconds}
                  onChange={(e) => setPollForm({ ...pollForm, duration_seconds: Number(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white"
                />
                <Button
                  onClick={() => createPollMutation.mutate(pollForm)}
                  disabled={!pollForm.question || pollForm.options.some(o => !o)}
                  className="w-full bg-blue-600"
                >
                  Launch Poll
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {polls.map(poll => {
        const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
        const hasVoted = myVotes.some(v => v.poll_id === poll.id);

        return (
          <motion.div
            key={poll.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  {poll.question}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {poll.options.map(option => {
                  const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => !hasVoted && voteMutation.mutate({ pollId: poll.id, optionId: option.id })}
                      disabled={hasVoted}
                      className="w-full p-3 bg-white/10 hover:bg-white/20 rounded-lg transition relative overflow-hidden disabled:cursor-not-allowed"
                    >
                      <div
                        className="absolute inset-0 bg-blue-600/30"
                        style={{ width: `${percentage}%` }}
                      />
                      <div className="relative flex items-center justify-between">
                        <span className="text-white font-medium">{option.text}</span>
                        <div className="flex items-center gap-2">
                          {hasVoted && <CheckCircle className="w-4 h-4 text-green-400" />}
                          <span className="text-white font-bold">{percentage.toFixed(0)}%</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
                <p className="text-gray-400 text-sm text-center mt-2">
                  {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}