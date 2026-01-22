import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { UserPlus, Clock, CheckCircle, Sparkles, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function JoinRequestButton({ streamId, currentUser, isCreator }) {
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Check if user already has a request or is participating
  const { data: myParticipation } = useQuery({
    queryKey: ['my-costream-status', streamId, currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return null;
      const participants = await base44.entities.CoStreamParticipant.filter({
        stream_id: streamId,
        participant_email: currentUser.email
      });
      return participants[0];
    },
    enabled: !!currentUser && !!streamId && !isCreator
  });

  // Count active co-hosts
  const { data: activeCoHosts = [] } = useQuery({
    queryKey: ['active-cohosts', streamId],
    queryFn: async () => {
      return await base44.entities.CoStreamParticipant.filter({
        stream_id: streamId,
        status: 'accepted'
      });
    },
    enabled: !!streamId
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.CoStreamParticipant.create({
        stream_id: streamId,
        participant_email: currentUser.email,
        status: 'requested',
        can_broadcast: true,
        can_moderate: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-costream-status']);
      queryClient.invalidateQueries(['join-requests']);
      toast.success('Request sent! Waiting for host approval.');
    },
    onError: () => {
      toast.error('Failed to send request');
    }
  });

  const cancelRequestMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.CoStreamParticipant.delete(myParticipation.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-costream-status']);
      toast.success('Request cancelled');
    }
  });

  if (isCreator) return null;
  if (!currentUser) return null;

  // User is already accepted co-host
  if (myParticipation?.status === 'accepted') {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative"
      >
        <Button
          disabled
          size="sm"
          className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/40 shadow-lg shadow-green-500/20"
        >
          <motion.div
            animate={{ rotate: [0, 15, 0] }}
            transition={{ duration: 0.5, repeat: 2 }}
          >
            <Sparkles className="w-4 h-4 mr-2" />
          </motion.div>
          You're Co-Hosting
        </Button>
        <motion.div
          className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>
    );
  }

  // User has pending request
  if (myParticipation?.status === 'requested') {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative group"
      >
        <Button
          onClick={() => {
            setShowConfirm(true);
            setTimeout(() => {
              cancelRequestMutation.mutate();
              setShowConfirm(false);
            }, 100);
          }}
          size="sm"
          className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border border-yellow-500/40 hover:border-red-500/40 hover:text-red-400 transition-all shadow-lg shadow-yellow-500/10"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Clock className="w-4 h-4 mr-2" />
          </motion.div>
          <span className="group-hover:hidden">Pending</span>
          <span className="hidden group-hover:inline">Cancel</span>
        </Button>
        <motion.div
          className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full"
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </motion.div>
    );
  }

  // User was declined or no request yet
  const coHostLimit = 4;
  const atCapacity = activeCoHosts.length >= coHostLimit;

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={() => setShowConfirm(true)}
          disabled={atCapacity || requestMutation.isPending}
          size="sm"
          className={`relative overflow-hidden ${
            atCapacity 
              ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' 
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/30 border-0'
          }`}
        >
          {requestMutation.isPending ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Clock className="w-4 h-4 mr-2" />
            </motion.div>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              {atCapacity ? `Full (${coHostLimit}/${coHostLimit})` : 'Request to Join'}
            </>
          )}
          {!atCapacity && !requestMutation.isPending && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: [-200, 200] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            />
          )}
        </Button>
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="text-gray-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h3 className="text-white font-bold text-xl mb-2">Request to Co-Host?</h3>
              <p className="text-gray-400 text-sm mb-6">
                You'll be able to broadcast video and audio if the host approves your request. Up to 4 co-hosts can join at once.
              </p>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowConfirm(false)}
                  variant="outline"
                  className="flex-1 border-white/20 hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    requestMutation.mutate();
                    setShowConfirm(false);
                  }}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Send Request
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}