import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Video, MessageSquare, CheckCircle, XCircle, Clock, 
  Play, Pause, Send, User, Eye
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function VideoReviewWorkflow({ currentUser }) {
  const queryClient = useQueryClient();
  const videoRef = useRef(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const { data: myLibraries = [] } = useQuery({
    queryKey: ['my-libraries', currentUser?.email],
    queryFn: () => base44.entities.SharedContentLibrary.list(),
    enabled: !!currentUser,
    initialData: []
  });

  const { data: collaborativeVideos = [] } = useQuery({
    queryKey: ['collaborative-videos'],
    queryFn: async () => {
      const libraryIds = myLibraries.map(l => l.id);
      if (libraryIds.length === 0) return [];
      
      const videos = await base44.entities.CollaborativeVideo.list();
      return videos.filter(v => libraryIds.includes(v.library_id));
    },
    enabled: myLibraries.length > 0,
    initialData: []
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ videoId, comment }) => {
      const video = collaborativeVideos.find(v => v.id === videoId);
      const newComment = {
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        timestamp: currentTime,
        comment: comment,
        resolved: false
      };
      
      return base44.entities.CollaborativeVideo.update(videoId, {
        comments: [...(video.comments || []), newComment]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborative-videos'] });
      setCommentText("");
      toast.success('Comment added');
    }
  });

  const resolveCommentMutation = useMutation({
    mutationFn: ({ videoId, commentIndex }) => {
      const video = collaborativeVideos.find(v => v.id === videoId);
      const updatedComments = [...video.comments];
      updatedComments[commentIndex] = {
        ...updatedComments[commentIndex],
        resolved: true
      };
      
      return base44.entities.CollaborativeVideo.update(videoId, {
        comments: updatedComments
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborative-videos'] });
      toast.success('Comment resolved');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ videoId, status }) => 
      base44.entities.CollaborativeVideo.update(videoId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborative-videos'] });
      toast.success('Status updated');
    }
  });

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const statusColors = {
    draft: 'bg-gray-500/20 text-gray-300',
    in_review: 'bg-yellow-500/20 text-yellow-300',
    approved: 'bg-green-500/20 text-green-300',
    published: 'bg-blue-500/20 text-blue-300'
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Video className="w-5 h-5 text-purple-400" />
            Video Review & Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {collaborativeVideos.map(video => (
              <button
                key={video.id}
                onClick={() => setSelectedVideo(video)}
                className={`p-3 rounded-xl border text-left transition ${
                  selectedVideo?.id === video.id
                    ? 'bg-purple-500/20 border-purple-500'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                {video.thumbnail_url && (
                  <img 
                    src={video.thumbnail_url} 
                    className="w-full h-24 object-cover rounded-lg mb-2" 
                  />
                )}
                <h4 className="text-white font-semibold text-sm mb-1">{video.title}</h4>
                <div className="flex items-center justify-between">
                  <Badge className={statusColors[video.status]}>
                    {video.status}
                  </Badge>
                  <span className="text-gray-400 text-xs">
                    v{video.version_number}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                  <MessageSquare className="w-3 h-3" />
                  <span>{video.comments?.length || 0} comments</span>
                </div>
              </button>
            ))}
          </div>

          {selectedVideo && (
            <div className="space-y-4">
              {/* Video Player */}
              <div className="bg-black rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  src={selectedVideo.video_url}
                  onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                  className="w-full"
                />
                <div className="p-4 bg-gray-900">
                  <div className="flex items-center justify-between mb-2">
                    <Button onClick={togglePlayPause} size="sm">
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <span className="text-white text-sm font-mono">
                      {currentTime.toFixed(1)}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Actions */}
              <div className="flex gap-2">
                {selectedVideo.status === 'draft' && (
                  <Button
                    onClick={() => updateStatusMutation.mutate({ videoId: selectedVideo.id, status: 'in_review' })}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Submit for Review
                  </Button>
                )}
                {selectedVideo.status === 'in_review' && (
                  <>
                    <Button
                      onClick={() => updateStatusMutation.mutate({ videoId: selectedVideo.id, status: 'approved' })}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => updateStatusMutation.mutate({ videoId: selectedVideo.id, status: 'draft' })}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Request Changes
                    </Button>
                  </>
                )}
                {selectedVideo.status === 'approved' && (
                  <Button
                    onClick={() => updateStatusMutation.mutate({ videoId: selectedVideo.id, status: 'published' })}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Publish
                  </Button>
                )}
              </div>

              {/* Add Comment */}
              <div className="p-4 bg-white/5 rounded-xl">
                <h4 className="text-white font-semibold mb-3">Add Feedback</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder={`Comment at ${currentTime.toFixed(1)}s...`}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="bg-white/10 border-white/20 text-white flex-1"
                  />
                  <Button
                    onClick={() => addCommentMutation.mutate({
                      videoId: selectedVideo.id,
                      comment: commentText
                    })}
                    disabled={!commentText}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Comments Timeline */}
              <div className="space-y-2">
                <h4 className="text-white font-semibold">Comments & Feedback</h4>
                {(selectedVideo.comments || []).sort((a, b) => a.timestamp - b.timestamp).map((comment, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-lg ${
                      comment.resolved 
                        ? 'bg-green-500/10 border border-green-500/30' 
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">
                            {comment.user_name || comment.user_email}
                          </div>
                          <div className="text-gray-400 text-xs">
                            @ {comment.timestamp.toFixed(1)}s
                          </div>
                        </div>
                      </div>
                      {!comment.resolved && (
                        <Button
                          onClick={() => resolveCommentMutation.mutate({
                            videoId: selectedVideo.id,
                            commentIndex: idx
                          })}
                          size="sm"
                          variant="ghost"
                          className="text-green-400"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-gray-300 text-sm">{comment.comment}</p>
                    {comment.resolved && (
                      <Badge className="mt-2 bg-green-500/20 text-green-300 text-xs">
                        Resolved
                      </Badge>
                    )}
                  </div>
                ))}
                {(selectedVideo.comments || []).length === 0 && (
                  <p className="text-gray-400 text-center py-4 text-sm">No feedback yet</p>
                )}
              </div>
            </div>
          )}

          {!selectedVideo && collaborativeVideos.length === 0 && (
            <div className="text-center py-12">
              <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No collaborative videos yet</p>
              <p className="text-gray-500 text-sm mt-2">Upload videos to shared libraries to start</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}