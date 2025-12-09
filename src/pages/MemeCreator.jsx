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
import { motion, AnimatePresence } from "framer-motion";

const memeTemplates = [
  {
    id: "drake",
    name: "Drake Hotline Bling",
    url: "https://i.imgflip.com/30b1gx.jpg",
    topText: "Eating pizza with a fork",
    bottomText: "Eating pizza with your hands"
  },
  {
    id: "distracted",
    name: "Distracted Boyfriend",
    url: "https://i.imgflip.com/1ur9b0.jpg",
    topText: "Working on important project",
    bottomText: "Scrolling memes instead"
  },
  {
    id: "success",
    name: "Success Kid",
    url: "https://i.imgflip.com/1bhk.jpg",
    topText: "Found my keys",
    bottomText: "In my pocket the whole time"
  },
  {
    id: "fry",
    name: "Futurama Fry",
    url: "https://i.imgflip.com/1bgw.jpg",
    topText: "Not sure if hungry",
    bottomText: "Or just bored"
  },
  {
    id: "brain",
    name: "Expanding Brain",
    url: "https://i.imgflip.com/1jwhww.jpg",
    topText: "Reading documentation",
    bottomText: "Stack overflow everything"
  },
  {
    id: "picard",
    name: "Picard Facepalm",
    url: "https://i.imgflip.com/1bij.jpg",
    topText: "When someone says 'just google it'",
    bottomText: "After you spent 3 hours googling"
  },
  {
    id: "buttons",
    name: "Two Buttons",
    url: "https://i.imgflip.com/1g8my4.jpg",
    topText: "Be productive",
    bottomText: "Watch one more episode"
  },
  {
    id: "woman",
    name: "Woman Yelling at Cat",
    url: "https://i.imgflip.com/345v97.jpg",
    topText: "You need to wake up early!",
    bottomText: "But sleep is amazing tho"
  },
  {
    id: "bernie",
    name: "Bernie Sanders",
    url: "https://i.imgflip.com/4x6d.jpg",
    topText: "I am once again asking",
    bottomText: "For weekend to come faster"
  },
  {
    id: "ralph",
    name: "I'm In Danger",
    url: "https://i.imgflip.com/2wifvo.jpg",
    topText: "Deadline is tomorrow",
    bottomText: "Haven't started yet"
  },
  {
    id: "disaster",
    name: "Disaster Girl",
    url: "https://i.imgflip.com/2od.jpg",
    topText: "Accidentally liked their post",
    bottomText: "From 3 years ago"
  },
  {
    id: "change",
    name: "Change My Mind",
    url: "https://i.imgflip.com/24y43o.jpg",
    topText: "Pineapple belongs on pizza",
    bottomText: "Change my mind"
  },
  {
    id: "thinking",
    name: "Roll Safe",
    url: "https://i.imgflip.com/1h7in3.jpg",
    topText: "Can't fail the test",
    bottomText: "If you don't take it"
  },
  {
    id: "stonks",
    name: "Stonks",
    url: "https://i.imgflip.com/2hvti.jpg",
    topText: "Spent entire paycheck",
    bottomText: "On meme coins - Stonks"
  },
  {
    id: "spongebob",
    name: "Mocking SpongeBob",
    url: "https://i.imgflip.com/1otk96.jpg",
    topText: "YoU nEeD tO wAkE uP eArLy",
    bottomText: "ToMoRrOw"
  }
];

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
    setIsGenerating(true);
    try {
      const memeContext = selectedTemplate?.name || "general meme";
      const prompt = `You are a viral meme creator. Generate hilarious, modern, and relatable meme text for a "${memeContext}" template. 

Make it:
- Super funny and witty
- Relatable to everyday situations
- Current with 2024 trends
- Short and punchy
- Internet culture savvy

Return ONLY a JSON object with "topText" and "bottomText". Be creative and make people laugh!`;
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            topText: { type: "string" },
            bottomText: { type: "string" }
          }
        }
      });

      setTopText(result.topText);
      setBottomText(result.bottomText);
    } catch (err) {
      console.error('AI generation failed:', err);
      alert('Failed to generate AI meme. Try manual text!');
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
                    <span className="text-gray-400 text-sm">{memeTemplates.length} memes</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
                    {memeTemplates.map((template) => (
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
                            ? 'border-pink-400'
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