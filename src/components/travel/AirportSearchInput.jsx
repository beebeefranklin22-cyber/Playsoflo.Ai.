import React, { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Plane } from "lucide-react";
import { searchFlightPlaces } from "@/functions/searchFlightPlaces";

// Lets a user type a city or airport name ("Miami") instead of needing to
// already know its IATA code ("MIA") -- most people don't have those
// memorized. Selecting a suggestion is what actually sets the code the
// search uses; free-typed text alone never does, so there's no ambiguity
// about what will be searched.
export default function AirportSearchInput({ placeholder, onSelect, iconColor = "text-purple-400" }) {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const timerRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);
    setSelected(null);
    onSelect(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      const { data } = await searchFlightPlaces({ query: val.trim() });
      setLoading(false);
      setSuggestions(data.success ? data.places : []);
    }, 300);
  };

  const handlePick = (place) => {
    setSelected(place);
    setText(place.type === "city" ? `${place.name} (${place.iata_code})` : `${place.name}, ${place.city_name || ""} (${place.iata_code})`);
    setSuggestions([]);
    onSelect(place);
  };

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={text}
        onChange={handleChange}
        className={`bg-white/10 border-white/20 text-white ${selected ? "border-green-500/50" : ""}`}
        autoComplete="off"
      />
      {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-gray-800 border border-white/20 rounded-xl overflow-hidden shadow-xl max-h-64 overflow-y-auto">
          {suggestions.map((place) => (
            <button
              key={`${place.type}-${place.iata_code}-${place.name}`}
              type="button"
              onClick={() => handlePick(place)}
              className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/10 transition flex items-center gap-2 border-b border-white/5 last:border-0"
            >
              {place.type === "city" ? (
                <MapPin className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
              ) : (
                <Plane className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
              )}
              <div className="min-w-0">
                <div className="truncate">
                  {place.name}
                  {place.type === "airport" && place.city_name ? `, ${place.city_name}` : ""}
                </div>
                <div className="text-gray-400 text-xs">
                  {place.iata_code} &middot; {place.type === "city" ? "All airports" : place.country_name}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
