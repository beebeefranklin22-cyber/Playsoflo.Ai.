import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Folder, Plus, Users, Video, DollarSign, UserPlus, Trash2, Upload, Film, FileVideo, Eye, Download, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function SharedLibraryManager({ currentUser }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newLibrary, setNewLibrary] = useState({
    name: "",
    description: "",
    co_owners: [currentUser?.email],
    revenue_split: { [currentUser?.email]: 100 }
  });
  const [addCoOwner, setAddCoOwner] = useState("");

  const { data: libraries = [] } = useQuery({
    queryKey: ['shared-libraries', currentUser?.email],
    queryFn: () => base44.entities.SharedContentLibrary.list(),
    enabled: !!currentUser,
    initialData: []
  });

  const { data: allContent = [] } = useQuery({
    queryKey: ['all-my-content'],
    queryFn: () => base44.entities.StreamingContent.filter({ created_by: currentUser.email }),
    enabled: !!currentUser,
    initialData: []
  });

  const [uploadingTo, setUploadingTo] = useState(null);
  const [viewingLibrary, setViewingLibrary] = useState(null);
  const [editingRevenue, setEditingRevenue] = useState(null);

  const createLibraryMutation = useMutation({
    mutationFn: (data) => base44.entities.SharedContentLibrary.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-libraries'] });
      setShowCreate(false);
      setNewLibrary({
        name: "",
        description: "",
        co_owners: [currentUser?.email],
        revenue_split: { [currentUser?.email]: 100 }
      });
      toast.success('Shared library created!');
    }
  });

  const addContentMutation = useMutation({
    mutationFn: ({ libraryId, contentId }) => {
      const library = libraries.find(l => l.id === libraryId);
      return base44.entities.SharedContentLibrary.update(libraryId, {
        content_ids: [...(library.content_ids || []), contentId]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-libraries'] });
      toast.success('Content added to library');
    }
  });

  const handleAddCoOwner = () => {
    if (!addCoOwner || newLibrary.co_owners.includes(addCoOwner)) return;
    
    const splitPercentage = 100 / (newLibrary.co_owners.length + 1);
    const newRevenueSplit = {};
    
    [...newLibrary.co_owners, addCoOwner].forEach(email => {
      newRevenueSplit[email] = parseFloat(splitPercentage.toFixed(2));
    });

    setNewLibrary({
      ...newLibrary,
      co_owners: [...newLibrary.co_owners, addCoOwner],
      revenue_split: newRevenueSplit
    });
    setAddCoOwner("");
  };

  const handleUploadToLibrary = async (file, libraryId) => {
    if (!file) return;
    
    setUploadingTo(libraryId);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const content = await base44.entities.StreamingContent.create({
        title: file.name.replace(/\.[^/.]+$/, ""),
        type: file.type.startsWith('video/') ? 'movie' : 'podcast',
        category: 'entertainment',
        description: `Uploaded to shared library`,
        thumbnail_url: file_url,
        duration: "N/A",
        is_live: false
      });

      await addContentMutation.mutateAsync({
        libraryId,
        contentId: content.id
      });

      toast.success('Video uploaded to library!');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploadingTo(null);
    }
  };

  const removeContentMutation = useMutation({
    mutationFn: ({ libraryId, contentId }) => {
      const library = libraries.find(l => l.id === libraryId);
      return base44.entities.SharedContentLibrary.update(libraryId, {
        content_ids: library.content_ids.filter(id => id !== contentId)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-libraries'] });
      toast.success('Content removed from library');
    }
  });

  const getLibraryContent = (library) => {
    return allContent.filter(c => library.content_ids?.includes(c.id));
  };

  const updateRevenueSplitMutation = useMutation({
    mutationFn: ({ libraryId, newSplit }) => 
      base44.entities.SharedContentLibrary.update(libraryId, {
        revenue_split: newSplit
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-libraries'] });
      toast.success('Revenue split updated!');
      setEditingRevenue(null);
    }
  });

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Folder className="w-5 h-5" />
              Shared Content Libraries
            </CardTitle>
            <Button
              onClick={() => setShowCreate(!showCreate)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Library
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCreate && (
            <div className="mb-6 p-4 bg-white/10 rounded-xl border border-white/20 space-y-4">
              <Input
                placeholder="Library Name"
                value={newLibrary.name}
                onChange={(e) => setNewLibrary({ ...newLibrary, name: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
              <Input
                placeholder="Description"
                value={newLibrary.description}
                onChange={(e) => setNewLibrary({ ...newLibrary, description: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />

              <div className="space-y-2">
                <label className="text-gray-400 text-sm">Co-owners</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter email"
                    value={addCoOwner}
                    onChange={(e) => setAddCoOwner(e.target.value)}
                    className="bg-white/10 border-white/20 text-white flex-1"
                  />
                  <Button onClick={handleAddCoOwner} size="sm">
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {newLibrary.co_owners.map(email => (
                    <Badge key={email} className="bg-purple-500/20 text-purple-300">
                      {email} ({newLibrary.revenue_split[email]}%)
                    </Badge>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => createLibraryMutation.mutate(newLibrary)}
                disabled={!newLibrary.name || newLibrary.co_owners.length === 0}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Create Library
              </Button>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {libraries.map(library => (
              <div key={library.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-white font-bold mb-1">{library.name}</h3>
                    <p className="text-gray-400 text-sm mb-2">{library.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className="bg-blue-500/20 text-blue-300">
                      {library.content_ids?.length || 0} items
                    </Badge>
                    <Button
                      onClick={() => setViewingLibrary(viewingLibrary?.id === library.id ? null : library)}
                      size="sm"
                      variant="outline"
                      className="bg-white/5 text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      {viewingLibrary?.id === library.id ? 'Hide' : 'View'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span className="text-gray-300">{library.co_owners.length} co-owners</span>
                    </div>
                    <Button
                      onClick={() => setEditingRevenue(library)}
                      size="sm"
                      variant="ghost"
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      <DollarSign className="w-3 h-3 mr-1" />
                      Edit Splits
                    </Button>
                  </div>
                  {Object.entries(library.revenue_split || {}).map(([email, percent]) => (
                    <div key={email} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 truncate max-w-[180px]">{email}</span>
                      <span className="text-green-400 font-bold">{percent}%</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addContentMutation.mutate({
                          libraryId: library.id,
                          contentId: e.target.value
                        });
                        e.target.value = "";
                      }
                    }}
                    className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                  >
                    <option value="">+ Link Existing Content</option>
                    {allContent
                      .filter(c => !library.content_ids?.includes(c.id))
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                  </select>

                  <Button
                    onClick={() => document.getElementById(`upload-to-${library.id}`).click()}
                    disabled={uploadingTo === library.id}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    size="sm"
                  >
                    {uploadingTo === library.id ? (
                      <>Uploading...</>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload New Video
                      </>
                    )}
                  </Button>
                  <input
                    id={`upload-to-${library.id}`}
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleUploadToLibrary(e.target.files?.[0], library.id)}
                    className="hidden"
                  />
                </div>

                {viewingLibrary?.id === library.id && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                    <h4 className="text-white font-semibold text-sm mb-2">Library Content</h4>
                    {getLibraryContent(library).map(content => (
                      <div key={content.id} className="flex items-center justify-between p-2 bg-white/10 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileVideo className="w-4 h-4 text-blue-400" />
                          <span className="text-white text-sm">{content.title}</span>
                        </div>
                        <Button
                          onClick={() => removeContentMutation.mutate({ libraryId: library.id, contentId: content.id })}
                          size="sm"
                          variant="ghost"
                          className="text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    {getLibraryContent(library).length === 0 && (
                      <p className="text-gray-500 text-xs text-center py-2">No content yet</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Split Editor Modal */}
      <AnimatePresence>
        {editingRevenue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setEditingRevenue(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Edit Revenue Splits</h3>
                <button onClick={() => setEditingRevenue(null)}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {editingRevenue.co_owners.map((email, idx) => {
                  const currentSplit = { ...editingRevenue.revenue_split };
                  return (
                    <div key={email} className="flex items-center gap-3">
                      <div className="flex-1 text-white text-sm truncate">{email}</div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={currentSplit[email] || 0}
                          onChange={(e) => {
                            const newValue = Number(e.target.value);
                            setEditingRevenue({
                              ...editingRevenue,
                              revenue_split: {
                                ...currentSplit,
                                [email]: newValue
                              }
                            });
                          }}
                          className="w-20 text-center bg-white/10 border-white/20 text-white"
                        />
                        <span className="text-purple-400">%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-black/20 rounded-lg mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Total:</span>
                  <span className={`font-bold ${
                    Object.values(editingRevenue.revenue_split || {}).reduce((a, b) => a + b, 0) === 100
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}>
                    {Object.values(editingRevenue.revenue_split || {}).reduce((a, b) => a + b, 0)}%
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const total = Object.values(editingRevenue.revenue_split || {}).reduce((a, b) => a + b, 0);
                    if (total !== 100) {
                      toast.error('Total must equal 100%');
                      return;
                    }
                    updateRevenueSplitMutation.mutate({
                      libraryId: editingRevenue.id,
                      newSplit: editingRevenue.revenue_split
                    });
                  }}
                  disabled={Object.values(editingRevenue.revenue_split || {}).reduce((a, b) => a + b, 0) !== 100}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Save Changes
                </Button>
                <Button
                  onClick={() => setEditingRevenue(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}