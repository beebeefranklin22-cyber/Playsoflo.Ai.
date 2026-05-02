import React, { useState } from "react";
import { Heart } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SavePropertyButton({ property, currentUser, savedProperties = [], className = "" }) {
  const queryClient = useQueryClient();
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  const existingSave = savedProperties.find(s => s.property_id === property.id);
  const isSaved = !!existingSave;

  const getPrice = (p) => {
    if (p.listing_type === "short_term" && p.price_per_night) return `$${p.price_per_night}/night`;
    if (p.listing_type === "for_rent" && p.price_per_month) return `$${p.price_per_month.toLocaleString()}/mo`;
    if (p.listing_type === "for_sale" && p.sale_price) return `$${p.sale_price.toLocaleString()}`;
    return "";
  };

  const saveMutation = useMutation({
    mutationFn: (collectionName) => base44.entities.SavedProperty.create({
      user_email: currentUser.email,
      property_id: property.id,
      collection_name: collectionName || "Favorites",
      property_title: property.title,
      property_image: property.main_image,
      property_location: property.location,
      property_price: getPrice(property),
      property_type: property.property_type,
      listing_type: property.listing_type,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-properties"] });
      toast.success("Property saved!");
      setShowCollectionPicker(false);
      setNewCollectionName("");
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: () => base44.entities.SavedProperty.delete(existingSave.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-properties"] });
      toast.success("Removed from saved");
    },
  });

  const handleClick = (e) => {
    e.stopPropagation();
    if (!currentUser) {
      base44.auth.redirectToLogin();
      return;
    }
    if (isSaved) {
      unsaveMutation.mutate();
    } else {
      setShowCollectionPicker(true);
    }
  };

  const collections = [...new Set(savedProperties.map(s => s.collection_name).filter(Boolean)), "Favorites", "Dream Homes", "Investments"];
  const uniqueCollections = [...new Set(collections)];

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className={`p-2 rounded-full transition ${isSaved ? "bg-red-500 text-white" : "bg-black/50 backdrop-blur text-white hover:bg-black/70"} ${className}`}
        title={isSaved ? "Remove from saved" : "Save property"}
      >
        <Heart className={`w-5 h-5 ${isSaved ? "fill-white" : ""}`} />
      </button>

      {showCollectionPicker && (
        <div
          className="fixed inset-0 z-[200]"
          onClick={(e) => { e.stopPropagation(); setShowCollectionPicker(false); }}
        >
          <div
            className="absolute bg-gray-900 border border-white/20 rounded-2xl p-4 shadow-2xl w-56"
            style={{ top: "2.5rem", right: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white font-semibold text-sm mb-3">Save to collection</p>
            <div className="space-y-1 mb-3 max-h-36 overflow-y-auto">
              {uniqueCollections.map((col) => (
                <button
                  key={col}
                  onClick={() => saveMutation.mutate(col)}
                  className="w-full text-left px-3 py-2 text-gray-300 hover:bg-white/10 rounded-lg text-sm transition"
                >
                  {col}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newCollectionName.trim()) saveMutation.mutate(newCollectionName.trim()); }}
                placeholder="New collection..."
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white text-xs placeholder-gray-500 focus:outline-none"
              />
              <button
                onClick={() => newCollectionName.trim() && saveMutation.mutate(newCollectionName.trim())}
                className="px-2 py-1.5 bg-emerald-600 rounded-lg text-white text-xs font-semibold"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}