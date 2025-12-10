import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Folder, Plus, Users, Video, DollarSign, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
                  <Badge className="bg-blue-500/20 text-blue-300">
                    {library.content_ids?.length || 0} items
                  </Badge>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-gray-300">{library.co_owners.length} co-owners</span>
                  </div>
                  {Object.entries(library.revenue_split || {}).map(([email, percent]) => (
                    <div key={email} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{email}</span>
                      <span className="text-green-400 font-bold">{percent}%</span>
                    </div>
                  ))}
                </div>

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
                  <option value="">+ Add Content</option>
                  {allContent
                    .filter(c => !library.content_ids?.includes(c.id))
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                </select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}