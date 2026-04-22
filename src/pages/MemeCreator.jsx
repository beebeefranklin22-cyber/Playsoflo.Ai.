import React, { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  ChevronLeft, Download, Share2, Upload, Wand2,
  Shuffle, RefreshCw, ChevronDown, ChevronUp, Palette, Grid3x3
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const memeTemplates = [
  { id: "drake", name: "Drake", url: "https://i.imgflip.com/30b1gx.jpg", topText: "Bad idea", bottomText: "Good idea", category: "classic" },
  { id: "distracted", name: "Distracted BF", url: "https://i.imgflip.com/1ur9b0.jpg", topText: "Responsibility", bottomText: "Distraction", category: "classic" },
  { id: "woman_cat", name: "Woman & Cat", url: "https://i.imgflip.com/345v97.jpg", topText: "Angry yelling", bottomText: "Confused response", category: "reaction" },
  { id: "surprised_pikachu", name: "Surprised Pikachu", url: "https://i.imgflip.com/2zh47u.jpg", topText: "Does nothing", bottomText: "Surprised at outcome", category: "reaction" },
  { id: "panik", name: "Panik Kalm", url: "https://i.imgflip.com/3qqcim.jpg", topText: "Problem - PANIK", bottomText: "Solution - KALM", category: "reaction" },
  { id: "brain", name: "Big Brain", url: "https://i.imgflip.com/1jwhww.jpg", topText: "Basic thinking", bottomText: "Galaxy brain", category: "smart" },
  { id: "thinking", name: "Roll Safe", url: "https://i.imgflip.com/1h7in3.jpg", topText: "Can't have problem", bottomText: "If you avoid it", category: "smart" },
  { id: "fry", name: "Futurama Fry", url: "https://i.imgflip.com/1bgw.jpg", topText: "Not sure if...", bottomText: "Or just...", category: "classic" },
  { id: "success", name: "Success Kid", url: "https://i.imgflip.com/1bhk.jpg", topText: "Victory", bottomText: "Success!", category: "classic" },
  { id: "doge", name: "Doge", url: "https://i.imgflip.com/4t0m5.jpg", topText: "Such wow", bottomText: "Much meme", category: "classic" },
  { id: "batman_slap", name: "Batman Slap", url: "https://i.imgflip.com/9ehk.jpg", topText: "Bad idea", bottomText: "*slap*", category: "reaction" },
  { id: "hide_pain", name: "Hide the Pain", url: "https://i.imgflip.com/gk5el.jpg", topText: "Everything's fine", bottomText: "Not dying inside at all", category: "reaction" },
  { id: "change_mind", name: "Change My Mind", url: "https://i.imgflip.com/24y43o.jpg", topText: "Controversial opinion", bottomText: "Change my mind", category: "debate" },
  { id: "spongebob", name: "Mocking SpongeBob", url: "https://i.imgflip.com/1otk96.jpg", topText: "YoU nEeD tO", bottomText: "Do ThIs", category: "sarcasm" },
  { id: "stonks", name: "Stonks", url: "https://i.imgflip.com/2hvti.jpg", topText: "Bad investment", bottomText: "STONKS", category: "business" },
  { id: "this_fine", name: "This Is Fine", url: "https://i.imgflip.com/wxica.jpg", topText: "Everything on fire", bottomText: "This is fine", category: "chaos" },
  { id: "michael_scott", name: "Michael Scott NO", url: "https://i.imgflip.com/5x6hx.jpg", topText: "Please no", bottomText: "NO. GOD NO!", category: "reaction" },
  { id: "bad_luck", name: "Bad Luck Brian", url: "https://i.imgflip.com/1bip.jpg", topText: "Something good happens", bottomText: "Something bad happens", category: "classic" },
  { id: "monkey_puppet", name: "Awkward Monkey", url: "https://i.imgflip.com/3lmzyx.jpg", topText: "Awkward moment", bottomText: "*looks away*", category: "reaction" },
  { id: "bernie", name: "Bernie Sanders", url: "https://i.imgflip.com/4x6d.jpg", topText: "I am once again asking", bottomText: "For your support", category: "classic" },
];

const CATEGORIES = [
  { id: "all", label: "All", emoji: "🔥" },
  { id: "classic", label: "Classic", emoji: "⭐" },
  { id: "reaction", label: "Reaction", emoji: "😱" },
  { id: "smart", label: "Smart", emoji: "🧠" },
  { id: "chaos", label: "Chaos", emoji: "💥" },
  { id: "sarcasm", label: "Sarcasm", emoji: "😏" },
  { id: "business", label: "Business", emoji: "💰" },
  { id: "debate", label: "Debate", emoji: "🤔" },
];

const COLORS = ['#FFFFFF', '#000000', '#FF4444', '#44FF44', '#4444FF', '#FFFF00', '#FF44FF', '#FF8800'];

export default function MemeCreator() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const fileInputRef = useRef(null);
  const imgRef = useRef(null);

  const [selectedTemplate, setSelectedTemplate] = useState(memeTemplates[0]);
  const [customImage, setCustomImage] = useState(null);
  const [topText, setTopText] = useState("Bad idea");
  const [bottomText, setBottomText] = useState("Good idea");
  const [fontSize, setFontSize] = useState(48);
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showStyle, setShowStyle] = useState(false);

  // Text positions as percentages (0–1) of canvas size
  const [topPos, setTopPos] = useState({ x: 0.5, y: 0.05 });
  const [bottomPos, setBottomPos] = useState({ x: 0.5, y: 0.88 });

  // Drag state
  const dragging = useRef(null); // 'top' | 'bottom' | null
  const dragStart = useRef(null);
  const posStart = useRef(null);

  // Draw meme onto canvas whenever anything changes
  const drawMeme = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return;

    const ctx = canvas.getContext('2d');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    ctx.fillStyle = textColor;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = fontSize / 18;
    ctx.font = `bold ${fontSize}px Impact, Arial Black, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const drawText = (text, xFrac, yFrac) => {
      const x = xFrac * canvas.width;
      const y = yFrac * canvas.height;
      const maxWidth = canvas.width - 40;
      const words = text.toUpperCase().split(' ');
      const lines = [];
      let cur = words[0] || '';
      for (let i = 1; i < words.length; i++) {
        const test = cur + ' ' + words[i];
        if (ctx.measureText(test).width > maxWidth) { lines.push(cur); cur = words[i]; }
        else cur = test;
      }
      lines.push(cur);
      const lineH = fontSize * 1.15;
      const totalH = lines.length * lineH;
      lines.forEach((line, i) => {
        const yPos = y - totalH / 2 + i * lineH + lineH / 2;
        ctx.strokeText(line, x, yPos);
        ctx.fillText(line, x, yPos);
      });
    };

    if (topText) drawText(topText, topPos.x, topPos.y);
    if (bottomText) drawText(bottomText, bottomPos.x, bottomPos.y);
  }, [topText, bottomText, fontSize, textColor, topPos, bottomPos]);

  // Load image whenever source changes
  useEffect(() => {
    setImageLoaded(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
    };
    img.src = customImage || selectedTemplate.url;
  }, [customImage, selectedTemplate]);

  // Redraw whenever anything changes
  useEffect(() => {
    if (imageLoaded) drawMeme();
  }, [imageLoaded, drawMeme]);

  // ── Drag logic on the overlay div ──
  const getOverlayRect = () => overlayRef.current?.getBoundingClientRect();

  const clientToFrac = (clientX, clientY) => {
    const rect = getOverlayRect();
    if (!rect) return { x: 0.5, y: 0.5 };
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  const hitTest = (clientX, clientY) => {
    const frac = clientToFrac(clientX, clientY);
    const rect = getOverlayRect();
    if (!rect) return null;
    // Check within ~10% radius of each handle
    const threshold = 0.12;
    const dx_top = Math.abs(frac.x - topPos.x);
    const dy_top = Math.abs(frac.y - topPos.y);
    const dx_bot = Math.abs(frac.x - bottomPos.x);
    const dy_bot = Math.abs(frac.y - bottomPos.y);
    if (dx_top < threshold && dy_top < threshold) return 'top';
    if (dx_bot < threshold && dy_bot < threshold) return 'bottom';
    return null;
  };

  const onPointerDown = (e) => {
    const which = hitTest(e.clientX, e.clientY);
    if (!which) return;
    e.preventDefault();
    dragging.current = which;
    dragStart.current = { x: e.clientX, y: e.clientY };
    posStart.current = which === 'top' ? { ...topPos } : { ...bottomPos };
    overlayRef.current.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const frac = clientToFrac(e.clientX, e.clientY);
    if (dragging.current === 'top') setTopPos({ x: frac.x, y: frac.y });
    else setBottomPos({ x: frac.x, y: frac.y });
  };

  const onPointerUp = (e) => {
    dragging.current = null;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setCustomImage(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'meme.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise(r => canvas.toBlob(r));
    const file = new File([blob], 'meme.png', { type: 'image/png' });
    if (navigator.share) {
      await navigator.share({ files: [file], title: 'My Meme', text: 'Check out this meme!' });
    } else {
      toast.info('Use Download instead on this browser.');
    }
  };

  const generateAIMeme = async () => {
    if (!selectedTemplate) { toast.error('Select a template first'); return; }
    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create hilarious meme text for the "${selectedTemplate.name}" meme template. Make it viral and relatable. Return JSON with topText and bottomText (keep each under 8 words).`,
        response_json_schema: { type: "object", properties: { topText: { type: "string" }, bottomText: { type: "string" } } }
      });
      setTopText(result.topText || "");
      setBottomText(result.bottomText || "");
      toast.success('AI meme ready! 🎉');
    } catch {
      toast.error('AI failed — try again!');
    } finally {
      setIsGenerating(false);
    }
  };

  const pickRandom = () => {
    const t = memeTemplates[Math.floor(Math.random() * memeTemplates.length)];
    setSelectedTemplate(t);
    setTopText(t.topText);
    setBottomText(t.bottomText);
    setCustomImage(null);
    setTopPos({ x: 0.5, y: 0.05 });
    setBottomPos({ x: 0.5, y: 0.88 });
  };

  const filtered = selectedCategory === 'all' ? memeTemplates : memeTemplates.filter(t => t.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-pink-950 to-gray-950 pb-24">
      {/* Header */}
      <div className="sticky top-16 z-30 bg-gray-950/90 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(createPageUrl("Universe"))} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Meme Creator 😂</h1>
            <p className="text-gray-400 text-xs">Pick template → Type text → Drag to position</p>
          </div>
          <button onClick={handleDownload} disabled={!imageLoaded} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition">
            <Download className="w-4 h-4" /> Save
          </button>
          <button onClick={handleShare} disabled={!imageLoaded} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition">
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">

        {/* Canvas + drag overlay */}
        <div className="relative bg-black rounded-2xl overflow-hidden border border-white/10 select-none">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
              <RefreshCw className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
          <canvas ref={canvasRef} className="w-full h-auto block" />

          {/* Transparent drag overlay — sits on top of canvas */}
          {imageLoaded && (
            <div
              ref={overlayRef}
              className="absolute inset-0 z-10"
              style={{ cursor: dragging.current ? 'grabbing' : 'default', touchAction: 'none' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              {/* Top text handle */}
              <div
                className="absolute flex items-center justify-center"
                style={{
                  left: `${topPos.x * 100}%`,
                  top: `${topPos.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'grab',
                }}
              >
                <div className="w-5 h-5 rounded-full border-2 border-yellow-400 bg-yellow-400/30 shadow-lg" title="Drag top text" />
              </div>

              {/* Bottom text handle */}
              <div
                className="absolute flex items-center justify-center"
                style={{
                  left: `${bottomPos.x * 100}%`,
                  top: `${bottomPos.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'grab',
                }}
              >
                <div className="w-5 h-5 rounded-full border-2 border-cyan-400 bg-cyan-400/30 shadow-lg" title="Drag bottom text" />
              </div>
            </div>
          )}
        </div>

        {/* Drag hint */}
        {imageLoaded && (
          <p className="text-center text-xs text-gray-500">
            🟡 drag top text &nbsp;·&nbsp; 🔵 drag bottom text
          </p>
        )}

        {/* Quick Action Bar */}
        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => setShowTemplates(v => !v)} className="flex flex-col items-center gap-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition">
            <Grid3x3 className="w-5 h-5 text-pink-400" />
            <span className="text-xs text-gray-300">Templates</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition">
            <Upload className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-gray-300">Upload</span>
          </button>
          <button onClick={generateAIMeme} disabled={isGenerating} className="flex flex-col items-center gap-1 py-3 bg-gradient-to-br from-purple-600 to-pink-600 hover:opacity-90 disabled:opacity-50 rounded-xl transition">
            {isGenerating ? <RefreshCw className="w-5 h-5 text-white animate-spin" /> : <Wand2 className="w-5 h-5 text-white" />}
            <span className="text-xs text-white">AI Magic</span>
          </button>
          <button onClick={pickRandom} className="flex flex-col items-center gap-1 py-3 bg-gradient-to-br from-orange-600 to-red-600 hover:opacity-90 rounded-xl transition">
            <Shuffle className="w-5 h-5 text-white" />
            <span className="text-xs text-white">Random</span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </div>

        {/* Text Inputs */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <h3 className="text-white font-semibold text-sm uppercase tracking-wide">✏️ Meme Text</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-400 flex-shrink-0" />
              <Input
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                placeholder="Top text..."
                className="bg-white/10 border-white/20 text-white placeholder-gray-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-400 flex-shrink-0" />
              <Input
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                placeholder="Bottom text..."
                className="bg-white/10 border-white/20 text-white placeholder-gray-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setTopText(""); setBottomText(""); }} className="flex-1 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 transition">Clear</button>
            <button onClick={() => { const t = topText; setTopText(bottomText); setBottomText(t); }} className="flex-1 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 transition">Swap ↕</button>
            <button onClick={() => { setTopText(t => t.toUpperCase()); setBottomText(b => b.toUpperCase()); }} className="flex-1 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 transition">CAPS</button>
            <button onClick={() => { setTopPos({ x: 0.5, y: 0.05 }); setBottomPos({ x: 0.5, y: 0.88 }); }} className="flex-1 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 transition">Reset</button>
          </div>
        </div>

        {/* Style — collapsible */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <button onClick={() => setShowStyle(v => !v)} className="w-full flex items-center justify-between px-4 py-3 text-white">
            <span className="font-semibold text-sm flex items-center gap-2"><Palette className="w-4 h-4 text-pink-400" /> Text Style</span>
            {showStyle ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          <AnimatePresence>
            {showStyle && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden px-4 pb-4 space-y-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">Font Size: {fontSize}px</label>
                  <Slider value={[fontSize]} onValueChange={v => setFontSize(v[0])} min={24} max={96} step={4} className="w-full" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-2 block">Text Color</label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map(color => (
                      <button key={color} onClick={() => setTextColor(color)} className={`w-9 h-9 rounded-lg border-2 transition ${textColor === color ? 'border-pink-400 scale-110' : 'border-white/20'}`} style={{ backgroundColor: color }} />
                    ))}
                    <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-9 h-9 rounded-lg cursor-pointer border border-white/20" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Templates — collapsible */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <button onClick={() => setShowTemplates(v => !v)} className="w-full flex items-center justify-between px-4 py-3 text-white">
            <span className="font-semibold text-sm flex items-center gap-2"><Grid3x3 className="w-4 h-4 text-pink-400" /> Templates ({memeTemplates.length})</span>
            {showTemplates ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          <AnimatePresence>
            {showTemplates && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden px-4 pb-4 space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${selectedCategory === cat.id ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
                  {filtered.map(template => (
                    <button key={template.id} onClick={() => { setSelectedTemplate(template); setTopText(template.topText); setBottomText(template.bottomText); setCustomImage(null); setTopPos({ x: 0.5, y: 0.05 }); setBottomPos({ x: 0.5, y: 0.88 }); }} className={`relative aspect-square rounded-xl overflow-hidden border-2 transition ${selectedTemplate?.id === template.id && !customImage ? 'border-pink-400 shadow-lg shadow-pink-500/30' : 'border-white/10 hover:border-white/30'}`}>
                      <img src={template.url} alt={template.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-1">
                        <span className="text-white text-[10px] font-medium leading-tight">{template.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}