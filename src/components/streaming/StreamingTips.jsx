import React from "react";
import { UserCheck, Users, DollarSign } from "lucide-react";

export default function StreamingTips() {
  const tips = [
    { icon: UserCheck, title: "Follow creators", text: "Build a personal feed with videos and live streams from people you enjoy." },
    { icon: Users, title: "Host watch parties", text: "Tap the group icon on a video to watch with friends in real time." },
    { icon: DollarSign, title: "Support creators", text: "Buy or rent premium content when creators choose to monetize their work." },
  ];

  return (
    <div className="px-4 mt-6 pb-8">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <h2 className="text-white font-bold text-lg mb-3">How to get more from Streaming</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {tips.map((tip) => {
            const Icon = tip.icon;
            return (
              <div key={tip.title} className="rounded-2xl bg-black/25 border border-white/8 p-4">
                <Icon className="h-5 w-5 text-purple-300 mb-2" />
                <p className="text-white font-semibold text-sm">{tip.title}</p>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">{tip.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}