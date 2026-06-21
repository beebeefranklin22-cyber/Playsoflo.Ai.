import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, Upload, Loader2, CheckCircle, AlertCircle, AtSign, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Step 1: Username setup
function UsernameStep({ user, onComplete }) {
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isValid = /^[a-zA-Z0-9_]{3,20}$/.test(username);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setError(null);
    setSaving(true);

    // Retry up to 3 times in case of transient network errors
    let lastErr = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // Set username. Also zero-out soflo_coins if not already set to prevent phantom balances
        const updatePayload = { username: username.toLowerCase() };
        if (user?.soflo_coins === undefined || user?.soflo_coins === null) {
          updatePayload.soflo_coins = 0;
        }
        await base44.auth.updateMe(updatePayload);
        onComplete();
        return;
      } catch (err) {
        lastErr = err;
        const msg = (err?.message || "").toLowerCase();
        // Don't retry on "taken" errors
        if (msg.includes("unique") || msg.includes("taken") || msg.includes("duplicate")) {
          setError("That username is already taken. Try another one.");
          setSaving(false);
          return;
        }
        // Wait a bit before retrying
        if (attempt < 2) await new Promise(r => setTimeout(r, 800));
      }
    }
    // All retries exhausted
    setError("Unable to save username. Please check your connection and try again.");
    setSaving(false);
  };

  const isLoading = saving;

  return (
    <motion.div
      key="username"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-sm text-center"
    >
      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <AtSign className="w-8 h-8 text-white" />
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Choose a Username</h1>
      <p className="text-gray-400 text-sm mb-8">
        Welcome, {user?.full_name?.split(" ")[0] || "there"}! Pick a unique username for your profile.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 font-bold">@</span>
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""));
              setError(null);
            }}
            placeholder="your_username"
            maxLength={20}
            className="w-full pl-9 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
          />
        </div>

        <p className="text-gray-500 text-xs text-left">
          3–20 characters, letters, numbers, underscores only.
        </p>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-3 text-left">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!isValid || isLoading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-semibold rounded-xl transition"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Continue <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      {!isLoading && (
        <button
          onClick={onComplete}
          className="w-full text-gray-500 hover:text-gray-300 text-sm py-2 mt-2 transition"
        >
          Skip for now
        </button>
      )}
    </motion.div>
  );
}

// Step 2: Profile photo
function PhotoStep({ user, onComplete, onSkip }) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploading(true);
    setUploadedUrl(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedUrl(file_url);
      setSaving(true);
      await base44.auth.updateMe({ profile_picture: file_url });
      onComplete();
    } catch (err) {
      setError("Upload failed. Please try a different photo or try again.");
      setPreviewUrl(null);
      setUploadedUrl(null);
    } finally {
      setUploading(false);
      setSaving(false);
    }
  };

  const isLoading = uploading || saving;

  return (
    <motion.div
      key="photo"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-sm text-center"
    >
      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <Camera className="w-8 h-8 text-white" />
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Add a Profile Photo</h1>
      <p className="text-gray-400 text-sm mb-8">
        Almost done! Add a photo so others can recognize you.
      </p>

      <div className="relative mx-auto w-32 h-32 mb-6">
        <div className="w-32 h-32 rounded-full border-4 border-purple-500/50 overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-4xl font-bold">
          {previewUrl ? (
            <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
          ) : (
            (user?.full_name?.[0] || "U").toUpperCase()
          )}
        </div>
        {isLoading && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
        {uploadedUrl && !isLoading && (
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-gray-900">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-3 mb-4 text-left">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <label className={`cursor-pointer block mb-3 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading}
        />
        <div className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition">
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {saving ? "Saving..." : "Uploading..."}
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              {previewUrl ? "Try a Different Photo" : "Choose Photo"}
            </>
          )}
        </div>
      </label>

      {!isLoading && (
        <button
          onClick={onSkip}
          className="w-full text-gray-500 hover:text-gray-300 text-sm py-2 transition"
        >
          Skip for now
        </button>
      )}
    </motion.div>
  );
}

// Main gate — shows username step first, then photo step
export default function ProfilePictureGate({ user, onComplete }) {
  // Gate is only shown when username is missing (enforced in App.jsx)
  // Photo step is always optional — user can skip
  const [step, setStep] = useState("username");

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-purple-950 via-gray-950 to-blue-950 flex items-center justify-center p-6">
      <AnimatePresence mode="wait">
        {step === "username" ? (
          <UsernameStep
            key="username"
            user={user}
            onComplete={() => setStep("photo")}
          />
        ) : (
          <PhotoStep key="photo" user={user} onComplete={onComplete} onSkip={onComplete} />
        )}
      </AnimatePresence>
    </div>
  );
}