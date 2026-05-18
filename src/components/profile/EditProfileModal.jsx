import React, { useState } from "react";
import { X, User, AtSign, FileText, Link, Phone, MapPin, Globe, Loader2, Check, Twitter, Instagram, Facebook, Youtube, Linkedin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const SOCIAL_FIELDS = [
  { key: "twitter", label: "Twitter / X", icon: Twitter, placeholder: "username" },
  { key: "instagram", label: "Instagram", icon: Instagram, placeholder: "username" },
  { key: "facebook", label: "Facebook", icon: Facebook, placeholder: "username" },
  { key: "youtube", label: "YouTube", icon: Youtube, placeholder: "channel" },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "username" },
];

const TABS = ["Profile", "Links", "Social"];

export default function EditProfileModal({ currentUser, onClose, onSaved }) {
  const [tab, setTab] = useState("Profile");
  const [saving, setSaving] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  const [form, setForm] = useState({
    full_name: currentUser?.full_name || "",
    username: currentUser?.username || "",
    bio: currentUser?.bio || "",
    phone: currentUser?.phone || "",
    address: currentUser?.address || "",
    link_in_bio: currentUser?.link_in_bio || "",
    website: currentUser?.website || "",
    social_links: currentUser?.social_links || {},
  });

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleUsernameChange = (val) => {
    const clean = val.replace(/[^a-zA-Z0-9_]/g, "");
    set("username", clean);
    setUsernameError("");
  };

  const handleSave = async () => {
    // Validate username
    if (form.username && form.username !== currentUser?.username) {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) {
        toast.error("Username must be 3–20 characters (letters, numbers, underscores)");
        return;
      }
      setCheckingUsername(true);
      try {
        const existing = await base44.entities.User.filter({ username: form.username.toLowerCase() });
        if (existing.length > 0 && existing[0].id !== currentUser.id) {
          setUsernameError("That username is already taken");
          setCheckingUsername(false);
          return;
        }
      } catch {}
      setCheckingUsername(false);
    }

    setSaving(true);
    try {
      await base44.auth.updateMe({
        full_name: form.full_name,
        username: form.username.toLowerCase(),
        bio: form.bio,
        phone: form.phone,
        address: form.address,
        link_in_bio: form.link_in_bio,
        website: form.website,
        social_links: form.social_links,
      });
      toast.success("Profile saved!");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-lg bg-gray-950 sm:rounded-3xl rounded-t-3xl overflow-hidden max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
            <h2 className="text-white font-bold text-xl">Edit Profile</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/10 px-5 flex-shrink-0">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium transition relative ${
                  tab === t ? "text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {t}
                {tab === t && (
                  <motion.div layoutId="edit-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 p-5 space-y-4">
            {tab === "Profile" && (
              <>
                <Field icon={User} label="Full Name">
                  <Input
                    value={form.full_name}
                    onChange={(e) => set("full_name", e.target.value)}
                    placeholder="Your full name"
                    className="bg-white/8 border-white/15 text-white focus:border-purple-500"
                  />
                </Field>

                <Field icon={AtSign} label="Username">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 text-sm font-bold">@</span>
                    <Input
                      value={form.username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      placeholder="yourhandle"
                      maxLength={20}
                      className="bg-white/8 border-white/15 text-white focus:border-purple-500 pl-7"
                    />
                  </div>
                  {usernameError && <p className="text-red-400 text-xs mt-1">{usernameError}</p>}
                  <p className="text-gray-600 text-xs mt-1">3–20 characters, letters, numbers, underscores</p>
                </Field>

                <Field icon={FileText} label="Bio">
                  <textarea
                    value={form.bio}
                    onChange={(e) => set("bio", e.target.value)}
                    placeholder="Tell the community about yourself..."
                    maxLength={200}
                    rows={3}
                    className="w-full bg-white/8 border border-white/15 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 resize-none placeholder-gray-600"
                  />
                  <p className="text-gray-600 text-xs text-right">{form.bio.length}/200</p>
                </Field>

                <Field icon={Phone} label="Phone">
                  <Input
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    type="tel"
                    className="bg-white/8 border-white/15 text-white focus:border-purple-500"
                  />
                </Field>

                <Field icon={MapPin} label="Location">
                  <Input
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="City, State"
                    className="bg-white/8 border-white/15 text-white focus:border-purple-500"
                  />
                </Field>
              </>
            )}

            {tab === "Links" && (
              <>
                <Field icon={Link} label="Link in Bio">
                  <Input
                    value={form.link_in_bio}
                    onChange={(e) => set("link_in_bio", e.target.value)}
                    placeholder="https://yourlink.com"
                    className="bg-white/8 border-white/15 text-white focus:border-purple-500"
                  />
                  <p className="text-gray-600 text-xs mt-1">Shown on your public profile</p>
                </Field>

                <Field icon={Globe} label="Website">
                  <Input
                    value={form.website}
                    onChange={(e) => set("website", e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="bg-white/8 border-white/15 text-white focus:border-purple-500"
                  />
                </Field>
              </>
            )}

            {tab === "Social" && (
              <div className="space-y-4">
                <p className="text-gray-500 text-sm">Add your social media handles to connect with others.</p>
                {SOCIAL_FIELDS.map(({ key, label, icon: Icon, placeholder }) => (
                  <div key={key} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                    <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-500 text-xs mb-1">{label}</p>
                      <input
                        value={form.social_links[key] || ""}
                        onChange={(e) => set("social_links", { ...form.social_links, [key]: e.target.value })}
                        placeholder={placeholder}
                        className="w-full bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 p-5 flex gap-3 flex-shrink-0">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || checkingUsername}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {saving || checkingUsername ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-gray-400 text-xs font-medium mb-2">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </label>
      {children}
    </div>
  );
}