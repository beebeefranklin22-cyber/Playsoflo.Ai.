import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Plus, Star, MessageSquare, ChevronLeft, Edit2, Settings, Trash2, Bookmark
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function ForumGroups() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "other",
    icon: "",
    banner_image: "",
    rules: "",
    is_private: false,
    require_approval: false
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: groups = [] } = useQuery({
    queryKey: ['forum-groups', filterCategory],
    queryFn: async () => {
      let all = await base44.entities.ForumGroup.filter({ is_active: true }, '-created_date');
      if (filterCategory !== 'all') all = all.filter(g => g.category === filterCategory);
      return all;
    },
    initialData: []
  });

  const { data: savedGroups = [] } = useQuery({
    queryKey: ['saved-groups'],
    queryFn: () => base44.entities.SavedGroup.filter({ user_email: currentUser?.email }),
    enabled: !!currentUser,
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const rules = data.rules ? data.rules.split('\n').filter(Boolean) : [];
      return await base44.entities.ForumGroup.create({
        ...data,
        rules,
        creator_email: currentUser.email,
        creator_name: currentUser.full_name,
        members: [currentUser.email],
        member_count: 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-groups']);
      setShowCreateModal(false);
      setFormData({ name: "", description: "", category: "other", icon: "", banner_image: "", rules: "", is_private: false, require_approval: false });
      toast.success('Group created!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const rules = data.rules ? data.rules.split('\n').filter(Boolean) : [];
      return await base44.entities.ForumGroup.update(id, { ...data, rules });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-groups']);
      setEditingGroup(null);
      setShowCreateModal(false);
      toast.success('Group updated!');
    }
  });

  const joinMutation = useMutation({
    mutationFn: async (groupId) => {
      const group = groups.find(g => g.id === groupId);
      const members = group.members || [];
      
      if (members.includes(currentUser.email)) {
        // Leave group
        return await base44.entities.ForumGroup.update(groupId, {
          members: members.filter(email => email !== currentUser.email),
          member_count: members.length - 1
        });
      } else {
        // Join group
        return await base44.entities.ForumGroup.update(groupId, {
          members: [...members, currentUser.email],
          member_count: members.length + 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-groups']);
      toast.success('Group membership updated!');
    }
  });

  const saveGroupMutation = useMutation({
    mutationFn: async (group) => {
      const saved = savedGroups.find(sg => sg.group_id === group.id);
      
      if (saved) {
        return await base44.entities.SavedGroup.delete(saved.id);
      } else {
        return await base44.entities.SavedGroup.create({
          user_email: currentUser.email,
          group_id: group.id,
          group_name: group.name
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['saved-groups']);
      toast.success('Saved groups updated!');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isSaved = (groupId) => savedGroups.some(sg => sg.group_id === groupId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-green-950 to-gray-950 pb-20">
      <div className="sticky top-16 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(createPageUrl("CommunityHub"))} className="p-2 hover:bg-white/10 rounded-full">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Users className="w-6 h-6 text-green-400" />
                  Forum Groups
                </h1>
                <p className="text-gray-400 text-sm">{groups.length} groups</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => navigate(createPageUrl("CommunityForums"))} variant="outline" className="border-white/20 text-white">
                <MessageSquare className="w-4 h-4 mr-2" />
                All Threads
              </Button>
              {currentUser && (
                <Button onClick={() => setShowCreateModal(true)} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Group
                </Button>
              )}
            </div>
          </div>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48 bg-white/10 border-white/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="technology">Technology</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="lifestyle">Lifestyle</SelectItem>
              <SelectItem value="entertainment">Entertainment</SelectItem>
              <SelectItem value="gaming">Gaming</SelectItem>
              <SelectItem value="music">Music</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {groups.map((group, idx) => {
              const isMember = group.members?.includes(currentUser?.email);
              const isCreator = group.creator_email === currentUser?.email;
              
              return (
                <motion.div key={group.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                  <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition h-full">
                    {group.banner_image && (
                      <div className="relative h-32">
                        <img src={group.banner_image} alt={group.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      </div>
                    )}
                    <CardContent className="p-6">
                      <div className="flex items-start gap-3 mb-4">
                        {group.icon ? (
                          <img src={group.icon} alt={group.name} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-1">{group.name}</h3>
                          <Badge className="bg-green-500/20 text-green-400 text-xs">{group.category}</Badge>
                        </div>
                        {currentUser && (
                          <button
                            onClick={() => saveGroupMutation.mutate(group)}
                            className="p-2 hover:bg-white/10 rounded-full transition"
                          >
                            <Bookmark className={`w-5 h-5 ${isSaved(group.id) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                          </button>
                        )}
                      </div>

                      <p className="text-gray-300 text-sm mb-4 line-clamp-3">{group.description}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {group.member_count || 0}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {group.thread_count || 0}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {isCreator ? (
                          <Button
                            onClick={() => {
                              setEditingGroup(group);
                              setFormData({
                                name: group.name,
                                description: group.description,
                                category: group.category,
                                icon: group.icon || "",
                                banner_image: group.banner_image || "",
                                rules: group.rules?.join('\n') || "",
                                is_private: group.is_private || false,
                                require_approval: group.require_approval || false
                              });
                              setShowCreateModal(true);
                            }}
                            variant="outline"
                            className="flex-1 border-white/20 text-white"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Manage
                          </Button>
                        ) : currentUser ? (
                          <Button
                            onClick={() => joinMutation.mutate(group.id)}
                            className={`flex-1 ${isMember ? 'bg-gray-600' : 'bg-green-600 hover:bg-green-700'}`}
                          >
                            {isMember ? 'Leave' : 'Join'}
                          </Button>
                        ) : null}
                        <Button
                          onClick={() => navigate(createPageUrl("CommunityForums") + `?group=${group.id}`)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          View Threads
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {groups.length === 0 && (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No groups yet</h3>
            <p className="text-gray-400">Create the first community group!</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) setEditingGroup(null);
      }}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit' : 'Create'} Group</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Group Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Miami Tech Enthusiasts"
                required
                className="bg-white/10 border-white/20"
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Category</label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="bg-white/10 border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="lifestyle">Lifestyle</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="gaming">Gaming</SelectItem>
                  <SelectItem value="music">Music</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Description *</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this group about?"
                required
                rows={4}
                className="bg-white/10 border-white/20"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Group Icon URL</label>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="https://..."
                className="bg-white/10 border-white/20"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Banner Image URL</label>
              <Input
                value={formData.banner_image}
                onChange={(e) => setFormData({ ...formData, banner_image: e.target.value })}
                placeholder="https://..."
                className="bg-white/10 border-white/20"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Group Rules (one per line)</label>
              <Textarea
                value={formData.rules}
                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                placeholder="Be respectful&#10;No spam&#10;Stay on topic"
                rows={4}
                className="bg-white/10 border-white/20"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_private}
                  onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-white">Private group (requires approval to join)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.require_approval}
                  onChange={(e) => setFormData({ ...formData, require_approval: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-white">Require approval for posts</span>
              </label>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-green-600">
                {editingGroup ? 'Update' : 'Create'} Group
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}