import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Music, Film, Plus, X, MessageCircle, CheckCircle,
  Clock, Loader2, Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function SyncLicensingManager({ tracks, currentUser }) {
  const qc = useQueryClient();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedTrackForSync, setSelectedTrackForSync] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [messageText, setMessageText] = useState('');

  const [syncForm, setSyncForm] = useState({
    genre: '',
    mood: [],
    usage_types: [],
    tempo: 'medium',
    instrumental: false,
    vocals: true,
    description: '',
    similar_artists: '',
    submission_notes: ''
  });

  const moodOptions = [
    'energetic', 'melancholic', 'uplifting', 'dark', 'romantic',
    'peaceful', 'aggressive', 'mysterious', 'happy', 'dramatic'
  ];

  const usageOptions = [
    { value: 'film', label: 'Film' },
    { value: 'tv', label: 'TV Show' },
    { value: 'commercial', label: 'Commercial/Ad' },
    { value: 'video_game', label: 'Video Game' },
    { value: 'podcast', label: 'Podcast' },
    { value: 'youtube', label: 'YouTube/Social Media' }
  ];

  const { data: mySyncRequests = [] } = useQuery({
    queryKey: ['my-sync-requests', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.SyncRequest.filter({ artist_email: currentUser.email });
    },
    enabled: !!currentUser,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['sync-messages', selectedRequest?.id],
    queryFn: async () => {
      if (!selectedRequest) return [];
      return await base44.entities.SyncMessage.filter({ sync_request_id: selectedRequest.id });
    },
    enabled: !!selectedRequest,
  });

  const submitSyncMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.SyncRequest.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries(['my-sync-requests']);
      toast.success('Track submitted for sync licensing');
      setShowSubmitModal(false);
      setSelectedTrackForSync(null);
      setSyncForm({
        genre: '',
        mood: [],
        usage_types: [],
        tempo: 'medium',
        instrumental: false,
        vocals: true,
        description: '',
        similar_artists: '',
        submission_notes: ''
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ sync_request_id, message }) => {
      return await base44.entities.SyncMessage.create({
        sync_request_id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name || currentUser.email,
        message,
        message_type: 'response'
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['sync-messages']);
      setMessageText('');
      toast.success('Message sent');
    },
  });

  const handleSubmitForSync = () => {
    if (!selectedTrackForSync) return;

    if (!syncForm.genre || syncForm.mood.length === 0 || syncForm.usage_types.length === 0) {
      toast.error('Please fill in genre, mood, and usage types');
      return;
    }

    submitSyncMutation.mutate({
      track_id: selectedTrackForSync.id,
      artist_email: currentUser.email,
      artist_name: currentUser.full_name || currentUser.email,
      track_title: selectedTrackForSync.title,
      ...syncForm,
      status: 'pending'
    });
  };

  const toggleMood = (mood) => {
    if (syncForm.mood.includes(mood)) {
      setSyncForm({ ...syncForm, mood: syncForm.mood.filter(m => m !== mood) });
    } else {
      setSyncForm({ ...syncForm, mood: [...syncForm.mood, mood] });
    }
  };

  const toggleUsageType = (type) => {
    if (syncForm.usage_types.includes(type)) {
      setSyncForm({ ...syncForm, usage_types: syncForm.usage_types.filter(t => t !== type) });
    } else {
      setSyncForm({ ...syncForm, usage_types: [...syncForm.usage_types, type] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Sync Licensing</h2>
          <p className="text-gray-400">Submit your music for films, TV, commercials & more</p>
        </div>
        <Button
          onClick={() => {
            if (tracks.length === 0) {
              toast.error('Upload a track first');
              return;
            }
            setShowSubmitModal(true);
          }}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Submit Track
        </Button>
      </div>

      {/* My Submissions */}
      <div className="grid md:grid-cols-2 gap-4">
        {mySyncRequests.length === 0 ? (
          <Card className="bg-white/5 border-white/10 md:col-span-2">
            <CardContent className="p-12 text-center">
              <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No sync licensing submissions yet</p>
              <p className="text-gray-500 text-sm">Submit your tracks to get them licensed for media projects</p>
            </CardContent>
          </Card>
        ) : (
          mySyncRequests.map(request => (
            <Card key={request.id} className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-bold text-lg mb-1">{request.track_title}</h3>
                    <p className="text-gray-400 text-sm capitalize">{request.genre?.replace('_', ' ')}</p>
                  </div>
                  <Badge className={
                    request.status === 'licensed' ? 'bg-purple-500/20 text-purple-400' :
                    request.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    request.status === 'in_negotiation' ? 'bg-blue-500/20 text-blue-400' :
                    request.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }>
                    {request.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                    {request.status === 'licensed' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {request.status.replace('_', ' ')}
                  </Badge>
                </div>

                {request.mood?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {request.mood.slice(0, 3).map((m, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {m}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedRequest(request)}
                    className="flex-1"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Messages
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Submit Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setShowSubmitModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-gray-900 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-3xl font-bold text-white mb-6">Submit for Sync Licensing</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-white text-sm font-semibold mb-2 block">Select Track</label>
                  <Select
                    value={selectedTrackForSync?.id || ''}
                    onValueChange={(id) => {
                      const track = tracks.find(t => t.id === id);
                      setSelectedTrackForSync(track);
                      setSyncForm({ ...syncForm, genre: track?.genre || '' });
                    }}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Choose a track" />
                    </SelectTrigger>
                    <SelectContent>
                      {tracks.map(track => (
                        <SelectItem key={track.id} value={track.id}>
                          {track.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTrackForSync && (
                  <>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-white text-sm font-semibold mb-2 block">Tempo</label>
                        <Select value={syncForm.tempo} onValueChange={(v) => setSyncForm({...syncForm, tempo: v})}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="slow">Slow</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="fast">Fast</SelectItem>
                            <SelectItem value="variable">Variable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-4 pt-8">
                        <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                          <Checkbox
                            checked={syncForm.instrumental}
                            onCheckedChange={(checked) => setSyncForm({...syncForm, instrumental: checked})}
                          />
                          Instrumental
                        </label>
                        <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                          <Checkbox
                            checked={syncForm.vocals}
                            onCheckedChange={(checked) => setSyncForm({...syncForm, vocals: checked})}
                          />
                          Has Vocals
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="text-white text-sm font-semibold mb-2 block">Mood (Select all that apply)</label>
                      <div className="flex flex-wrap gap-2">
                        {moodOptions.map(mood => (
                          <button
                            key={mood}
                            type="button"
                            onClick={() => toggleMood(mood)}
                            className={`px-3 py-1 rounded-full text-sm transition ${
                              syncForm.mood.includes(mood)
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/10 text-gray-400 hover:bg-white/20'
                            }`}
                          >
                            {mood}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-white text-sm font-semibold mb-2 block">Usage Types</label>
                      <div className="space-y-2">
                        {usageOptions.map(option => (
                          <label key={option.value} className="flex items-center gap-2 text-white cursor-pointer">
                            <Checkbox
                              checked={syncForm.usage_types.includes(option.value)}
                              onCheckedChange={() => toggleUsageType(option.value)}
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <Textarea
                      value={syncForm.description}
                      onChange={(e) => setSyncForm({...syncForm, description: e.target.value})}
                      placeholder="Describe your track (mood, vibe, best use cases)..."
                      className="bg-white/10 border-white/20 text-white"
                      rows={3}
                    />

                    <Input
                      value={syncForm.similar_artists}
                      onChange={(e) => setSyncForm({...syncForm, similar_artists: e.target.value})}
                      placeholder="Similar artists/songs (e.g., Drake, The Weeknd)"
                      className="bg-white/10 border-white/20 text-white"
                    />

                    <Textarea
                      value={syncForm.submission_notes}
                      onChange={(e) => setSyncForm({...syncForm, submission_notes: e.target.value})}
                      placeholder="Additional notes for reviewers..."
                      className="bg-white/10 border-white/20 text-white"
                      rows={2}
                    />
                  </>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowSubmitModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitForSync}
                    disabled={!selectedTrackForSync || submitSyncMutation.isPending}
                    className="flex-1 bg-purple-600"
                  >
                    {submitSyncMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Film className="w-4 h-4 mr-2" />
                    )}
                    Submit for Licensing
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setSelectedRequest(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-gray-900 rounded-3xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Messages - {selectedRequest.track_title}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedRequest(null)}
                >
                  <X className="w-5 h-5 text-white" />
                </Button>
              </div>

              <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No messages yet</p>
                ) : (
                  messages.map(msg => (
                    <div 
                      key={msg.id}
                      className={`p-3 rounded-lg ${
                        msg.sender_email === currentUser.email
                          ? 'bg-purple-500/20 ml-8'
                          : 'bg-white/10 mr-8'
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}