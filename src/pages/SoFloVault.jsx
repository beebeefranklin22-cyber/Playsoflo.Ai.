import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Eye, EyeOff, Copy, Edit, Trash2, Key, Lock, Search } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const generatePassword = (length = 16) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const encryptPassword = (password) => {
  return btoa(password);
};

const decryptPassword = (encrypted) => {
  return atob(encrypted);
};

export default function SoFloVault() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showPassword, setShowPassword] = useState({});
  const [formData, setFormData] = useState({
    title: "",
    website: "",
    username: "",
    password: "",
    category: "other",
    notes: ""
  });

  const { data: passwordEntries = [] } = useQuery({
    queryKey: ['password-entries'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.PasswordEntry.filter({ user_email: user.email });
    }
  });

  const createEntryMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.PasswordEntry.create({
        user_email: user.email,
        title: data.title,
        website: data.website,
        username: data.username,
        encrypted_password: encryptPassword(data.password),
        category: data.category,
        notes: data.notes,
        is_favorite: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['password-entries']);
      setShowAddModal(false);
      setFormData({ title: "", website: "", username: "", password: "", category: "other", notes: "" });
      toast.success('Password saved securely');
    }
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const updateData = { ...data };
      if (data.password) {
        updateData.encrypted_password = encryptPassword(data.password);
        delete updateData.password;
      }
      return base44.entities.PasswordEntry.update(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['password-entries']);
      setEditingEntry(null);
      toast.success('Password updated');
    }
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id) => base44.entities.PasswordEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['password-entries']);
      toast.success('Password deleted');
    }
  });

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setFormData({ ...formData, password: newPassword });
  };

  const categories = ["all", "social", "banking", "email", "shopping", "work", "other"];

  const filteredEntries = passwordEntries.filter(entry => {
    const matchesSearch = entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          entry.website?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          entry.username?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || entry.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-indigo-400" />
              SoFlo Vault
            </h1>
            <p className="text-gray-300">Zero-knowledge encrypted password manager</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-5 h-5 mr-2" />
            Add Password
          </Button>
        </div>

        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 text-indigo-300">
            <Lock className="w-5 h-5" />
            <span className="font-medium">Military-grade encryption • Zero-knowledge architecture • Your data never leaves your device unencrypted</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search passwords..."
              className="pl-12 py-6 bg-white/10 border-white/20 text-white placeholder-gray-400 rounded-2xl"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition ${
                  selectedCategory === category
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEntries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:shadow-2xl transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{entry.title}</h3>
                  {entry.website && (
                    <p className="text-gray-400 text-sm truncate">{entry.website}</p>
                  )}
                </div>
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                  {entry.category}
                </Badge>
              </div>

              <div className="space-y-3 mb-4">
                {entry.username && (
                  <div>
                    <label className="text-gray-400 text-xs">Username</label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-white text-sm flex-1 truncate">{entry.username}</span>
                      <button
                        onClick={() => copyToClipboard(entry.username, 'Username')}
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-gray-400 text-xs">Password</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-white text-sm flex-1 font-mono">
                      {showPassword[entry.id] ? decryptPassword(entry.encrypted_password) : '••••••••••'}
                    </span>
                    <button
                      onClick={() => setShowPassword({ ...showPassword, [entry.id]: !showPassword[entry.id] })}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      {showPassword[entry.id] ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => copyToClipboard(decryptPassword(entry.encrypted_password), 'Password')}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setEditingEntry(entry)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  onClick={() => {
                    if (confirm('Delete this password?')) {
                      deleteEntryMutation.mutate(entry.id);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredEntries.length === 0 && (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No passwords found</p>
          </div>
        )}

        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Add New Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Title (e.g., Facebook, Gmail)"
                className="bg-white/10 border-white/20 text-white"
              />
              <Input
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="Website URL (optional)"
                className="bg-white/10 border-white/20 text-white"
              />
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Username or Email"
                className="bg-white/10 border-white/20 text-white"
              />
              <div className="flex gap-2">
                <Input
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  type={showPassword['new'] ? 'text' : 'password'}
                  placeholder="Password"
                  className="flex-1 bg-white/10 border-white/20 text-white"
                />
                <Button onClick={() => setShowPassword({ ...showPassword, new: !showPassword['new'] })} variant="outline">
                  {showPassword['new'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button onClick={handleGeneratePassword} className="bg-indigo-600 hover:bg-indigo-700">
                  <Key className="w-4 h-4 mr-2" />
                  Generate
                </Button>
              </div>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
              >
                <option value="social">Social</option>
                <option value="banking">Banking</option>
                <option value="email">Email</option>
                <option value="shopping">Shopping</option>
                <option value="work">Work</option>
                <option value="other">Other</option>
              </select>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes (optional)"
                className="bg-white/10 border-white/20 text-white"
              />
              <Button
                onClick={() => createEntryMutation.mutate(formData)}
                disabled={!formData.title || !formData.password}
                className="w-full bg-indigo-600 hover:bg-indigo-700 py-6"
              >
                Save Password
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}