import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import LoginModal from "./LoginModal";

// Shown instead of a protected page's real content whenever the visitor
// isn't signed in -- the "redirect to login" the rest of the app funnels
// into, without needing a dedicated /login route (this app has none; every
// other sign-in entry point already uses LoginModal).
export default function AuthGateScreen() {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(true);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/20 flex items-center justify-center">
          <Lock className="w-8 h-8 text-purple-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Sign in to continue</h2>
          <p className="text-gray-400">You'll need a PlaySoFlo account to view this page.</p>
        </div>
        <div className="flex flex-col gap-3">
          <Button onClick={() => setShowLogin(true)} className="w-full bg-purple-600 hover:bg-purple-700">
            Sign In / Sign Up
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("Universe"))}
            className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            Back to Home
          </Button>
        </div>
      </div>

      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={() => setShowLogin(false)}
      />
    </div>
  );
}
