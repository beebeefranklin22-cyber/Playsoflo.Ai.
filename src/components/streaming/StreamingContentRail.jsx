import React from "react";
import { Play, Star, Clock, Eye, Users, DollarSign, Tv } from "lucide-react";

export default function StreamingContentRail({ title, subtitle, icon: Icon, items, onSelect, onWatchParty }) {
  if (!items?.length) return null;

  return (
    <div className="mb-6">
      <div className="flex items-end justify-between px-4 mb-3">
        <div>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-purple-400" />}
            {title}
          </h2>
          {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2" style={{ touchAction: "pan-x" }}>
        {items.map((item) => (
          <button key={item.id} onClick={() => onSelect(item)} className="flex-shrink-0 w-40 text-left group">
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-gray-900 border border-white/10">
              {item.thumbnail_url ? (
                <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-purple-950 flex items-center justify-center">
                  <Tv className="w-10 h-10 text-white/25" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
              {item.is_monetized && (
                <div className="absolute top-2 left-2 bg-green-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <DollarSign className="w-2.5 h-2.5" />
                  {item.rental_price_usd > 0 ? item.rental_price_usd : item.price_usd}
                </div>
              )}
              {onWatchParty && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); onWatchParty(item); }}
                  className="absolute top-2 right-2 bg-purple-600/85 p-1.5 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition"
                >
                  <Users className="w-3 h-3 text-white" />
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white font-semibold text-sm line-clamp-2 leading-tight mb-1">{item.title}</p>
                <div className="flex flex-wrap items-center gap-2 text-gray-400 text-[10px]">
                  {item.rating && <span className="flex items-center gap-0.5 text-yellow-400"><Star className="w-2.5 h-2.5 fill-yellow-400" />{item.rating}</span>}
                  {item.duration && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{item.duration}</span>}
                  {item.views > 0 && <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{item.views.toLocaleString()}</span>}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}