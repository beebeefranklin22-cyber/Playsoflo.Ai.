import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircleQuestion, ArrowUp, Pin, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function LivestreamQA({ streamId, isCreator, currentUser }) {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");

  const { data: questions = [] } = useQuery({
    queryKey: ['stream-qa', streamId],
    queryFn: () => base44.entities.QAQuestion.filter({ stream_id: streamId }),
    refetchInterval: 3000,
    initialData: []
  });

  const askMutation = useMutation({
    mutationFn: (data) => base44.entities.QAQuestion.create({
      ...data,
      stream_id: streamId,
      user_email: currentUser.email,
      user_name: currentUser.full_name || currentUser.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-qa'] });
      setQuestion("");
      toast.success('Question submitted!');
    }
  });

  const upvoteMutation = useMutation({
    mutationFn: async (questionId) => {
      const q = questions.find(q => q.id === questionId);
      await base44.asServiceRole.entities.QAQuestion.update(questionId, {
        upvotes: q.upvotes + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-qa'] });
    }
  });

  const answerMutation = useMutation({
    mutationFn: ({ questionId, answer }) => 
      base44.asServiceRole.entities.QAQuestion.update(questionId, {
        answer,
        status: 'answered'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-qa'] });
      toast.success('Answer posted!');
    }
  });

  const pinMutation = useMutation({
    mutationFn: (questionId) => 
      base44.asServiceRole.entities.QAQuestion.update(questionId, { status: 'pinned' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-qa'] });
    }
  });

  const sortedQuestions = [...questions].sort((a, b) => {
    if (a.status === 'pinned' && b.status !== 'pinned') return -1;
    if (a.status !== 'pinned' && b.status === 'pinned') return 1;
    return b.upvotes - a.upvotes;
  });

  return (
    <div className="space-y-4">
      <Card className="bg-white/10 border-white/20">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ask a question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && question && askMutation.mutate({ question })}
              className="bg-white/10 border-white/20 text-white flex-1"
            />
            <Button
              onClick={() => askMutation.mutate({ question })}
              disabled={!question}
              className="bg-blue-600"
            >
              Ask
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {sortedQuestions.map(q => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Card className={`${
                q.status === 'pinned' 
                  ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30' 
                  : q.status === 'answered'
                  ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30'
                  : 'bg-white/5 border-white/10'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => upvoteMutation.mutate(q.id)}
                      className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition"
                    >
                      <ArrowUp className="w-5 h-5" />
                      <span className="text-xs font-bold">{q.upvotes}</span>
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-purple-300 font-semibold text-sm">{q.user_name}</span>
                        {q.status === 'pinned' && <Pin className="w-4 h-4 text-yellow-400" />}
                        {q.status === 'answered' && <CheckCircle className="w-4 h-4 text-green-400" />}
                      </div>
                      <p className="text-white mb-2">{q.question}</p>
                      
                      {q.answer && (
                        <div className="mt-2 p-2 bg-green-500/20 rounded-lg">
                          <p className="text-green-300 text-sm font-semibold mb-1">Answer:</p>
                          <p className="text-white text-sm">{q.answer}</p>
                        </div>
                      )}

                      {isCreator && !q.answer && (
                        <div className="mt-2 flex gap-2">
                          <Input
                            placeholder="Type your answer..."
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && e.target.value) {
                                answerMutation.mutate({ questionId: q.id, answer: e.target.value });
                              }
                            }}
                            className="bg-white/10 border-white/20 text-white text-sm"
                          />
                          {q.status !== 'pinned' && (
                            <Button
                              onClick={() => pinMutation.mutate(q.id)}
                              size="sm"
                              variant="ghost"
                            >
                              <Pin className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}