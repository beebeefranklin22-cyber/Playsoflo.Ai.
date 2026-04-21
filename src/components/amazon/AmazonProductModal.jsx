import React from "react";
import { motion } from "framer-motion";
import { X, Star, Truck, Shield, RotateCcw, ExternalLink, Package, Clock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AmazonProductModal({ product, onClose }) {
  const discountPct = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  const handleBuyOnAmazon = () => {
    window.open(product.affiliateUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl bg-gray-900 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="text-orange-400 text-sm font-semibold">Amazon Best Seller</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Product image + price */}
          <div className="flex gap-4 p-4">
            <div className="w-36 h-36 flex-shrink-0 bg-white/5 rounded-xl flex items-center justify-center p-2">
              <img src={product.image} alt={product.title} className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-400 bg-white/10 px-2 py-0.5 rounded-full">{product.category}</span>
              <h2 className="text-white font-semibold text-sm mt-2 leading-snug">{product.title}</h2>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="flex">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`w-3 h-3 ${s <= Math.round(product.rating) ? "text-orange-400 fill-orange-400" : "text-gray-600"}`} />
                  ))}
                </div>
                <span className="text-orange-400 text-xs font-medium">{product.rating}</span>
                <span className="text-gray-400 text-xs">({product.reviews.toLocaleString()} reviews)</span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-orange-400">${product.price.toFixed(2)}</span>
                {product.originalPrice && (
                  <span className="text-gray-500 line-through text-sm">${product.originalPrice.toFixed(2)}</span>
                )}
                {discountPct && discountPct > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">-{discountPct}%</span>
                )}
              </div>
            </div>
          </div>

          {/* Shipping & Delivery Info */}
          <div className="px-4 pb-3">
            <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3 space-y-2.5">
              <h3 className="text-white text-sm font-semibold flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-400" /> Shipping & Delivery
              </h3>
              <div className="space-y-2 text-sm">
                {product.prime ? (
                  <>
                    <div className="flex items-start gap-2">
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5">PRIME</span>
                      <div>
                        <p className="text-white font-medium">FREE One-Day Delivery</p>
                        <p className="text-blue-300 text-xs">Order within 6 hours — arrives tomorrow</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-white font-medium">FREE Two-Day Delivery</p>
                        <p className="text-gray-400 text-xs">Standard Prime delivery — arrives in 2 business days</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">{product.shipping}</p>
                      <p className="text-gray-400 text-xs">Estimated delivery: {product.deliveryEstimate}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                  <Tag className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <p className="text-gray-400 text-xs">
                    Shipping cost: <span className="text-white font-medium">{product.prime ? "FREE with Prime" : product.shippingCost}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Guarantees */}
          <div className="px-4 pb-3 grid grid-cols-2 gap-2">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-start gap-2">
              <Shield className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white text-xs font-medium">A-to-Z Guarantee</p>
                <p className="text-gray-400 text-[11px]">Protected by Amazon's buyer protection</p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-start gap-2">
              <RotateCcw className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white text-xs font-medium">30-Day Returns</p>
                <p className="text-gray-400 text-[11px]">Free returns on most items</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="px-4 pb-4">
              <h3 className="text-white text-sm font-semibold mb-2">About this item</h3>
              <ul className="space-y-1.5">
                {product.description.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-300 text-xs">
                    <span className="text-orange-400 mt-0.5 flex-shrink-0">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="p-4 border-t border-white/10 flex-shrink-0 bg-gray-900">
          <Button
            onClick={handleBuyOnAmazon}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 text-base flex items-center justify-center gap-2"
          >
            Buy on Amazon <ExternalLink className="w-4 h-4" />
          </Button>
          <p className="text-gray-500 text-xs text-center mt-2">
            You'll be redirected to Amazon to complete your purchase securely.
          </p>
        </div>
      </motion.div>
    </div>
  );
}