import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, X, CheckCircle, AlertCircle, DollarSign, Percent } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function RoyaltySplitManager({ track, currentUser }) {
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [collaborators, setCollaborators] = useState([]);

  const { data: existingSplit } = useQuery({
    queryKey: ['royalty-split', track?.id],
    queryFn: async () => {
      if (!track) return null;
      const splits = await base44.entities.RoyaltySplit.filter({ track_id: track.id });
      return splits[0] || null;
    },
    enabled: !!track,
  });

  React.useEffect(() => {
    if (existingSplit) {
      setCollaborators(existingSplit.splits || []);
    } else {
      setCollaborators([{
        user_email: currentUser?.email || '',
        name: currentUser?.full_name || '',
        percentage: 100,
        role: 'artist'
      }]);
    }
  }, [existingSplit, currentUser]);

  const saveSplitMutation = useMutation({
    mutationFn: async (splitData) => {
      if (existingSplit) {
        return await base44.entities.RoyaltySplit.update(existingSplit.id, splitData);
      } else {
        return await base44.entities.RoyaltySplit.create(splitData);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['royalty-split'] });
      toast.success('Royalty split saved');
      setIsEditing(false);
    },
  });

  const addCollaborator = () => {
    setCollaborators([...collaborators, {
      user_email: '',
      name: '',
      percentage: 0,
      role: 'featured_artist'
    }]);
  };

  const removeCollaborator = (index) => {
    setCollaborators(collaborators.filter((_, i) => i !== index));
  };

  const updateCollaborator = (index, field, value) => {
    const updated = [...collaborators];
    updated[index][field] = value;
    setCollaborators(updated);
  };

  const handleSave = () => {
    const totalPercentage = collaborators.reduce((sum, c) => sum + parseFloat(c.percentage || 0), 0);
    
    if (Math.abs(totalPercentage - 100) > 0.01) {
      toast.error(`Split must equal 100%. Current total: ${totalPercentage.toFixed(1)}%`);
      return;
    }

    const invalidCollaborators = collaborators.filter(c => !c.user_email || !c.name);
    if (invalidCollaborators.length > 0) {
      toast.error('All collaborators must have email and name');
      return;
    }

    saveSplitMutation.mutate({
      track_id: track.id,
      splits: collaborators,
      status: 'active'
    });
  };

  const totalPercentage = collaborators.reduce((sum, c) => sum + parseFloat(c.percentage || 0), 0);

  if (!track) return null;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            Royalty Split
          </CardTitle>
          {!isEditing && (
            <Button
              size="sm"
              onClick={() => setIsEditing(true)}
              className="bg-purple-600"
            >
              {existingSplit ? 'Edit Split' : 'Set Up Split'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
              <p className="text-blue-300 text-sm">
                💡 Set how revenue from this track will be split. Total must equal 100%.
              </p>
            </div>

            {collaborators.map((collab, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between mb-2">
                  <Badge className="bg-purple-500/20 text-purple-400 capitalize">
                    {collab.role.replace('_', ' ')}
                  </Badge>
                  {collaborators.length > 1 && (
                    <button
                      onClick={() => removeCollaborator(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Collaborator Name"
                    value={collab.name}
                    onChange={(e) => updateCollaborator(index, 'name', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={collab.user_email}
                    onChange={(e) => updateCollaborator(index, 'user_email', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <Select 
                    value={collab.role} 
                    onValueChange={(v) => updateCollaborator(index, 'role', v)}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="artist">Artist</SelectItem>
                      <SelectItem value="producer">Producer</SelectItem>
                      <SelectItem value="featured_artist">Featured Artist</SelectItem>
                      <SelectItem value="songwriter">Songwriter</SelectItem>
                      <SelectItem value="engineer">Engineer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="Percentage"
                      value={collab.percentage}
                      onChange={(e) => updateCollaborator(index, 'percentage', parseFloat(e.target.value))}
                      className="bg-white/10 border-white/20 text-white pr-10"
                    />
                    <Percent className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </motion.div>
            ))}

            <Button
              onClick={addCollaborator}
              variant="outline"
              className="w-full border-white/20 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Collaborator
            </Button>

            <div className={`rounded-lg p-3 flex items-center justify-between ${
              Math.abs(totalPercentage - 100) < 0.01 
                ? 'bg-green-500/10 border border-green-500/30' 
                : 'bg-yellow-500/10 border border-yellow-500/30'
            }`}>
              <span className={`font-semibold ${
                Math.abs(totalPercentage - 100) < 0.01 ? 'text-green-400' : 'text-yellow-400'
              }`}>
                Total: {totalPercentage.toFixed(1)}%
              </span>
              {Math.abs(totalPercentage - 100) < 0.01 ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-400" />
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveSplitMutation.isPending || Math.abs(totalPercentage - 100) > 0.01}
                className="flex-1 bg-green-600"
              >
                {saveSplitMutation.isPending ? 'Saving...' : 'Save Split'}
              </Button>
            </div>
          </div>
        ) : existingSplit ? (
          <div className="space-y-3">
            {existingSplit.splits.map((collab, index) => (
              <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{collab.name}</p>
                    <p className="text-gray-400 text-sm capitalize">{collab.role.replace('_', ' ')}</p>
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-400 text-lg">
                  {collab.percentage}%
                </Badge>
              </div>
            ))}

            {existingSplit.total_distributed > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-4">
                <div className="flex items-center gap-2 text-blue-300">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm">
                    Total Distributed: <strong>${existingSplit.total_distributed.toFixed(2)}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-4">No royalty split configured</p>
            <Button onClick={() => setIsEditing(true)} className="bg-purple-600">
              Set Up Split
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}