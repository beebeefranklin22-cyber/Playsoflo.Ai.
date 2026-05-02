import React, { useState } from "react";
import { X, Plus, Pin, Move, AlignCenter, AlignLeft, AlignRight, Type } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const FONT_FAMILIES = [
  { label: "Default", value: "sans-serif" },
  { label: "Bold Impact", value: "Impact, Haettenschweiler, sans-serif" },
  { label: "Elegant Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Modern Mono", value: "'Courier New', Courier, monospace" },
  { label: "Playful", value: "'Comic Sans MS', cursive, sans-serif" },
  { label: "Cinematic", value: "'Palatino Linotype', Palatino, serif" },
];

const FONT_STYLES = [
  { label: "Normal", weight: "400", style: "normal" },
  { label: "Bold", weight: "700", style: "normal" },
  { label: "Italic", weight: "400", style: "italic" },
  { label: "Bold Italic", weight: "700", style: "italic" },
];

const TEXT_COLORS = [
  "#FFFFFF", "#FFFF00", "#FF6B6B", "#4ECDC4", "#45B7D1",
  "#96CEB4", "#FFEAA7", "#DDA0DD", "#98FB98", "#F0E68C",
  "#FF69B4", "#00CED1", "#FF8C00", "#7B68EE", "#20B2AA"
];

const STROKE_COLORS = [
  "transparent", "#000000", "#FFFFFF", "#FF0000", "#0000FF", "#FFD700"
];

const POSITION_MODES = [
  { id: "floating", label: "Floating", icon: Move, desc: "Free position" },
  { id: "fixed_top", label: "Top", icon: AlignCenter, desc: "Fixed top center" },
  { id: "fixed_center", label: "Center", icon: AlignCenter, desc: "Fixed center" },
  { id: "fixed_bottom", label: "Caption", icon: AlignLeft, desc: "Caption bar at bottom" },
  { id: "pinned", label: "Pinned", icon: Pin, desc: "Pinned to position" },
];

export default function VideoTextOverlayEditor({ overlays, setOverlays, currentTime, duration }) {
  const [selectedId, setSelectedId] = useState(null);

  const addOverlay = () => {
    const newOverlay = {
      id: Date.now(),
      text: "Your text here",
      x: 50,
      y: 50,
      fontSize: 32,
      color: "#FFFFFF",
      strokeColor: "#000000",
      strokeWidth: 2,
      fontFamily: "sans-serif",
      fontWeight: "700",
      fontStyle: "normal",
      textAlign: "center",
      positionMode: "floating",
      backgroundColor: "transparent",
      backgroundOpacity: 0,
      startTime: currentTime,
      endTime: Math.min(currentTime + 5, duration || currentTime + 5),
    };
    setOverlays(prev => [...prev, newOverlay]);
    setSelectedId(newOverlay.id);
  };

  const addCaption = () => {
    const newCaption = {
      id: Date.now(),
      text: "Caption text",
      x: 50,
      y: 90,
      fontSize: 24,
      color: "#FFFFFF",
      strokeColor: "#000000",
      strokeWidth: 2,
      fontFamily: "sans-serif",
      fontWeight: "400",
      fontStyle: "normal",
      textAlign: "center",
      positionMode: "fixed_bottom",
      backgroundColor: "rgba(0,0,0,0.6)",
      backgroundOpacity: 60,
      startTime: currentTime,
      endTime: Math.min(currentTime + 3, duration || currentTime + 3),
    };
    setOverlays(prev => [...prev, newCaption]);
    setSelectedId(newCaption.id);
  };

  const updateOverlay = (id, changes) => {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, ...changes } : o));
  };

  const removeOverlay = (id) => {
    setOverlays(prev => prev.filter(o => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const selected = overlays.find(o => o.id === selectedId);

  return (
    <div className="space-y-4">
      {/* Add buttons */}
      <div className="flex gap-2">
        <Button onClick={addOverlay} className="flex-1 bg-yellow-600 hover:bg-yellow-700" size="sm">
          <Type className="w-4 h-4 mr-1" /> Add Text
        </Button>
        <Button onClick={addCaption} className="flex-1 bg-blue-600 hover:bg-blue-700" size="sm">
          <AlignLeft className="w-4 h-4 mr-1" /> Add Caption
        </Button>
      </div>

      {/* Overlay list */}
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {overlays.map((overlay) => (
          <div
            key={overlay.id}
            onClick={() => setSelectedId(selectedId === overlay.id ? null : overlay.id)}
            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition ${
              selectedId === overlay.id ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="w-4 h-4 rounded-full border border-white/30" style={{ backgroundColor: overlay.color }} />
            <span className="text-white text-xs flex-1 truncate">{overlay.text}</span>
            <span className="text-gray-500 text-xs">{overlay.positionMode}</span>
            <span className="text-gray-500 text-xs">{overlay.startTime?.toFixed(1)}s</span>
            <button onClick={(e) => { e.stopPropagation(); removeOverlay(overlay.id); }} className="text-red-400 hover:text-red-300">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {overlays.length === 0 && (
          <p className="text-gray-500 text-xs text-center py-2">No text overlays yet</p>
        )}
      </div>

      {/* Editor for selected overlay */}
      {selected && (
        <div className="bg-white/5 rounded-xl p-4 space-y-4 border border-yellow-500/20">
          <h5 className="text-yellow-300 text-sm font-semibold">Edit Overlay</h5>

          {/* Text content */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Text</label>
            <Input
              value={selected.text}
              onChange={(e) => updateOverlay(selected.id, { text: e.target.value })}
              className="bg-white/10 border-white/20 text-white text-sm"
              placeholder="Enter text..."
            />
          </div>

          {/* Position Mode */}
          <div>
            <label className="text-gray-400 text-xs mb-2 block">Position Mode</label>
            <div className="flex flex-wrap gap-1">
              {POSITION_MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => updateOverlay(selected.id, { positionMode: mode.id })}
                  title={mode.desc}
                  className={`px-2 py-1 rounded text-xs font-medium transition ${
                    selected.positionMode === mode.id
                      ? 'bg-yellow-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="text-gray-400 text-xs mb-2 block">Font Family</label>
            <div className="grid grid-cols-2 gap-1">
              {FONT_FAMILIES.map(f => (
                <button
                  key={f.value}
                  onClick={() => updateOverlay(selected.id, { fontFamily: f.value })}
                  className={`px-2 py-1.5 rounded text-xs transition text-left ${
                    selected.fontFamily === f.value
                      ? 'bg-yellow-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                  style={{ fontFamily: f.value }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Style */}
          <div>
            <label className="text-gray-400 text-xs mb-2 block">Style</label>
            <div className="flex gap-1 flex-wrap">
              {FONT_STYLES.map(s => (
                <button
                  key={s.label}
                  onClick={() => updateOverlay(selected.id, { fontWeight: s.weight, fontStyle: s.style })}
                  className={`px-2 py-1 rounded text-xs transition ${
                    selected.fontWeight === s.weight && selected.fontStyle === s.style
                      ? 'bg-yellow-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                  style={{ fontWeight: s.weight, fontStyle: s.style }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Size: {selected.fontSize}px</label>
            <input
              type="range" min={12} max={96} step={2}
              value={selected.fontSize}
              onChange={(e) => updateOverlay(selected.id, { fontSize: Number(e.target.value) })}
              className="w-full accent-yellow-500"
            />
          </div>

          {/* Text Color */}
          <div>
            <label className="text-gray-400 text-xs mb-2 block">Text Color</label>
            <div className="flex flex-wrap gap-1.5 items-center">
              {TEXT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => updateOverlay(selected.id, { color: c })}
                  className={`w-6 h-6 rounded-full border-2 transition ${
                    selected.color === c ? 'border-yellow-400 scale-125' : 'border-white/20'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={selected.color}
                onChange={(e) => updateOverlay(selected.id, { color: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border border-white/20"
                title="Custom color"
              />
            </div>
          </div>

          {/* Stroke (outline) color */}
          <div>
            <label className="text-gray-400 text-xs mb-2 block">Text Outline</label>
            <div className="flex flex-wrap gap-1.5 items-center">
              {STROKE_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => updateOverlay(selected.id, { strokeColor: c })}
                  className={`w-6 h-6 rounded-full border-2 transition ${
                    selected.strokeColor === c ? 'border-yellow-400 scale-125' : 'border-white/20'
                  }`}
                  style={{ backgroundColor: c === 'transparent' ? 'transparent' : c, backgroundImage: c === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)' : 'none', backgroundSize: '6px 6px', backgroundPosition: '0 0, 3px 3px' }}
                />
              ))}
            </div>
            {selected.strokeColor !== 'transparent' && (
              <div className="mt-1">
                <label className="text-gray-400 text-xs">Outline Width: {selected.strokeWidth}px</label>
                <input
                  type="range" min={0} max={8} step={1}
                  value={selected.strokeWidth || 2}
                  onChange={(e) => updateOverlay(selected.id, { strokeWidth: Number(e.target.value) })}
                  className="w-full accent-yellow-500"
                />
              </div>
            )}
          </div>

          {/* Background */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Background Opacity: {selected.backgroundOpacity || 0}%</label>
            <input
              type="range" min={0} max={100} step={10}
              value={selected.backgroundOpacity || 0}
              onChange={(e) => updateOverlay(selected.id, {
                backgroundOpacity: Number(e.target.value),
                backgroundColor: `rgba(0,0,0,${Number(e.target.value) / 100})`
              })}
              className="w-full accent-yellow-500"
            />
          </div>

          {/* Position (for floating/pinned) */}
          {(selected.positionMode === 'floating' || selected.positionMode === 'pinned') && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">X: {selected.x}%</label>
                <input
                  type="range" min={0} max={100}
                  value={selected.x}
                  onChange={(e) => updateOverlay(selected.id, { x: Number(e.target.value) })}
                  className="w-full accent-yellow-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Y: {selected.y}%</label>
                <input
                  type="range" min={0} max={100}
                  value={selected.y}
                  onChange={(e) => updateOverlay(selected.id, { y: Number(e.target.value) })}
                  className="w-full accent-yellow-500"
                />
              </div>
            </div>
          )}

          {/* Timing */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Show at: {selected.startTime?.toFixed(1)}s</label>
              <input
                type="range" min={0} max={duration || 60} step={0.1}
                value={selected.startTime}
                onChange={(e) => updateOverlay(selected.id, { startTime: Number(e.target.value) })}
                className="w-full accent-yellow-500"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Hide at: {selected.endTime?.toFixed(1)}s</label>
              <input
                type="range" min={0} max={duration || 60} step={0.1}
                value={selected.endTime}
                onChange={(e) => updateOverlay(selected.id, { endTime: Number(e.target.value) })}
                className="w-full accent-yellow-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}