import React, { useRef, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Play, Pause, SkipForward, SkipBack, Volume2,
  VolumeX, Repeat, Shuffle, Heart, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import RelatedTracksSidebar from "./music/RelatedTracksSidebar";

export default function MusicPlayer({ track, onNext, onPrevious, onClose, upcomingTracks = [], onPlayTrack }) {
  const audioRef = useRef(null);
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const isYouTube = track?.source === 'youtube' && track?.video_id;

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Track listening history
  useEffect(() => {
    const saveToHistory = async () => {
      if (track && currentUser && isPlaying) {
        try {
          // Save to listening history
          await base44.entities.ListeningHistory.create({
            user_email: currentUser.email,
            track_id: track.id || track.video_id,
            track_title: track.title || track.name,
            artist_name: track.artist_name || track.artist,
            cover_art_url: track.cover_art_url || track.image,
            genre: track.genre,
            source: track.source || 'demo',
            video_id: track.video_id,
            played_at: new Date().toISOString()
          });

          // Keep only last 20 entries per user
          const history = await base44.entities.ListeningHistory.filter({ 
            user_email: currentUser.email 
          });
          if (history.length > 20) {
            const toDelete = history.sort((a, b) => 
              new Date(a.played_at) - new Date(b.played_at)
            ).slice(0, history.length - 20);
            for (const item of toDelete) {
              await base44.entities.ListeningHistory.delete(item.id);
            }
          }
        } catch (err) {
          console.log('Failed to save history:', err);
        }
      }
    };

    if (isPlaying && track) {
      // Save after 5 seconds of play to avoid accidental skips
      const timer = setTimeout(saveToHistory, 5000);
      return () => clearTimeout(timer);
    }
  }, [track, currentUser, isPlaying]);

  useEffect(() => {
    if (isYouTube) {
      // For YouTube tracks, just show the video player
      setShowVideo(true);
      setIsPlaying(true);
      setError(null);
    } else if (track && audioRef.current) {
      try {
        const audioUrl = track.preview_url || track.audio_file_url;
        
        if (audioUrl) {
          audioRef.current.src = audioUrl;
          audioRef.current.load();
          
          const playPromise = audioRef.current.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true);
                setError(null);
              })
              .catch(err => {
                console.log('Playback failed:', err);
                setIsPlaying(false);
                setError('Unable to play audio. Try another track.');
              });
          }
        } else {
          setError('No audio available for this track');
        }
      } catch (err) {
        console.error('Audio setup error:', err);
        setError('Audio setup failed');
      }
    }
  }, [track, isYouTube]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      try {
        setCurrentTime(audio.currentTime || 0);
      } catch (err) {
        console.error('Time update error:', err);
      }
    };
    
    const updateDuration = () => {
      try {
        setDuration(audio.duration || 0);
      } catch (err) {
        console.error('Duration update error:', err);
      }
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      if (onNext) onNext();
    };

    const handleError = (e) => {
      console.error('Audio playback error:', e);
      setError('Playback error occurred');
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [onNext]);

  const togglePlay = () => {
    if (isYouTube) {
      setShowVideo(!showVideo);
    } else if (audioRef.current) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => setIsPlaying(true))
              .catch(err => {
                console.log('Play failed:', err);
                setError('Unable to play');
              });
          }
        }
      } catch (err) {
        console.error('Toggle play error:', err);
      }
    }
  };

  const handleSeek = (value) => {
    if (isYouTube) return;
    if (audioRef.current && value && value[0] !== undefined) {
      try {
        audioRef.current.currentTime = value[0];
        setCurrentTime(value[0]);
      } catch (err) {
        console.error('Seek error:', err);
      }
    }
  };

  const handleVolumeChange = (value) => {
    if (value && value[0] !== undefined) {
      try {
        const newVolume = value[0];
        setVolume(newVolume);
        if (audioRef.current) {
          audioRef.current.volume = newVolume;
        }
        setIsMuted(newVolume === 0);
      } catch (err) {
        console.error('Volume change error:', err);
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      try {
        if (isMuted) {
          audioRef.current.volume = volume || 0.5;
          setIsMuted(false);
        } else {
          audioRef.current.volume = 0;
          setIsMuted(true);
        }
      } catch (err) {
        console.error('Mute toggle error:', err);
      }
    }
  };

  const formatTime = (time) => {
    if (isNaN(time) || time === null || time === undefined) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!track) return null;

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      const userName = isAnonymous ? 'Anonymous' : (currentUser?.full_name || 'User');
      setComments([...comments, { 
        text: newComment, 
        date: new Date().toISOString(),
        author: userName
      }]);
      setNewComment('');
    }
  };

  return (
    <AnimatePresence>
      {/* Minimized Mini Player */}
      {isMinimized && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 right-4 z-40"
        >
          <button
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-900/95 to-pink-900/95 border border-white/20 backdrop-blur-xl rounded-full shadow-2xl hover:scale-105 transition-transform"
          >
            <img
              src={track.cover_art_url || track.album?.images?.[0]?.url || "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100"}
              alt={track.title || track.name || "Music"}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="max-w-[150px]">
              <p className="text-white font-semibold text-sm truncate">{track.title || track.name}</p>
              <p className="text-gray-300 text-xs truncate">{track.artist_name || track.artist}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-purple-900" />
              ) : (
                <Play className="w-4 h-4 text-purple-900 ml-0.5" />
              )}
            </button>
          </button>
        </motion.div>
      )}

      {/* Full Screen Video Modal */}
      {!isMinimized && isYouTube && showVideo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/95 overflow-y-auto"
        >
          <div className="min-h-screen p-4 pb-24">
            <div className="flex items-center justify-between mb-4">
              <Button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-xl"
              >
                ← Back
              </Button>
              <Button
                onClick={() => setShowVideo(false)}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-xl"
              >
                Minimize ↓
              </Button>
            </div>

            {/* Video Player */}
            <div className="max-w-4xl mx-auto mb-6">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
                <iframe
                  src={`https://www.youtube.com/embed/${track.video_id}?autoplay=1&rel=0`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>

            {/* Video Info & Actions */}
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="bg-white/5 rounded-xl p-4 backdrop-blur-xl">
                <h3 className="text-white font-bold text-xl mb-2">{track.title || track.name}</h3>
                <p className="text-gray-300 mb-4">{track.artist_name || track.artist}</p>
                
                <div className="flex items-center gap-4">
                  <Button
                    onClick={handleLike}
                    className={`${isLiked ? 'bg-red-500' : 'bg-white/10'} hover:bg-red-600`}
                  >
                    <Heart className={`w-5 h-5 mr-2 ${isLiked ? 'fill-white' : ''}`} />
                    {isLiked ? 'Liked' : 'Like'}
                  </Button>
                  <Button
                    onClick={() => setShowComments(!showComments)}
                    className="bg-white/10 hover:bg-white/20"
                  >
                    💬 Comments ({comments.length})
                  </Button>
                </div>
              </div>

              {/* Comments Section */}
              {showComments && (
                <div className="bg-white/5 rounded-xl p-4 backdrop-blur-xl">
                  <h4 className="text-white font-bold mb-4">Comments</h4>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex gap-2">
                      <Input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                        placeholder="Add a comment..."
                        className="bg-white/10 border-white/20 text-white flex-1"
                      />
                      <Button onClick={handleAddComment} className="bg-purple-600">Post</Button>
                    </div>
                    <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-white/10"
                      />
                      Comment anonymously
                    </label>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {comments.map((comment, idx) => (
                      <div key={idx} className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-purple-400 text-sm font-semibold">{comment.author || 'User'}</p>
                          <span className="text-gray-500 text-xs">•</span>
                          <p className="text-gray-400 text-xs">
                            {new Date(comment.date).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-white text-sm">{comment.text}</p>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-gray-400 text-center py-4">No comments yet. Be the first!</p>
                    )}
                  </div>
                </div>
              )}

              {/* Related Tracks */}
              <RelatedTracksSidebar
                currentTrack={track}
                onPlayTrack={onPlayTrack || (() => {})}
                playingTrack={track}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Full Player */}
      {!isMinimized && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-0 right-0 z-40"
        >
        <Card className="mx-4 bg-gradient-to-r from-purple-900/95 to-pink-900/95 border-white/20 backdrop-blur-xl">
          <CardContent className="p-4">
            {/* Drag Handle */}
            <div className="flex justify-center mb-2">
              <div className="w-12 h-1 bg-white/30 rounded-full" />
            </div>
            <audio ref={audioRef} preload="auto" style={{ display: 'none' }} />
            
            {error && (
              <div className="mb-2 text-yellow-400 text-xs text-center">
                {error}
              </div>
            )}
            
            <div className="flex items-center gap-4 mb-3">
              {/* Album Art */}
              <img
                src={track.cover_art_url || track.album?.images?.[0]?.url || "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100"}
                alt={track.title || track.name || "Music"}
                className="w-16 h-16 rounded-lg object-cover"
                onError={(e) => {
                  e.target.src = "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100";
                }}
              />

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-bold truncate">{track.title || track.name || "Unknown Track"}</h4>
                <p className="text-gray-300 text-sm truncate">
                  {track.artist_name || track.artists?.[0]?.name || "Unknown Artist"}
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                {isYouTube && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 hover:text-white"
                    onClick={() => setShowVideo(!showVideo)}
                  >
                    <span className="text-xs">🎬</span>
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={`${isLiked ? 'text-red-400' : 'text-gray-400'} hover:text-white`}
                  onClick={handleLike}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-400' : ''}`} />
                </Button>
                {track.external_url && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 hover:text-white"
                    onClick={() => window.open(track.external_url, '_blank')}
                  >
                    <ExternalLink className="w-5 h-5" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-white"
                  onClick={() => setIsMinimized(true)}
                >
                  <span className="text-lg">↓</span>
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeek}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                  <Shuffle className="w-4 h-4" />
                </Button>
                {onPrevious && (
                  <Button size="sm" variant="ghost" onClick={onPrevious} className="text-white">
                    <SkipBack className="w-5 h-5" />
                  </Button>
                )}
              </div>

              <Button
                size="lg"
                onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-white hover:bg-gray-100 text-purple-900"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-1" />
                )}
              </Button>

              <div className="flex items-center gap-2">
                {onNext && (
                  <Button size="sm" variant="ghost" onClick={onNext} className="text-white">
                    <SkipForward className="w-5 h-5" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                  <Repeat className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Volume Control (Desktop) */}
            <div className="hidden md:flex items-center gap-2 mt-3">
              <Button size="sm" variant="ghost" onClick={toggleMute} className="text-gray-400 hover:text-white">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-24"
              />
            </div>

            {track.source === 'spotify' && track.preview_url && (
              <div className="mt-3 text-center">
                <p className="text-gray-400 text-xs">
                  🎵 30-second preview • 
                  <a
                    href={track.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 ml-1"
                  >
                    Listen full on Spotify
                  </a>
                </p>
              </div>
            )}
            
            {isYouTube && (
              <div className="mt-3 text-center">
                <p className="text-gray-400 text-xs">
                  🎬 {showVideo ? 'Now playing video' : 'Click 🎬 to watch video'} • Powered by YouTube
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      )}
    </AnimatePresence>
  );
}