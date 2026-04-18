import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

/**
 * PageWrapper — wraps every page with:
 *  - guaranteed vertical scroll to the bottom
 *  - optional back button (shown by default unless hideBack=true)
 *  - consistent bottom padding so nav bar never covers content
 */
export default function PageWrapper({ children, hideBack = false, backLabel = "Back", className = "" }) {
  const navigate = useNavigate();

  return (
    <div
      className={`w-full ${className}`}
      style={{
        minHeight: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        paddingBottom: "90px", // clear bottom nav bar
        position: "relative",
      }}
    >
      {!hideBack && (
        <button
          onClick={() => navigate(-1)}
          className="fixed top-4 left-4 z-50 flex items-center gap-1.5 px-3 py-2 bg-black/60 backdrop-blur-md border border-white/20 rounded-full text-white text-sm font-medium hover:bg-black/80 transition active:scale-95"
          style={{ marginTop: "var(--safe-area-top, 0px)" }}
        >
          <ChevronLeft className="w-4 h-4" />
          {backLabel}
        </button>
      )}
      {children}
    </div>
  );
}