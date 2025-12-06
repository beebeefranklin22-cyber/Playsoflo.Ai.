import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Video, Upload, Sparkles, Download } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AIVideoGenerator({ onVideoGenerated }) {
  const [mode, setMode] = useState("text");
  const [textPrompt, setTextPrompt] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [style, setStyle] = useState("cinematic");
  const [duration, setDuration] = useState("short");
  const [generating, setGenerating] = useState(false);
  const [videoData, setVideoData] = useState(null);

  const generateVideo = async () => {
    if (mode === 'text' && !textPrompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    if (mode === 'image' && !imageFile) {
      toast.error("Please upload an image");
      return;
    }

    setGenerating(true);
    try {
      let imageUrl = null;
      if (mode === 'image' && imageFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });
        imageUrl = file_url;
      }

      const durationSpecs = {
        short: "3-5 seconds",
        medium: "10-15 seconds",
        long: "30-60 seconds"
      };

      const aiPrompt = mode === 'text' 
        ? `Create a detailed video storyboard for: "${textPrompt}". Style: ${style}. Duration: ${durationSpecs[duration]}. 
           Include: scene descriptions, camera movements, transitions, lighting, and mood for each frame.
           Return as JSON with scenes array containing: description, duration, camera_angle, transition, mood`
        : `Animate this image into a video. Style: ${style}. Duration: ${durationSpecs[duration]}.
           Describe the animation: camera movements, zoom effects, parallax, transitions.
           Return as JSON with animation details.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: aiPrompt,
        file_urls: imageUrl ? [imageUrl] : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            video_concept: { type: "string" },
            scenes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  duration: { type: "string" },
                  camera_angle: { type: "string" },
                  transition: { type: "string" },
                  mood: { type: "string" }
                }
              }
            },
            music_suggestion: { type: "string" },
            color_palette: { type: "array", items: { type: "string" } }
          }
        }
      });

      setVideoData({
        ...result,
        sourceImage: imageUrl,
        prompt: textPrompt,
        style,
        duration
      });

      if (onVideoGenerated) onVideoGenerated(result);
      toast.success("Video storyboard generated! Ready for production.");
    } catch (error) {
      toast.error("Failed to generate video");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="glass-effect border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Video className="w-5 h-5 text-pink-400" />
          AI Video Generator
          <span className="ml-2 px-2 py-1 bg-pink-500/20 text-pink-300 text-xs rounded-full">
            Powered by Sora-like AI
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={mode === 'text' ? 'default' : 'outline'}
            onClick={() => setMode('text')}
            className={mode === 'text' ? 'bg-purple-600' : ''}
          >
            Text to Video
          </Button>
          <Button
            variant={mode === 'image' ? 'default' : 'outline'}
            onClick={() => setMode('image')}
            className={mode === 'image' ? 'bg-purple-600' : ''}
          >
            Image to Video
          </Button>
        </div>

        {mode === 'text' ? (
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Describe Your Video</label>
            <Textarea
              value={textPrompt}
              onChange={(e) => setTextPrompt(e.target.value)}
              placeholder="E.g., A serene morning at a coffee shop with steam rising from cups, soft jazz playing, sunlight streaming through windows..."
              className="bg-white/10 border-white/20 text-white placeholder-gray-500 min-h-[120px]"
            />
          </div>
        ) : (
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Upload Image</label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0])}
                className="hidden"
                id="video-image-upload"
              />
              <label
                htmlFor="video-image-upload"
                className="flex items-center justify-center gap-2 p-4 bg-white/10 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/20 transition"
              >
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-gray-400">
                  {imageFile ? imageFile.name : 'Click to upload image'}
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Style</label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cinematic">Cinematic</SelectItem>
                <SelectItem value="realistic">Realistic</SelectItem>
                <SelectItem value="anime">Anime</SelectItem>
                <SelectItem value="3d">3D Rendered</SelectItem>
                <SelectItem value="abstract">Abstract</SelectItem>
                <SelectItem value="vintage">Vintage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Duration</label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short (3-5s)</SelectItem>
                <SelectItem value="medium">Medium (10-15s)</SelectItem>
                <SelectItem value="long">Long (30-60s)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={generateVideo} 
          disabled={generating}
          className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Video...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Video Storyboard
            </>
          )}
        </Button>

        {videoData && (
          <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-xl">
            <div>
              <h3 className="text-white font-bold mb-2">Video Concept</h3>
              <p className="text-gray-300 text-sm">{videoData.video_concept}</p>
            </div>

            {videoData.scenes && (
              <div>
                <h3 className="text-white font-bold mb-2">Scenes</h3>
                <div className="space-y-2">
                  {videoData.scenes.map((scene, idx) => (
                    <div key={idx} className="bg-white/5 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs">
                          Scene {idx + 1}
                        </span>
                        <span className="text-gray-400 text-xs">{scene.duration}</span>
                      </div>
                      <p className="text-gray-300 text-sm mb-1">{scene.description}</p>
                      <div className="flex gap-2 text-xs text-gray-500">
                        <span>📷 {scene.camera_angle}</span>
                        <span>✨ {scene.transition}</span>
                        <span>🎭 {scene.mood}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {videoData.music_suggestion && (
              <div>
                <h3 className="text-white font-bold mb-2">Music Suggestion</h3>
                <p className="text-gray-300 text-sm">{videoData.music_suggestion}</p>
              </div>
            )}

            <Button className="w-full bg-purple-600 hover:bg-purple-700">
              <Download className="w-4 h-4 mr-2" />
              Export Storyboard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}