import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft } from "lucide-react";
import NotificationCenter from "../components/notifications/NotificationCenter";

export default function Notifications() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-purple-950 via-gray-950 to-blue-950 pb-20">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="p-3 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 transition border border-white/20 mb-6"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        <NotificationCenter currentUser={currentUser} />
      </div>
    </div>
  );
}