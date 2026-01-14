import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

export default function TermsGuard({ children }) {
  const [checking, setChecking] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkTermsAcceptance();
  }, []);

  const checkTermsAcceptance = async () => {
    try {
      const user = await base44.auth.me();
      
      // If terms not accepted and not on terms page, redirect
      if (!user.terms_accepted && location.pathname !== createPageUrl("TermsOfService")) {
        navigate(createPageUrl("TermsOfService"));
        return;
      }
      
      setTermsAccepted(true);
    } catch (error) {
      console.error("Error checking terms:", error);
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return children;
}