import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Music, Film, Tv, ShoppingBag, MessageCircle, CheckCircle,
  XCircle, Clock, DollarSign, Loader2, Send, FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function SyncLicensingAdmin() {
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  React.useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      if (user.role !== 'admin') {
        toast.error('Admin access required');
      }
    }).catch(() => {});
  }, []);

  const { data: syncRequests = [], isLoading } = useQuery({
    queryKey: ['sync-requests', statusFilter],
    queryFn: async () => {
      const all = await base44.entities.SyncRequest.list('-created_date');
      if (statusFilter === 'all') return all;
      return all.filter(r => r.status === statusFilter);
    },
    enabled: !!currentUser && currentUser.role === 'admin',
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['sync-messages', selectedRequest?.id],
    queryFn: async () => {
      if (!selectedRequest) return [];
      return await base44.entities.SyncMessage.filter({ sync_request_id: selectedRequest.id });
    },
    enabled: !!selectedRequest,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }) => {
      return await base44.entities.SyncRequest.update(id, { 
        status,
        admin_notes: notes 
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['sync-requests']);
      toast.success('Status updated');
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ sync_request_id, message }) => {
      const msg = await base44.entities.SyncMessage.create({
        sync_request_id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name || 'Admin',
        message,
        message_type: 'response'
      });

      // Notify artist
      const request = syncRequests.find(r => r.id === sync_request_id);
      if (request) {
        await base44.entities.Notification.create({
          recipient_email: request.artist_email,
          type: 'message',
          title: '💬 Sync Licensing Message',
          message: `New message about "${request.track_title}" from admin`,
          read: false,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          action_url: '/MusicStudio?tab=sync'
        });
      }

      return msg;
    },
    onSuccess: () => {
      qc.invalidateQueries(['sync-messages']);
      setMessageText('');
      toast.success('Message sent');
    },
  });

  const usageIcons = {
    film: <Film className="w-4 h-4" />,
    tv: <Tv className="w-4 h-4" />,
    commercial: <ShoppingBag className="w-4 h-4" />,
    video_game: <Music className="w-4 h-4" />,
  };

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    approved: 'bg-green-500/20 text-green-400',
    in_negotiation: 'bg-blue-500/20 text-blue-400',
    licensed: 'bg-purple-500/20 text-purple-400',
    rejected: 'bg-red-500/20 text-red-400',
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-white text-xl">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Sync Licensing Admin</h1>
          <p className="text-gray-400">Manage sync licensing requests and communications</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          {['all', 'pending', 'approved', 'in_negotiation', 'licensed'].map(status => {
            const count = status === 'all' 
              ? syncRequests.length 
              : syncRequests.filter(r => r.status === status).length;
            return (
              <Card 
                key={status}
                className={`cursor-pointer transition ${
                  statusFilter === status 
                    ? 'bg-purple-500/20 border-purple-500' 
                    : 'bg-white/5 border-white/10'
                }`}
                onClick={() => setStatusFilter(status)}
              >
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-white">{count}</p>
                  <p className="text-gray-400 text-sm capitalize">{status.replace('_', ' ')}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Requests List */}
          <div className="lg:col-span-2 space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
              </div>
            ) : syncRequests.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No sync requests found</p>
                </CardContent>
              </Card>
            ) : (
              syncRequests.map(request => (
                <Card 
                  key={request.id}
                  className={`cursor-pointer transition ${
                    selectedRequest?.id === request.id
                      ? 'bg-purple-500/20 border-purple-500'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  onClick={() => setSelectedRequest(request)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-white font-bold text-xl mb-1">{request.track_title}</h3>
                        <p className="text-gray-400 text-sm">by {request.artist_name}</p>
                      </div>
                      <Badge className={statusColors[request.status]}>
                        {request.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Genre</p>
                        <p className="text-white text-sm capitalize">{request.genre?.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Tempo</p>
                        <p className="text-white text-sm capitalize">{request.tempo || 'N/A'}</p>
                      </div>
                    </div>

                    {request.mood?.length > 0 && (
                      <div className="mb-4">
                        <p className="text-gray-400 text-xs mb-2">Mood</p>
                        <div className="flex flex-wrap gap-2">
                          {request.mood.map((m, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {m}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {request.usage_types?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {request.usage_types.map((type, i) => (
                          <div key={i} className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded-lg text-blue-400 text-xs">
                            {usageIcons[type] || <FileText className="w-4 h-4" />}
                            <span className="capitalize">{type.replace('_', ' ')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Details & Actions */}
          <div className="space-y-4">
            {selectedRequest ? (
              <>
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Request Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-gray-400 text-sm">Status</label>
                      <Select
                        value={selectedRequest.status}
                        onValueChange={(status) => {
                          updateStatusMutation.mutate({
                            id: selectedRequest.id,
                            status,
                            notes: selectedRequest.admin_notes
                          });
                        }}
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="in_negotiation">In Negotiation</SelectItem>
                          <SelectItem value="licensed">Licensed</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedRequest.description && (
                      <div>
                        <label className="text-gray-400 text-sm">Description</label>
                        <p className="text-white text-sm mt-1">{selectedRequest.description}</p>
                      </div>
                    )}

                    {selectedRequest.similar_artists && (
                      <div>
                        <label className="text-gray-400 text-sm">Similar To</label>
                        <p className="text-white text-sm mt-1">{selectedRequest.similar_artists}</p>
                      </div>
                    )}

                    <div>
                      <label className="text-gray-400 text-sm">Admin Notes</label>
                      <Textarea
                        value={selectedRequest.admin_notes || ''}
                        onChange={(e) => setSelectedRequest({...selectedRequest, admin_notes: e.target.value})}
                        placeholder="Internal notes..."
                        className="bg-white/10 border-white/20 text-white mt-1"
                        rows={3}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          updateStatusMutation.mutate({
                            id: selectedRequest.id,
                            status: selectedRequest.status,
                            notes: selectedRequest.admin_notes
                          });
                        }}
                        className="mt-2 bg-blue-600"
                      >
                        Save Notes
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Messages */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Messages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                      {messages.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-4">No messages yet</p>
                      ) : (
                        messages.map(msg => (
                          <div 
                            key={msg.id}
                            className={`p-3 rounded-lg ${
                              msg.sender_email === currentUser.email
                                ? 'bg-purple-500/20 ml-4'
                                : 'bg-white/10 mr-4'
                            }`}
                          >
                            <p className="text-white text-sm font-semibold mb-1">{msg.sender_name}</p>
                            <p className="text-gray-300 text-sm">{msg.message}</p>
                            <p className="text-gray-500 text-xs mt-1">
                              {new Date(msg.created_date).toLocaleString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Type a message..."
                        className="bg-white/10 border-white/20 text-white"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && messageText.trim()) {
                            sendMessageMutation.mutate({
                              sync_request_id: selectedRequest.id,
                              message: messageText
                            });
                          }
                        }}
                      />
                      <Button
                        size="icon"
                        onClick={() => {
                          if (messageText.trim()) {
                            sendMessageMutation.mutate({
                              sync_request_id: selectedRequest.id,
                              message: messageText
                            });
                          }
                        }}
                        disabled={!messageText.trim() || sendMessageMutation.isPending}
                        className="bg-purple-600"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Select a request to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}