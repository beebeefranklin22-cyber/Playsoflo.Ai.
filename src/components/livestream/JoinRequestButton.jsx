import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { UserPlus, Clock, CheckCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function JoinRequestButton({ streamId, currentUser, isCreator }) {
  const queryClient = useQueryClient();
  
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
      <Button
        disabled
        size="sm"
        className="bg-green-500/20 text-green-400 border border-green-500/30"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Co-Host
      </Button>
    );
  }

  // User has pending request
  if (myParticipation?.status === 'requested') {
    return (
      <Button
        onClick={() => cancelRequestMutation.mutate()}
        size="sm"
        variant="ghost"
        className="text-yellow-400 hover:text-yellow-500"
      >
        <Clock className="w-4 h-4 mr-2" />
        Request Pending
      </Button>
    );
  }

  // User was declined or no request yet
  const coHostLimit = 4;
  const atCapacity = activeCoHosts.length >= coHostLimit;

  return (
    <Button
      onClick={() => requestMutation.mutate()}
      disabled={atCapacity}
      size="sm"
      className="bg-purple-600 hover:bg-purple-700"
    >
      <UserPlus className="w-4 h-4 mr-2" />
      {atCapacity ? 'Co-Host Full' : 'Request to Join'}
    </Button>
  );
}