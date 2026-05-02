import React, { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import MultistreamDestinations from "./MultistreamDestinations";

export default function MultistreamSection({ destinations, onChange }) {
  const [open, setOpen] = useState(false);
  const activeCount = destinations.filter(d => d.enabled && d.stream_key).length;

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition text-left"
      >
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-purple-400" />
          <span className="text-white text-sm font-semibold">Stream to YouTube / Twitch / Instagram</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 bg-purple-600 rounded-full text-white text-xs font-bold">{activeCount} active</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">Optional</span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 bg-black/20 space-y-3">
          <p className="text-gray-400 text-xs leading-relaxed">
            Add your stream key from each platform below. Your stream key is like a password — keep it private.
            You'll find it in each platform's stream settings (links below).
            Once set, your stream will push to those platforms automatically when you go live.
          </p>
          <MultistreamDestinations destinations={destinations} onChange={onChange} />
        </div>
      )}
    </div>
  );
}