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
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn("Terms check timeout - allowing access");
      setTermsAccepted(true);
      setChecking(false);
    }, 3000);

    try {
      const user = await base44.auth.me();
      clearTimeout(timeoutId);
      
      // Skip terms check for TermsOfService and PermissionsSettings pages
      const currentPath = location.pathname;
      const termsPath = createPageUrl("TermsOfService");
      const permissionsPath = createPageUrl("PermissionsSettings");
      
      if (currentPath === termsPath || currentPath === permissionsPath) {
        setTermsAccepted(true);
        setChecking(false);
        return;
      }
      
      // If terms not accepted, redirect to terms page
      if (!user.terms_accepted) {
        navigate(termsPath);
        setChecking(false);
        return;
      }
      
      setTermsAccepted(true);
      setChecking(false);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Error checking terms:", error);
      // On error, allow access to avoid blocking users
      setTermsAccepted(true);
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