import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  ChevronLeft, Download, Share2, Upload, Type,
  Palette, Image as ImageIcon, Sparkles, Laugh,
  Grid3x3, RefreshCw, AlignCenter, Shuffle, Wand2, Zap
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Organized meme templates by category
const memesByCategory = {
  classic: [
    { id: "drake", name: "Drake Hotline Bling", url: "https://i.imgflip.com/30b1gx.jpg", topText: "Bad idea", bottomText: "Good idea" },
    { id: "distracted", name: "Distracted Boyfriend", url: "https://i.imgflip.com/1ur9b0.jpg", topText: "Responsibility", bottomText: "Distraction" },
    { id: "success", name: "Success Kid", url: "https://i.imgflip.com/1bhk.jpg", topText: "Victory", bottomText: "Success!" },
    { id: "fry", name: "Futurama Fry", url: "https://i.imgflip.com/1bgw.jpg", topText: "Not sure if...", bottomText: "Or just..." },
    { id: "doge", name: "Doge", url: "https://i.imgflip.com/4t0m5.jpg", topText: "Such wow", bottomText: "Much meme" },
    { id: "bernie", name: "Bernie Sanders", url: "https://i.imgflip.com/4x6d.jpg", topText: "I am once again asking", bottomText: "For your support" },
    { id: "bad_luck", name: "Bad Luck Brian", url: "https://i.imgflip.com/1bip.jpg", topText: "Something good happens", bottomText: "Something bad happens" },
    { id: "good_guy", name: "Good Guy Greg", url: "https://i.imgflip.com/1bil.jpg", topText: "Does nice thing", bottomText: "For no reason" },
  ],
  smart: [
    { id: "brain", name: "Expanding Brain", url: "https://i.imgflip.com/1jwhww.jpg", topText: "Basic thinking", bottomText: "Galaxy brain thinking" },
    { id: "thinking", name: "Roll Safe", url: "https://i.imgflip.com/1h7in3.jpg", topText: "Can't have problem", bottomText: "If you avoid it" },
    { id: "philosoraptor", name: "Philosoraptor", url: "https://i.imgflip.com/1bgs.jpg", topText: "Philosophical question", bottomText: "Deep thought" },
    { id: "math_lady", name: "Math Lady", url: "https://i.imgflip.com/gjk44.jpg", topText: "Trying to calculate", bottomText: "Numbers everywhere" },
    { id: "einstein", name: "Einstein", url: "https://i.imgflip.com/3oevdk.jpg", topText: "Big brain time", bottomText: "It's all coming together" },
    { id: "brain_meme", name: "Big Brain", url: "https://i.imgflip.com/2e1fy7.jpg", topText: "Average solution", bottomText: "Big brain solution" },
  ],
  scary: [
    { id: "sleep_demon", name: "Sleep Paralysis Demon", url: "https://i.imgflip.com/5ot91h.jpg", topText: "Me at 3am", bottomText: "My demon judging me" },
    { id: "creepy_smile", name: "Creepy Smile", url: "https://i.imgflip.com/5kf7v.jpg", topText: "Hear noise at night", bottomText: "Living alone" },
    { id: "dark_hallway", name: "Dark Hallway", url: "https://i.imgflip.com/5gipc9.jpg", topText: "Getting water at 3am", bottomText: "Every shadow is danger" },
    { id: "horror_logic", name: "Horror Movie Logic", url: "https://i.imgflip.com/4nqy0h.jpg", topText: "Hears scary noise", bottomText: "Goes to investigate alone" },
  ],
  motivational: [
    { id: "shia", name: "Just Do It", url: "https://i.imgflip.com/gfgc4.jpg", topText: "Stop dreaming", bottomText: "JUST DO IT!" },
    { id: "strong", name: "You Are Strong", url: "https://i.imgflip.com/2fm6x.jpg", topText: "Hard day?", bottomText: "You survived. You're winning." },
    { id: "progress", name: "Progress", url: "https://i.imgflip.com/30hy6l.jpg", topText: "Small steps forward", bottomText: "Still progress" },
    { id: "never_give_up", name: "Never Give Up", url: "https://i.imgflip.com/3edvul.jpg", topText: "Fall seven times", bottomText: "Stand up eight" },
    { id: "grind", name: "Keep Grinding", url: "https://i.imgflip.com/5c94v7.jpg", topText: "Success takes time", bottomText: "Keep pushing" },
  ],
  reaction: [
    { id: "woman_cat", name: "Woman Yelling at Cat", url: "https://i.imgflip.com/345v97.jpg", topText: "Angry yelling", bottomText: "Confused response" },
    { id: "danger", name: "I'm In Danger", url: "https://i.imgflip.com/2wifvo.jpg", topText: "Oh no", bottomText: "I'm in danger" },
    { id: "batman_slap", name: "Batman Slapping Robin", url: "https://i.imgflip.com/9ehk.jpg", topText: "Bad idea", bottomText: "*slap*" },
    { id: "hide_pain", name: "Hide the Pain Harold", url: "https://i.imgflip.com/gk5el.jpg", topText: "Everything's fine", bottomText: "Not dying inside at all" },
    { id: "panik", name: "Panik Kalm Panik", url: "https://i.imgflip.com/3qqcim.jpg", topText: "Problem - PANIK", bottomText: "Solution - KALM" },
    { id: "surprised_pikachu", name: "Surprised Pikachu", url: "https://i.imgflip.com/2zh47u.jpg", topText: "Does nothing", bottomText: "Surprised at outcome" },
    { id: "monkey_puppet", name: "Awkward Monkey", url: "https://i.imgflip.com/3lmzyx.jpg", topText: "Awkward moment", bottomText: "*looks away*" },
    { id: "michael_scott", name: "Michael Scott NO", url: "https://i.imgflip.com/5x6hx.jpg", topText: "Please no", bottomText: "NO. GOD NO!" },
  ],
  work: [
    { id: "monday", name: "Monday Blues", url: "https://i.imgflip.com/1e7ql7.jpg", topText: "Weekend over", bottomText: "Monday reality hits" },
    { id: "meeting", name: "Useless Meeting", url: "https://i.imgflip.com/1bij.jpg", topText: "This meeting", bottomText: "Could've been an email" },
    { id: "deadline", name: "Deadline Panic", url: "https://i.imgflip.com/2wifvo.jpg", topText: "Deadline tomorrow", bottomText: "Starting now" },
    { id: "wfh", name: "Work From Home", url: "https://i.imgflip.com/gk5el.jpg", topText: "Professional on camera", bottomText: "Pajamas off camera" },
    { id: "coffee", name: "Coffee Life", url: "https://i.imgflip.com/wxica.jpg", topText: "3 hours sleep", bottomText: "5 cups of coffee" },
    { id: "friday", name: "Friday Vibes", url: "https://i.imgflip.com/14wx.jpg", topText: "Finally Friday", bottomText: "Survived the week" },
  ],
  tech: [
    { id: "stack_overflow", name: "Stack Overflow", url: "https://i.imgflip.com/1jwhww.jpg", topText: "Read docs", bottomText: "Copy Stack Overflow" },
    { id: "works_machine", name: "Works On My Machine", url: "https://i.imgflip.com/gk5el.jpg", topText: "Works perfectly", bottomText: "On my machine" },
    { id: "bug_fix", name: "Bug Fix", url: "https://i.imgflip.com/2wifvo.jpg", topText: "Fixed one bug", bottomText: "Created three more" },
    { id: "production", name: "Push to Prod", url: "https://i.imgflip.com/2od.jpg", topText: "Push to production", bottomText: "Friday 5pm" },
    { id: "ai_code", name: "AI Coding", url: "https://i.imgflip.com/26am.jpg", topText: "How did this work?", bottomText: "AI magic" },
  ],
  gaming: [
    { id: "rage_quit", name: "Rage Quit", url: "https://i.imgflip.com/2i0.jpg", topText: "Dies to boss", bottomText: "47th time" },
    { id: "lag", name: "Lag", url: "https://i.imgflip.com/5gipc9.jpg", topText: "About to win", bottomText: "*connection lost*" },
    { id: "one_more", name: "One More Game", url: "https://i.imgflip.com/4kzu0w.jpg", topText: "Goes to sleep", bottomText: "One more game" },
    { id: "backlog", name: "Game Backlog", url: "https://i.imgflip.com/2wq4h.jpg", topText: "500 unplayed games", bottomText: "Buys another on sale" },
  ],
  food: [
    { id: "pizza", name: "Pizza Life", url: "https://i.imgflip.com/30b1gx.jpg", topText: "Eating healthy", bottomText: "Pizza everyday" },
    { id: "hungry", name: "Always Hungry", url: "https://i.imgflip.com/1bgw.jpg", topText: "Just ate", bottomText: "Hungry again" },
    { id: "diet", name: "Diet Tomorrow", url: "https://i.imgflip.com/1jwhww.jpg", topText: "Start diet tomorrow", bottomText: "Eat cake today" },
    { id: "takeout", name: "Takeout", url: "https://i.imgflip.com/gk5el.jpg", topText: "Food in fridge", bottomText: "Orders takeout" },
  ],
  wholesome: [
    { id: "wholesome_seal", name: "Wholesome Seal", url: "https://i.imgflip.com/2dd3kz.jpg", topText: "Gets compliment", bottomText: "Actually believes it" },
    { id: "happy_dog", name: "Happy Dog", url: "https://i.imgflip.com/3cu5.jpg", topText: "Good morning", bottomText: "You're amazing" },
    { id: "support", name: "Support", url: "https://i.imgflip.com/30b1gx.jpg", topText: "No matter what", bottomText: "I got your back" },
  ],
  chaos: [
    { id: "disaster", name: "Disaster Girl", url: "https://i.imgflip.com/2od.jpg", topText: "Chaos ensues", bottomText: "Perfect" },
    { id: "this_fine", name: "This Is Fine", url: "https://i.imgflip.com/wxica.jpg", topText: "Everything on fire", bottomText: "This is fine" },
    { id: "explosion", name: "Explosion", url: "https://i.imgflip.com/3si4.jpg", topText: "Small problem", bottomText: "Complete disaster" },
  ],
  business: [
    { id: "stonks", name: "Stonks", url: "https://i.imgflip.com/2hvti.jpg", topText: "Bad investment", bottomText: "STONKS" },
    { id: "broke", name: "Broke", url: "https://i.imgflip.com/1e7ql7.jpg", topText: "Paycheck arrives", bottomText: "Bills: It's free real estate" },
    { id: "invest", name: "Investment", url: "https://i.imgflip.com/1h7in3.jpg", topText: "Can't lose money", bottomText: "If never invest" },
  ],
  school: [
    { id: "homework", name: "Homework", url: "https://i.imgflip.com/2wifvo.jpg", topText: "Due tomorrow", bottomText: "Haven't started" },
    { id: "exam", name: "Exam Panic", url: "https://i.imgflip.com/3qqcim.jpg", topText: "Didn't study", bottomText: "PANIK" },
    { id: "group_project", name: "Group Project", url: "https://i.imgflip.com/gk5el.jpg", topText: "Group project", bottomText: "Did it all myself" },
  ],
  relationship: [
    { id: "single", name: "Single Life", url: "https://i.imgflip.com/1e7ql7.jpg", topText: "Being single", bottomText: "More money" },
    { id: "crush", name: "Talking to Crush", url: "https://i.imgflip.com/2ybua0.jpg", topText: "Say something cool", bottomText: "So...you like stuff?" },
  ],
  animal: [
    { id: "grumpy_cat", name: "Grumpy Cat", url: "https://i.imgflip.com/30b1gx.jpg", topText: "Morning person?", bottomText: "No" },
    { id: "seal", name: "Awkward Seal", url: "https://i.imgflip.com/1e7ql7.jpg", topText: "Awkward moment", bottomText: "Everyone noticed" },
  ],
  sarcasm: [
    { id: "spongebob", name: "Mocking SpongeBob", url: "https://i.imgflip.com/1otk96.jpg", topText: "YoU nEeD tO", bottomText: "Do ThIs" },
    { id: "well_yes", name: "Well Yes But No", url: "https://i.imgflip.com/30b1gx.jpg", topText: "That's correct", bottomText: "Well yes but no" },
  ],
  debate: [
    { id: "change_mind", name: "Change My Mind", url: "https://i.imgflip.com/24y43o.jpg", topText: "Controversial opinion", bottomText: "Change my mind" },
  ],
};

// Flatten all templates for easy access
const memeTemplates = Object.entries(memesByCategory).flatMap(([category, templates]) =>
  templates.map(t => ({ ...t, category }))
);

export default function MemeCreator() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedTemplate, setSelectedTemplate] = useState(memeTemplates[0]);
  const [customImage, setCustomImage] = useState(null);
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [fontSize, setFontSize] = useState(48);
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [showTemplates, setShowTemplates] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    if (selectedTemplate) {
      setTopText(selectedTemplate.topText);
      setBottomText(selectedTemplate.bottomText);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (selectedTemplate || customImage) {
      drawMeme();
    }
  }, [topText, bottomText, fontSize, textColor, selectedTemplate?.id, customImage]);

  const drawMeme = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.drawImage(img, 0, 0);
      
      ctx.fillStyle = textColor;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = fontSize / 20;
      ctx.font = `bold ${fontSize}px Impact, Arial Black, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      const drawText = (text, y) => {
        const maxWidth = canvas.width - 40;
        const words = text.toUpperCase().split(' ');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
          const testLine = currentLine + ' ' + words[i];
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth) {
            lines.push(currentLine);
            currentLine = words[i];
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine);

        lines.forEach((line, index) => {
          const yPos = y + (index * fontSize * 1.1);
          ctx.strokeText(line, canvas.width / 2, yPos);
          ctx.fillText(line, canvas.width / 2, yPos);
        });
      };

      if (topText) {
        drawText(topText, 20);
      }
      
      if (bottomText) {
        const bottomY = canvas.height - (fontSize * 1.5) - 20;
        drawText(bottomText, bottomY);
      }
      
      setImageLoaded(true);
    };

    img.src = customImage || selectedTemplate.url;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomImage(event.target.result);
        setShowTemplates(false);
        setImageLoaded(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = 'my-meme.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve));
      const file = new File([blob], 'meme.png', { type: 'image/png' });

      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'My Meme',
          text: 'Check out this meme I created!'
        });
      } else {
        alert('Share feature not supported. Use download instead!');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const generateAIMeme = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template first');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create hilarious meme text for "${selectedTemplate.name}" template (${selectedTemplate.category} category). Make it viral, punchy, and relatable to 2025 internet culture. Return JSON with topText and bottomText.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            topText: { type: "string" },
            bottomText: { type: "string" }
          }
        }
      });

      setTopText(result.topText || "");
      setBottomText(result.bottomText || "");
      toast.success('🎉 AI meme generated!');
    } catch (err) {
      console.error('AI generation failed:', err);
      toast.error('AI failed. Try manual text!');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-pink-950 to-gray-950 pb-20">
      {/* Header */}
      <div className="sticky top-16 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(createPageUrl("Universe"))}
            className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Laugh className="w-8 h-8 text-pink-400 animate-bounce" />
              Meme Creator
            </h1>
            <p className="text-gray-400">🔥 Create viral memes in seconds 🔥</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              disabled={!imageLoaded}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={handleShare}
              disabled={!imageLoaded}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Canvas Area */}
          <div className="space-y-4">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="relative bg-black rounded-xl overflow-hidden">
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                      <RefreshCw className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  <canvas
                    ref={canvasRef}
                    className="w-full h-auto"
                    style={{ maxHeight: '600px' }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => {
                  setShowTemplates(true);
                  setCustomImage(null);
                }}
                variant="outline"
                className="bg-white/5 hover:bg-white/10"
              >
                <Grid3x3 className="w-4 h-4 mr-2" />
                Templates
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="bg-white/5 hover:bg-white/10"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={generateAIMeme}
                disabled={isGenerating}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    AI Magic
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  const randomTemplate = memeTemplates[Math.floor(Math.random() * memeTemplates.length)];
                  setSelectedTemplate(randomTemplate);
                  setCustomImage(null);
                  setImageLoaded(false);
                }}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Random
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Text Inputs */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <Type className="w-5 h-5 text-pink-400" />
                  <h3 className="text-white font-bold text-lg">Meme Text</h3>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Top Text</label>
                  <Input
                    value={topText}
                    onChange={(e) => setTopText(e.target.value)}
                    placeholder="Enter top text..."
                    className="bg-white/10 border-white/20 text-white text-lg"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Bottom Text</label>
                  <Input
                    value={bottomText}
                    onChange={(e) => setBottomText(e.target.value)}
                    placeholder="Enter bottom text..."
                    className="bg-white/10 border-white/20 text-white text-lg"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => {
                      setTopText("");
                      setBottomText("");
                    }}
                    size="sm"
                    variant="outline"
                    className="bg-white/5 hover:bg-white/10"
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={() => {
                      const temp = topText;
                      setTopText(bottomText);
                      setBottomText(temp);
                    }}
                    size="sm"
                    variant="outline"
                    className="bg-white/5 hover:bg-white/10"
                  >
                    <Shuffle className="w-3 h-3 mr-1" />
                    Swap
                  </Button>
                  <Button
                    onClick={() => {
                      setTopText(topText.toUpperCase());
                      setBottomText(bottomText.toUpperCase());
                    }}
                    size="sm"
                    variant="outline"
                    className="bg-white/5 hover:bg-white/10"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    CAPS
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Style Controls */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <Palette className="w-5 h-5 text-pink-400" />
                  <h3 className="text-white font-bold text-lg">Text Style</h3>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">
                    Font Size: {fontSize}px
                  </label>
                  <Slider
                    value={[fontSize]}
                    onValueChange={(value) => setFontSize(value[0])}
                    min={24}
                    max={96}
                    step={4}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Text Color</label>
                  <div className="flex gap-3">
                    {['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setTextColor(color)}
                        className={`w-12 h-12 rounded-xl border-2 transition ${
                          textColor === color ? 'border-pink-400 scale-110' : 'border-white/20'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-12 h-12 rounded-xl cursor-pointer"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Templates Grid */}
            {showTemplates && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="w-5 h-5 text-pink-400" />
                      <h3 className="text-white font-bold text-lg">Templates</h3>
                    </div>
                    <span className="text-gray-400 text-sm">
                      {selectedCategory === 'all' ? memeTemplates.length : memeTemplates.filter(t => t.category === selectedCategory).length} memes
                    </span>
                  </div>

                  {/* Category Filter */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['all', 'classic', 'smart', 'scary', 'motivational', 'reaction', 'work', 'tech', 'school', 'relationship', 'animal', 'business', 'chaos', 'sarcasm', 'debate'].map((cat) => {
                      const icons = {
                        all: '🔥', classic: '⭐', smart: '🧠', scary: '👻', motivational: '💪',
                        reaction: '😱', work: '💼', tech: '💻', school: '📚', relationship: '❤️',
                        animal: '🐱', business: '💰', chaos: '🔥', sarcasm: '😏', debate: '🤔'
                      };
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            selectedCategory === cat
                              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg scale-105'
                              : 'bg-white/10 text-gray-300 hover:bg-white/20'
                          }`}
                        >
                          {icons[cat]} {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
                    {memeTemplates
                      .filter(t => selectedCategory === 'all' || t.category === selectedCategory)
                      .map((template) => (
                        <motion.button
                          key={template.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setSelectedTemplate(template);
                            setCustomImage(null);
                            setImageLoaded(false);
                          }}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition ${
                            selectedTemplate.id === template.id && !customImage
                              ? 'border-pink-400 shadow-lg shadow-pink-400/50'
                              : 'border-white/20 hover:border-white/40'
                          }`}
                        >
                          <img
                            src={template.url}
                            alt={template.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                            <span className="text-white text-xs font-medium line-clamp-2">
                              {template.name}
                            </span>
                          </div>
                        </motion.button>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Pro Tips */}
        <Card className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-500/30 mt-6">
          <CardContent className="p-6">
            <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-400 animate-pulse" />
              Pro Meme Tips 🚀
            </h3>
            <div className="grid md:grid-cols-4 gap-3 text-sm">
              <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition">
                <p className="text-pink-400 font-semibold mb-1">✨ AI Magic</p>
                <p className="text-gray-300">Let AI create hilarious, trending meme text for you!</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition">
                <p className="text-pink-400 font-semibold mb-1">🎯 Keep it Punchy</p>
                <p className="text-gray-300">Short text = Maximum impact. Less is more in memes!</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition">
                <p className="text-pink-400 font-semibold mb-1">🎲 Random Button</p>
                <p className="text-gray-300">Can't decide? Hit Random for instant inspiration!</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition">
                <p className="text-pink-400 font-semibold mb-1">📱 Go Viral</p>
                <p className="text-gray-300">Download & share everywhere - make the internet laugh!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}