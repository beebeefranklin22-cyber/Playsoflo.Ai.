import React, { useState } from "react";
import { MapPin, SlidersHorizontal, X, ChevronDown } from "lucide-react";

const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 250];

/**
 * Reusable location filter bar.
 *
 * Props:
 *  - cityValue: string (controlled city)
 *  - onCityChange: (city: string) => void
 *  - radiusValue: number | null (miles)
 *  - onRadiusChange: (miles: number | null) => void
 *  - userCity: string | null (pre-fill from profile)
 *  - accentColor: tailwind color class prefix, e.g. "orange" (default "purple")
 *  - onOpenCitySettings: () => void (optional — open CitySelector modal)
 */
export default function LocationFilter({
  cityValue,
  onCityChange,
  radiusValue,
  onRadiusChange,
  userCity,
  accentColor = "purple",
  onOpenCitySettings,
}) {
  const [showRadius, setShowRadius] = useState(false);

  const accent = {
    border: `focus:border-${accentColor}-500`,
    bg: `bg-${accentColor}-500`,
    text: `text-${accentColor}-400`,
    pill: `bg-${accentColor}-500/20 text-${accentColor}-300 border border-${accentColor}-500/40`,
  };

  const handleClear = () => {
    onCityChange("");
    onRadiusChange(null);
  };

  const hasFilter = cityValue || radiusValue;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      {/* City input */}
      <div className="relative flex-1 min-w-[180px]">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={cityValue}
          onChange={e => onCityChange(e.target.value)}
          placeholder={userCity ? `Near ${userCity}` : "Filter by city…"}
          className={`w-full pl-9 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder-gray-400 focus:outline-none ${accent.border} transition`}
        />
      </div>

      {/* Radius picker */}
      <div className="relative">
        <button
          onClick={() => setShowRadius(v => !v)}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition border ${
            radiusValue
              ? accent.pill
              : "bg-white/10 border-white/20 text-gray-300 hover:bg-white/20"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {radiusValue ? `${radiusValue} mi` : "Radius"}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showRadius ? "rotate-180" : ""}`} />
        </button>
        {showRadius && (
          <div className="absolute top-full mt-1 left-0 z-50 bg-gray-900 border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[130px]">
            <button
              onClick={() => { onRadiusChange(null); setShowRadius(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition ${!radiusValue ? "text-purple-400 font-medium" : "text-gray-300"}`}
            >
              Any distance
            </button>
            {RADIUS_OPTIONS.map(r => (
              <button
                key={r}
                onClick={() => { onRadiusChange(r); setShowRadius(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition ${radiusValue === r ? `${accent.text} font-medium` : "text-gray-300"}`}
              >
                Within {r} miles
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick-fill from profile city */}
      {userCity && !cityValue && (
        <button
          onClick={() => onCityChange(userCity)}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition"
        >
          <MapPin className="w-3.5 h-3.5" />
          Use my city
        </button>
      )}

      {/* Clear */}
      {hasFilter && (
        <button
          onClick={handleClear}
          className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition border border-white/10"
        >
          <X className="w-3.5 h-3.5" /> Clear
        </button>
      )}

      {/* Open settings */}
      {onOpenCitySettings && (
        <button
          onClick={onOpenCitySettings}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5 transition border border-white/10"
          title="Update my city"
        >
          <MapPin className="w-3.5 h-3.5" />
          Update city
        </button>
      )}
    </div>
  );
}