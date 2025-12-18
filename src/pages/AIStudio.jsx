import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { 
  Wand2, Image, Video, Music, Code, FileText, 
  Sparkles, Cpu, Palette, Mic, Brain, Zap,
  CheckCircle, Crown, Gift, ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

const aiTools = [
  {
    id: "image-gen",
    name: "AI Image Generator",
    description: "Create stunning images from text descriptions. Powered by advanced AI models.",
    icon: Image,
    category: "image_generation",
    color: "from-pink-500 to-rose-500",
    tier: "standard",
    monthlyPrice: 0, // FREE
    features: ["8K Resolution", "50+ Styles", "Batch Generation", "Commercial License", "Ultra-Fast Processing", "AI Upscaling"],
    capabilities: [
      "Generate photorealistic images in seconds",
      "Create artistic illustrations with any style",
      "Design professional logos and graphics",
      "Produce concept art and storyboards",
      "Style transfer and image fusion",
      "AI-powered image enhancement and upscaling",
      "Generate infinite variations instantly"
    ]
  },
  {
    id: "video-editor",
    name: "AI Video Editor",
    description: "Edit videos with AI-powered tools. Auto-cut, enhance, and add effects.",
    icon: Video,
    category: "video_editing",
    color: "from-purple-500 to-indigo-500",
    tier: "premium",
    monthlyPrice: 0, // FREE
    features: ["Auto Editing", "Scene Detection", "Color Grading", "AI Transitions", "Voice Enhancement", "4K Export"],
    capabilities: [
      "Automatic scene detection and intelligent cutting",
      "AI background removal and replacement",
      "Voice-to-text subtitles in 50+ languages",
      "AI-powered color correction and grading",
      "Intelligent audio mixing and enhancement",
      "Generate B-roll footage automatically",
      "Smart thumbnail generation"
    ]
  },
  {
    id: "music-creator",
    name: "AI Music Composer",
    description: "Compose original music tracks. Create beats, melodies, and full songs.",
    icon: Music,
    category: "music_creation",
    color: "from-cyan-500 to-blue-500",
    tier: "standard",
    monthlyPrice: 0, // FREE
    features: ["100+ Genres", "Stem Separation", "Royalty Free", "MIDI Export", "Loop Creator", "AI Mastering"],
    capabilities: [
      "Generate full songs in any genre instantly",
      "Create custom beats and professional loops",
      "AI vocal synthesis with emotion control",
      "Professional music mastering and mixing",
      "Convert humming to full compositions",
      "Extract stems from any song",
      "Generate background music for videos"
    ]
  },
  {
    id: "code-assistant",
    name: "AI Code Developer",
    description: "Write, debug, and optimize code. Supports 50+ programming languages.",
    icon: Code,
    category: "code_development",
    color: "from-green-500 to-emerald-500",
    tier: "standard",
    monthlyPrice: 0, // FREE
    features: ["50+ Languages", "Code Review", "Bug Detection", "Refactoring", "Documentation", "Security Scanning"],
    capabilities: [
      "Write complete production-ready applications",
      "Debug and fix complex errors instantly",
      "Optimize code performance automatically",
      "Generate comprehensive unit tests",
      "Explain complex code in plain language",
      "Convert between programming languages",
      "Security vulnerability scanning",
      "API integration and documentation"
    ]
  },
  {
    id: "content-writer",
    name: "AI Content Writer",
    description: "Generate high-quality written content. Articles, stories, and more.",
    icon: FileText,
    category: "writing",
    color: "from-orange-500 to-amber-500",
    tier: "standard",
    monthlyPrice: 0, // FREE
    features: ["SEO Optimized", "50+ Formats", "Plagiarism Check", "Tone Adjustment", "50+ Languages", "Grammar AI"],
    capabilities: [
      "Write SEO-optimized blog posts and articles",
      "Create compelling marketing copy that converts",
      "Generate product descriptions at scale",
      "Write engaging scripts and dialogues",
      "Translate and localize content perfectly",
      "Summarize long documents instantly",
      "Create social media content calendars",
      "Generate email campaigns"
    ]
  },
  {
    id: "design-studio",
    name: "AI Design Studio",
    description: "Create professional designs. Logos, posters, UI/UX, and more.",
    icon: Palette,
    category: "design",
    color: "from-violet-500 to-purple-500",
    tier: "premium",
    monthlyPrice: 0, // FREE
    features: ["Brand Kit", "1000+ Templates", "Vector Export", "Mockup Generator", "Font Pairing", "AI Color Theory"],
    capabilities: [
      "Generate professional logo designs instantly",
      "Create social media graphics at scale",
      "Design complete UI/UX layouts",
      "Produce marketing materials automatically",
      "Auto-generate color palettes from images",
      "Smart typography and font pairing",
      "Generate design variations instantly",
      "Create brand style guides"
    ]
  },
  {
    id: "voice-synthesis",
    name: "AI Voice Studio",
    description: "Generate realistic voices and clone existing ones. Text-to-speech and more.",
    icon: Mic,
    category: "voice_synthesis",
    color: "from-red-500 to-pink-500",
    tier: "premium",
    monthlyPrice: 0, // FREE
    features: ["Voice Cloning", "50+ Accents", "Emotion Control", "Real-time", "Audio Effects", "Multi-Speaker"],
    capabilities: [
      "Ultra-realistic text-to-speech in any voice",
      "Clone your voice with just 30 seconds of audio",
      "Generate podcast narration with emotion",
      "Create character voices for animation",
      "Convert speech to different languages perfectly",
      "Real-time voice modulation",
      "Generate audio books automatically",
      "Multi-speaker dialogue generation"
    ]
  },
  {
    id: "3d-modeler",
    name: "AI 3D Modeler",
    description: "Create 3D models from text or images. Perfect for games and visualization.",
    icon: Cpu,
    category: "3d_modeling",
    color: "from-yellow-500 to-orange-500",
    tier: "elite",
    monthlyPrice: 0, // FREE
    features: ["Text-to-3D", "Photo-to-Model", "Auto Rigging", "Animation", "All Formats", "PBR Materials"],
    capabilities: [
      "Generate 3D models from text descriptions",
      "Convert any photo to 3D model",
      "Auto-rig for instant animation",
      "Create game-ready optimized assets",
      "Generate realistic textures and materials",
      "Export to all major 3D formats",
      "Automatic UV unwrapping",
      "Generate architectural visualizations"
    ]
  }
];

export default function AIStudio() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedTool, setSelectedTool] = useState(null);
  const [showDemo, setShowDemo] = useState(false);
  const [demoInput, setDemoInput] = useState("");
  const [demoOutput, setDemoOutput] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: tools = [] } = useQuery({
    queryKey: ['ai-tools'],
    queryFn: () => base44.entities.AITool.list(),
    initialData: []
  });

  const handleToolDemo = async (tool) => {
    if (!demoInput.trim()) {
      alert("Please enter a prompt to try the AI tool");
      return;
    }

    setIsGenerating(true);
    try {
      let prompt = "";
      let responseSchema = null;

      // Enhanced intelligent prompts with better context
      switch(tool.id) {
        case "image-gen":
          // Actually generate an image!
          const imageResult = await base44.integrations.Core.GenerateImage({
            prompt: demoInput
          });
          
          setDemoOutput({
            type: "image",
            url: imageResult.url,
            prompt: demoInput,
            message: "✨ Image generated successfully!"
          });
          setIsGenerating(false);
          return;

        case "video-editor":
          // Generate video storyboard with preview image
          prompt = `Create a detailed video production plan for: "${demoInput}"

Include specific scenes, transitions, visual effects, and timing.`;
          
          const storyboard = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                scenes: { type: "array", items: { type: "string" } },
                transitions: { type: "array", items: { type: "string" } },
                effects: { type: "array", items: { type: "string" } },
                duration: { type: "string" },
                color_grade: { type: "string" },
                audio_plan: { type: "string" }
              }
            }
          });
          
          // Generate thumbnail for the video concept
          const videoThumb = await base44.integrations.Core.GenerateImage({
            prompt: `Professional video thumbnail for: ${demoInput}`
          });
          
          setDemoOutput({
            type: "video",
            thumbnail: videoThumb.url,
            storyboard: storyboard,
            message: "🎬 Video plan created! Thumbnail preview generated."
          });
          setIsGenerating(false);
          return;

        case "music-creator":
          prompt = `You are a professional music producer and composer. Create a detailed composition plan for: "${demoInput}"

Include:
- Genre and subgenre
- Tempo (BPM) and time signature
- Chord progression
- Instrument arrangement
- Song structure (intro, verse, chorus, etc.)
- Mood and emotional arc
- Production techniques

Be specific and music-theory accurate.`;
          responseSchema = {
            type: "object",
            properties: {
              genre: { type: "string" },
              tempo: { type: "string" },
              time_signature: { type: "string" },
              key: { type: "string" },
              chord_progression: { type: "string" },
              instruments: { type: "array", items: { type: "string" } },
              structure: { type: "string" },
              mood: { type: "string" },
              production_notes: { type: "string" }
            }
          };
          break;

        case "code-assistant":
          prompt = `You are a helpful coding assistant for learning and development. Help with: "${demoInput}"

STRICT SECURITY RESTRICTIONS:
- NEVER generate code that accesses sensitive data (passwords, API keys, tokens, payment info)
- NEVER create code for hacking, phishing, scraping, or malicious purposes
- NEVER bypass authentication or authorization systems
- NEVER generate code that violates privacy or terms of service
- DO provide educational examples and learning resources only
- DO focus on legitimate development tasks

If the request involves anything potentially malicious or unethical, refuse politely and explain why.

Provide helpful, educational code examples only.`;
          responseSchema = {
            type: "object",
            properties: {
              is_safe_request: { type: "boolean" },
              code: { type: "string" },
              language: { type: "string" },
              explanation: { type: "string" },
              security_warning: { type: "string" }
            }
          };
          break;

        case "content-writer":
          prompt = `You are an expert copywriter and content strategist. Write high-quality, engaging content about: "${demoInput}"

Make it:
- SEO-optimized with natural keyword integration
- Compelling and conversion-focused
- Well-structured and scannable
- Original and plagiarism-free
- Audience-appropriate

Include a catchy title, engaging content, and SEO metadata.`;
          responseSchema = {
            type: "object",
            properties: {
              title: { type: "string" },
              content: { type: "string" },
              keywords: { type: "array", items: { type: "string" } },
              meta_description: { type: "string" },
              target_audience: { type: "string" },
              tone: { type: "string" }
            }
          };
          break;

        case "design-studio":
          prompt = `You are a professional graphic designer with expertise in visual communication. Create a detailed design concept for: "${demoInput}"

Include:
- Layout structure and grid system
- Color palette with hex codes
- Typography choices and hierarchy
- Visual elements and spacing
- Design principles applied
- Brand consistency notes

Be specific and design-ready.`;
          responseSchema = {
            type: "object",
            properties: {
              layout: { type: "string" },
              color_palette: { type: "array", items: { type: "string" } },
              fonts: { type: "array", items: { type: "string" } },
              elements: { type: "array", items: { type: "string" } },
              spacing: { type: "string" },
              design_principles: { type: "string" }
            }
          };
          break;

        case "voice-synthesis":
          prompt = `You are a voice actor and audio producer. Create a professional voice-over script with emotion and pacing for: "${demoInput}"

Include:
- Script with emotion markers
- Voice characteristics needed
- Pacing and timing notes
- Emphasis points
- Background audio suggestions
- Delivery style

Make it performance-ready.`;
          responseSchema = {
            type: "object",
            properties: {
              script: { type: "string" },
              voice_type: { type: "string" },
              emotion: { type: "string" },
              pacing: { type: "string" },
              emphasis: { type: "array", items: { type: "string" } },
              background_audio: { type: "string" },
              delivery_notes: { type: "string" }
            }
          };
          break;

        case "3d-modeler":
          prompt = `You are a professional 3D artist and technical artist. Design a detailed 3D model specification for: "${demoInput}"

Include:
- Model type and style
- Geometry details and topology
- Texture and material specifications
- Rigging requirements
- Polygon budget
- Technical specifications
- Optimization notes

Be production-ready and technically accurate.`;
          responseSchema = {
            type: "object",
            properties: {
              model_type: { type: "string" },
              geometry: { type: "string" },
              materials: { type: "array", items: { type: "string" } },
              textures: { type: "array", items: { type: "string" } },
              polygon_count: { type: "string" },
              rigging: { type: "string" },
              optimization: { type: "string" }
            }
          };
          break;
      }

      // Security moderation
      if (tool.id === 'code-assistant') {
        const safetyCheck = await base44.integrations.Core.InvokeLLM({
          prompt: `Is this code request safe and legal? "${demoInput}"`,
          response_json_schema: {
            type: "object",
            properties: {
              is_safe: { type: "boolean" },
              reason: { type: "string" }
            }
          }
        });

        if (!safetyCheck.is_safe) {
          setDemoOutput({
            error: "Request blocked for security",
            reason: safetyCheck.reason
          });
          setIsGenerating(false);
          return;
        }
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: responseSchema
      });

      setDemoOutput(result);
    } catch (error) {
      console.error("Demo generation error:", error);
      alert("Demo generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredTools = activeTab === "all" 
    ? aiTools 
    : aiTools.filter(tool => tool.category === activeTab);

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-violet-950 via-purple-950 to-indigo-950">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center">
              <Wand2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">AI Studio</h1>
              <p className="text-gray-300">100% FREE • Unlimited AI generation • No credit card required</p>
            </div>
          </div>

          {/* Free Credits Banner */}
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gift className="w-6 h-6 text-green-400" />
              <div>
                <p className="text-white font-bold">Get 100 Free AI Credits!</p>
                <p className="text-gray-300 text-sm">Try any tool free • No credit card required</p>
              </div>
            </div>
            <Button className="bg-green-600 hover:bg-green-700">
              Claim Credits
            </Button>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="bg-white/10 backdrop-blur-xl border border-white/20">
            <TabsTrigger value="all">All Tools</TabsTrigger>
            <TabsTrigger value="image_generation">Image</TabsTrigger>
            <TabsTrigger value="video_editing">Video</TabsTrigger>
            <TabsTrigger value="music_creation">Music</TabsTrigger>
            <TabsTrigger value="code_development">Code</TabsTrigger>
            <TabsTrigger value="writing">Writing</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tools Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool, idx) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${tool.color} rounded-2xl flex items-center justify-center`}>
                      <tool.icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className="bg-white/10 text-white capitalize">
                        {tool.tier}
                      </Badge>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">
                          ${tool.monthlyPrice}
                        </div>
                        <div className="text-gray-400 text-xs">/month</div>
                      </div>
                    </div>
                  </div>
                  <CardTitle className="text-white text-xl">{tool.name}</CardTitle>
                  <p className="text-gray-400 text-sm">{tool.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Features */}
                  <div>
                    <p className="text-gray-400 text-xs font-semibold mb-2">KEY FEATURES</p>
                    <div className="flex flex-wrap gap-2">
                      {tool.features.map((feature, i) => (
                        <span key={i} className="px-2 py-1 bg-white/5 rounded-lg text-gray-300 text-xs">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div>
                    <p className="text-gray-400 text-xs font-semibold mb-2">AI CAPABILITIES</p>
                    <div className="space-y-1">
                      {tool.capabilities.slice(0, 3).map((cap, i) => (
                        <div key={i} className="flex items-start gap-2 text-gray-300 text-xs">
                          <Brain className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                          {cap}
                        </div>
                      ))}
                      {tool.capabilities.length > 3 && (
                        <button 
                          onClick={() => {
                            setSelectedTool(tool);
                            setShowDemo(true);
                          }}
                          className="text-purple-400 text-xs hover:text-purple-300 flex items-center gap-1"
                        >
                          +{tool.capabilities.length - 3} more capabilities
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setSelectedTool(tool);
                        setShowDemo(true);
                      }}
                      className="flex-1 bg-white/10 hover:bg-white/20"
                      variant="outline"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Try Demo
                    </Button>
                    <Button className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600">
                      Use Free
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Demo Modal */}
        {showDemo && selectedTool && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => {
              setShowDemo(false);
              setDemoInput("");
              setDemoOutput(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl bg-gradient-to-br from-gray-900 to-purple-900 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className={`w-16 h-16 bg-gradient-to-br ${selectedTool.color} rounded-2xl flex items-center justify-center`}>
                  <selectedTool.icon className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-white mb-2">{selectedTool.name}</h2>
                  <p className="text-gray-300">{selectedTool.description}</p>
                </div>
              </div>

              {/* All Capabilities */}
              <div className="mb-6">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  AI Capabilities
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {selectedTool.capabilities.map((cap, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 bg-white/5 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Demo Input */}
              <div className="mb-6">
                <label className="text-white font-medium mb-2 block">
                  Try it now - Enter your prompt:
                </label>
                <Input
                  value={demoInput}
                  onChange={(e) => setDemoInput(e.target.value)}
                  placeholder={`e.g., "Create a futuristic city at sunset" or "Write a function to sort an array"`}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-500 mb-3"
                />
                <Button
                  onClick={() => handleToolDemo(selectedTool)}
                  disabled={isGenerating || !demoInput.trim()}
                  className={`w-full bg-gradient-to-r ${selectedTool.color} text-white font-bold py-6 text-lg`}
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 mr-2" />
                      Generate with AI
                    </>
                  )}
                </Button>
              </div>

              {/* Demo Output */}
              {demoOutput && (
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="bg-white/5 rounded-2xl p-6 border border-white/10"
               >
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-white font-bold flex items-center gap-2">
                     <Sparkles className="w-5 h-5 text-yellow-400" />
                     Generated {selectedTool.name}
                   </h3>
                   <Button
                     onClick={() => setDemoOutput(null)}
                     variant="outline"
                     size="sm"
                     className="border-white/20 text-white hover:bg-white/10"
                   >
                     Clear
                   </Button>
                 </div>

                 {/* Image Output */}
                 {demoOutput.type === "image" && (
                   <div className="space-y-4">
                     <img 
                       src={demoOutput.url} 
                       alt="Generated" 
                       className="w-full rounded-xl shadow-2xl"
                     />
                     <div className="flex gap-2">
                       <Button className="flex-1 bg-green-600 hover:bg-green-700">
                         Download Image
                       </Button>
                       <Button variant="outline" className="border-white/20 text-white">
                         Share
                       </Button>
                     </div>
                   </div>
                 )}

                 {/* Video Output */}
                 {demoOutput.type === "video" && (
                   <div className="space-y-4">
                     <h4 className="text-white font-semibold mb-3">🎬 Video Scenes</h4>
                     <div className="grid grid-cols-3 gap-3">
                       {demoOutput.scenes?.map((scene, i) => (
                         <div key={i} className="relative group">
                           <img src={scene} className="w-full rounded-lg" alt={`Scene ${i+1}`} />
                           <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                             <span className="text-white font-bold">Scene {i+1}</span>
                           </div>
                         </div>
                       ))}
                     </div>
                     <Button className="w-full bg-purple-600 hover:bg-purple-700">
                       Export Video Project
                     </Button>
                   </div>
                 )}

                 {/* Music Output */}
                 {generationOutput.type === "music" && (
                   <div className="space-y-4">
                     <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6">
                       <h4 className="text-white font-bold text-xl mb-2">{generationOutput.title}</h4>
                       <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                         <div>
                           <span className="text-gray-400">Genre:</span>
                           <span className="text-white ml-2">{generationOutput.genre}</span>
                         </div>
                         <div>
                           <span className="text-gray-400">Tempo:</span>
                           <span className="text-white ml-2">{generationOutput.tempo_bpm} BPM</span>
                         </div>
                         <div>
                           <span className="text-gray-400">Key:</span>
                           <span className="text-white ml-2">{generationOutput.key}</span>
                         </div>
                         <div>
                           <span className="text-gray-400">Mood:</span>
                           <span className="text-white ml-2">{generationOutput.mood}</span>
                         </div>
                       </div>

                       <audio controls className="w-full mb-4">
                         <source src={generationOutput.audio_preview} type="audio/mpeg" />
                       </audio>

                       {generationOutput.structure && (
                         <div className="bg-white/5 rounded-lg p-4">
                           <h5 className="text-white font-semibold mb-2">Song Structure:</h5>
                           <div className="space-y-1 text-sm">
                             {generationOutput.structure.map((part, i) => (
                               <div key={i} className="flex justify-between text-gray-300">
                                 <span>{part.section}</span>
                                 <span>{part.timestamp}</span>
                               </div>
                             ))}
                           </div>
                         </div>
                       )}
                     </div>
                   </div>
                 )}

                 {/* Voice Output */}
                 {generationOutput.type === "voice" && (
                   <div className="space-y-4">
                     <div className="bg-blue-500/10 rounded-xl p-6 border border-blue-500/30">
                       <h4 className="text-white font-semibold mb-3">🎙️ Voice Script</h4>
                       <p className="text-white mb-4 leading-relaxed">{generationOutput.script}</p>
                       <div className="grid grid-cols-2 gap-3 text-sm">
                         <div className="bg-white/5 rounded-lg p-3">
                           <span className="text-gray-400 text-xs">Style</span>
                           <p className="text-white">{generationOutput.voice_style}</p>
                         </div>
                         <div className="bg-white/5 rounded-lg p-3">
                           <span className="text-gray-400 text-xs">Pace</span>
                           <p className="text-white">{generationOutput.pace}</p>
                         </div>
                         <div className="bg-white/5 rounded-lg p-3">
                           <span className="text-gray-400 text-xs">Tone</span>
                           <p className="text-white">{generationOutput.tone}</p>
                         </div>
                         <div className="bg-white/5 rounded-lg p-3">
                           <span className="text-gray-400 text-xs">Emphasis</span>
                           <p className="text-white">{generationOutput.emphasis_words?.join(', ')}</p>
                         </div>
                       </div>
                     </div>
                     <Button className="w-full bg-blue-600 hover:bg-blue-700">
                       Generate Voice Audio
                     </Button>
                   </div>
                 )}

                 {/* Code Output */}
                 {generationOutput.type === "code" && (
                   <div className="space-y-4">
                     <div className="bg-gray-900 rounded-xl p-4">
                       <div className="flex items-center justify-between mb-2">
                         <span className="text-gray-400 text-sm">{generationOutput.language}</span>
                         <Button size="sm" variant="outline">Copy Code</Button>
                       </div>
                       <pre className="text-green-400 text-sm overflow-x-auto">
                         <code>{generationOutput.code}</code>
                       </pre>
                     </div>
                     <div className="bg-white/5 rounded-lg p-4">
                       <h5 className="text-white font-semibold mb-2">Explanation:</h5>
                       <p className="text-gray-300 text-sm">{generationOutput.explanation}</p>
                     </div>
                   </div>
                 )}

                 {/* 3D Output */}
                 {generationOutput.type === "3d" && (
                   <div className="space-y-4">
                     <img src={generationOutput.preview_url} className="w-full rounded-xl" alt="3D Preview" />
                     <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                       Export 3D Model
                     </Button>
                   </div>
                 )}
               </motion.div>
              )}

              {/* Pricing */}
              <div className="mt-6 p-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl border border-green-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-xl mb-1">
                      100% FREE Forever
                    </p>
                    <p className="text-gray-300 text-sm">
                      Unlimited generations • No credit card required • No limits
                    </p>
                  </div>
                  <Button className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-6">
                    Start Creating Free
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}