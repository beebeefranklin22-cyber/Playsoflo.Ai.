import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export default function Pagination({ 
  currentPage, 
  totalItems, 
  itemsPerPage, 
  onPageChange, 
  loading = false 
}) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrev || loading}
        variant="outline"
        size="sm"
        className="bg-white/10 border-white/20"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-2">
        {[...Array(Math.min(5, totalPages))].map((_, idx) => {
          let pageNum;
          if (totalPages <= 5) {
            pageNum = idx + 1;
          } else if (currentPage <= 3) {
            pageNum = idx + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + idx;
          } else {
            pageNum = currentPage - 2 + idx;
          }

          return (
            <Button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              disabled={loading}
              variant={currentPage === pageNum ? "default" : "outline"}
              size="sm"
              className={currentPage === pageNum 
                ? "bg-purple-600 hover:bg-purple-700" 
                : "bg-white/10 border-white/20"
              }
            >
              {pageNum}
            </Button>
          );
        })}
      </div>

      <Button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNext || loading}
        variant="outline"
        size="sm"
        className="bg-white/10 border-white/20"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
      </Button>

      <span className="text-gray-400 text-sm ml-2">
        Page {currentPage} of {totalPages}
      </span>
    </div>
  );
}

export function LoadMoreButton({ onLoadMore, hasMore, loading }) {
  if (!hasMore) return null;

  return (
    <div className="flex justify-center py-6">
      <Button
        onClick={onLoadMore}
        disabled={loading}
        className="bg-purple-600 hover:bg-purple-700"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </>
        ) : (
          'Load More'
        )}
      </Button>
    </div>
  );
}