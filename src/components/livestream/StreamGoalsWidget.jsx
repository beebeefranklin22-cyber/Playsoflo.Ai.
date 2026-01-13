import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Target, TrendingUp, Users, DollarSign } from "lucide-react";
import { motion } from "framer-motion";

export default function StreamGoalsWidget({ streamId }) {
  const { data: goals = [] } = useQuery({
    queryKey: ['stream-goals', streamId],
    queryFn: () => base44.entities.StreamGoal.filter({
      stream_id: streamId,
      is_active: true
    }),
    enabled: !!streamId,
    refetchInterval: 3000
  });

  if (goals.length === 0) return null;

  const getIcon = (type) => {
    switch(type) {
      case 'viewers': return Users;
      case 'subscribers': return TrendingUp;
      case 'donations':
      case 'tips': return DollarSign;
      default: return Target;
    }
  };

  return (
    <div className="space-y-3">
      {goals.map(goal => {
        const Icon = getIcon(goal.goal_type);
        const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
        const isCompleted = goal.current_amount >= goal.target_amount;

        return (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className={`bg-gradient-to-br ${
              isCompleted 
                ? 'from-green-600/20 to-emerald-600/20 border-green-500/50' 
                : 'from-purple-600/20 to-pink-600/20 border-purple-500/30'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-purple-400" />
                    <span className="text-white font-semibold">
                      {goal.goal_title || `${goal.goal_type} Goal`}
                    </span>
                  </div>
                  {isCompleted && (
                    <span className="text-green-400 text-sm font-bold">✓ Completed!</span>
                  )}
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">
                      {goal.current_amount} / {goal.target_amount}
                    </span>
                    <span className="text-purple-400 font-bold">
                      {Math.floor(progress)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                      className={`h-full ${
                        isCompleted 
                          ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                          : 'bg-gradient-to-r from-purple-400 to-pink-500'
                      }`}
                    />
                  </div>
                </div>

                {goal.goal_description && (
                  <p className="text-gray-400 text-xs">{goal.goal_description}</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}