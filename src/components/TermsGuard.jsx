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
        return;
      }
      
      setTermsAccepted(true);
    } catch (error) {
      console.error("Error checking terms:", error);
      // On error, allow access to avoid blocking users
      setTermsAccepted(true);
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