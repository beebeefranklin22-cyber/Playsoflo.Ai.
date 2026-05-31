import React from "react";
import { Play, Radio, Upload, Calendar, Film, Sparkles } from "lucide-react";

export default function StreamingActionPanel({ currentUser, onBrowse, onGoLive, onUpload, onSchedule, onMovies, onDiscover }) {
  const actions = [
    { label: "Start watching", note: "Browse videos and live shows", icon: Play, className: "from-purple-600 to-pink-600", action: onBrowse },
    { label: "Go live", note: "Start a stream now", icon: Radio, className: "from-red-600 to-orange-600", action: onGoLive, auth: true },
    { label: "Upload video", note: "Share a clip, show, or movie", icon: Upload, className: "from-blue-600 to-cyan-600", action: onUpload, auth: true },
    { label: "Schedule stream", note: "Plan your next broadcast", icon: Calendar, className: "from-violet-600 to-indigo-600", action: onSchedule, auth: true },
  ];

  return (
    <div className="px-4 mb-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-purple-950 via-gray-950 to-black p-5">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-200">
              <Sparkles className="h-3.5 w-3.5" /> Your entertainment hub
            </div>
            <h2 className="text-2xl font-black text-white md:text-3xl">Watch, stream, and build your audience.</h2>
            <p className="mt-2 max-w-2xl text-sm text-gray-300">Find live creators, discover new videos, host watch parties, or publish your own content from one simple place.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={onDiscover}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
            >
              <Film className="h-4 w-4" /> Discover Movies & Shows
            </button>
            <button
              onClick={onMovies}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
            >
              <Upload className="h-4 w-4" /> Add TV & Films
            </button>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {actions.map((item) => {
            const Icon = item.icon;
            const disabled = item.auth && !currentUser;
            return (
              <button
                key={item.label}
                onClick={disabled ? undefined : item.action}
                className={`rounded-2xl bg-gradient-to-br ${item.className} p-4 text-left transition active:scale-95 ${disabled ? "opacity-50" : "hover:scale-[1.02]"}`}
              >
                <Icon className="mb-3 h-6 w-6 text-white" />
                <p className="font-bold text-white">{item.label}</p>
                <p className="mt-1 text-xs text-white/75">{disabled ? "Sign in to use this" : item.note}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}