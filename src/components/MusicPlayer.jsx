import React, { useRef, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play, Pause, SkipForward, SkipBack, Volume2,
  VolumeX, Repeat, Shuffle, Heart, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MusicPlayer({ track, onNext, onPrevious, onClose }) {
  const audioRef = useRef(null);
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  
  const isYouTube = track?.source === 'youtube' && track?.video_id;

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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-0 right-0 z-40"
      >
        <Card className="mx-4 bg-gradient-to-r from-purple-900/95 to-pink-900/95 border-white/20 backdrop-blur-xl">
          <CardContent className="p-4">
            {!isYouTube && <audio ref={audioRef} preload="auto" />}
            
            {/* YouTube Video Player */}
            {isYouTube && showVideo && (
              <div className="mb-4 relative aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${track.video_id}?autoplay=1`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            
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
                    <span className="text-xs">{showVideo ? '🎵' : '🎬'}</span>
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                  <Heart className="w-5 h-5" />
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
    </AnimatePresence>
  );
}