import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UniversalFeedFilter({ 
  onFilterChange, 
  categories = [], 
  showPriceFilter = false,
  showDateFilter = false,
  showAIToggle = true
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    sortBy: 'recent',
    priceMin: '',
    priceMax: '',
    dateFrom: '',
    dateTo: '',
    aiPersonalized: true
  });

  const updateFilter = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters = {
      category: 'all',
      sortBy: 'recent',
      priceMin: '',
      priceMax: '',
      dateFrom: '',
      dateTo: '',
      aiPersonalized: true
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => 
    key !== 'aiPersonalized' && value && value !== 'all' && value !== 'recent'
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-purple-600 rounded-full text-xs">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {showAIToggle && (
          <Button
            onClick={() => updateFilter('aiPersonalized', !filters.aiPersonalized)}
            variant={filters.aiPersonalized ? 'default' : 'outline'}
            className={filters.aiPersonalized 
              ? 'bg-gradient-to-r from-purple-600 to-pink-600' 
              : 'border-white/20 text-white'
            }
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Personalized
          </Button>
        )}

        {activeFilterCount > 0 && (
          <Button
            onClick={clearFilters}
            variant="ghost"
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="glass-effect rounded-xl p-4 border border-white/10 space-y-3 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories.length > 0 && (
                <div>
                  <label className="text-sm text-gray-300 mb-1 block">Category</label>
                  <Select value={filters.category} onValueChange={(v) => updateFilter('category', v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-sm text-gray-300 mb-1 block">Sort By</label>
                <Select value={filters.sortBy} onValueChange={(v) => updateFilter('sortBy', v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="trending">Trending</SelectItem>
                    {showPriceFilter && (
                      <>
                        <SelectItem value="price_low">Price: Low to High</SelectItem>
                        <SelectItem value="price_high">Price: High to Low</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {showPriceFilter && (
                <>
                  <div>
                    <label className="text-sm text-gray-300 mb-1 block">Min Price</label>
                    <Input
                      type="number"
                      value={filters.priceMin}
                      onChange={(e) => updateFilter('priceMin', e.target.value)}
                      placeholder="$0"
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-300 mb-1 block">Max Price</label>
                    <Input
                      type="number"
                      value={filters.priceMax}
                      onChange={(e) => updateFilter('priceMax', e.target.value)}
                      placeholder="Any"
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </>
              )}

              {showDateFilter && (
                <>
                  <div>
                    <label className="text-sm text-gray-300 mb-1 block">From Date</label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => updateFilter('dateFrom', e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-300 mb-1 block">To Date</label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => updateFilter('dateTo', e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}