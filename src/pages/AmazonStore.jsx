import React, { useState, useMemo } from "react";
import { Search, ShoppingCart, Star, Truck, Package, ExternalLink, Filter, ChevronDown, X, Tag } from "lucide-react";
import { AMAZON_PRODUCTS } from "@/data/amazonProducts";
import AmazonProductModal from "@/components/amazon/AmazonProductModal";
import PageWrapper from "@/components/PageWrapper";

const CATEGORIES = [
  "All", "Electronics", "Home & Kitchen", "Health & Beauty", "Books",
  "Toys & Games", "Sports & Outdoors", "Clothing", "Office Products",
  "Pet Supplies", "Automotive", "Tools & Home Improvement", "Food & Grocery"
];

export default function AmazonStore() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sortBy, setSortBy] = useState("featured");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState("all");

  const filtered = useMemo(() => {
    let results = AMAZON_PRODUCTS;
    if (search) results = results.filter(p =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    );
    if (selectedCategory !== "All") results = results.filter(p => p.category === selectedCategory);
    if (priceRange === "under25") results = results.filter(p => p.price < 25);
    else if (priceRange === "25to50") results = results.filter(p => p.price >= 25 && p.price < 50);
    else if (priceRange === "50to100") results = results.filter(p => p.price >= 50 && p.price < 100);
    else if (priceRange === "over100") results = results.filter(p => p.price >= 100);

    if (sortBy === "price_low") results = [...results].sort((a, b) => a.price - b.price);
    else if (sortBy === "price_high") results = [...results].sort((a, b) => b.price - a.price);
    else if (sortBy === "rating") results = [...results].sort((a, b) => b.rating - a.rating);
    else if (sortBy === "reviews") results = [...results].sort((a, b) => b.reviews - a.reviews);
    return results;
  }, [search, selectedCategory, sortBy, priceRange]);

  return (
    <PageWrapper hideBack={false} backLabel="Back">
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-orange-950/20 to-gray-950 pb-24">
        {/* Header */}
        <div className="sticky top-16 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-white font-bold text-xl leading-none">Amazon Store</h1>
                  <p className="text-orange-400 text-xs">Top 200 Best Sellers</p>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-gray-400 text-sm">{filtered.length} products</span>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full text-white text-sm hover:bg-white/20 transition"
                >
                  <Filter className="w-4 h-4" /> Filters
                </button>
              </div>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search 200 Amazon best sellers..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition text-sm"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            {/* Filters row */}
            {showFilters && (
              <div className="mt-3 flex flex-wrap gap-2">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none"
                >
                  <option value="featured">Featured</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                  <option value="reviews">Most Reviews</option>
                </select>
                <select
                  value={priceRange}
                  onChange={e => setPriceRange(e.target.value)}
                  className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none"
                >
                  <option value="all">All Prices</option>
                  <option value="under25">Under $25</option>
                  <option value="25to50">$25 – $50</option>
                  <option value="50to100">$50 – $100</option>
                  <option value="over100">Over $100</option>
                </select>
              </div>
            )}
          </div>
          {/* Category tabs */}
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  selectedCategory === cat
                    ? "bg-orange-500 text-white"
                    : "bg-white/10 text-gray-300 hover:bg-white/20"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Prime banner */}
        <div className="max-w-7xl mx-auto px-4 pt-4 pb-2">
          <div className="bg-gradient-to-r from-blue-900/40 to-blue-800/20 border border-blue-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
            <Truck className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-white text-sm font-semibold">Free Prime Shipping Available</p>
              <p className="text-blue-300 text-xs">Most items ship FREE with Amazon Prime. Delivery in 1-2 days for Prime members.</p>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map(product => (
              <ProductCard key={product.id} product={product} onClick={() => setSelectedProduct(product)} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-20">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No products found</p>
            </div>
          )}
        </div>

        {/* Affiliate Disclaimer */}
        <div className="max-w-7xl mx-auto px-4 pb-4">
          <p className="text-gray-600 text-xs text-center">
            * As an Amazon Associate, we earn from qualifying purchases. Prices and availability subject to change.
          </p>
        </div>
      </div>

      {selectedProduct && (
        <AmazonProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </PageWrapper>
  );
}

function ProductCard({ product, onClick }) {
  const discountPct = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  return (
    <div
      onClick={onClick}
      className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-orange-500/50 hover:bg-white/10 transition cursor-pointer group"
    >
      <div className="relative aspect-square bg-white/5">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-contain p-2"
          loading="lazy"
        />
        {discountPct && discountPct > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
            -{discountPct}%
          </span>
        )}
        {product.prime && (
          <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            PRIME
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-white text-xs font-medium line-clamp-2 leading-tight mb-1.5">{product.title}</p>
        <div className="flex items-center gap-1 mb-1.5">
          <div className="flex">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={`w-2.5 h-2.5 ${s <= Math.round(product.rating) ? "text-orange-400 fill-orange-400" : "text-gray-600"}`} />
            ))}
          </div>
          <span className="text-gray-400 text-[10px]">({product.reviews.toLocaleString()})</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-orange-400 font-bold text-sm">${product.price.toFixed(2)}</span>
          {product.originalPrice && (
            <span className="text-gray-500 text-xs line-through">${product.originalPrice.toFixed(2)}</span>
          )}
        </div>
        <p className="text-blue-400 text-[10px] mt-1">{product.shipping}</p>
      </div>
    </div>
  );
}