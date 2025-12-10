import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit3, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";

export default function ContentEditWorkflow({ currentUser }) {
  const queryClient = useQueryClient();
  const [editForm, setEditForm] = useState({
    content_id: "",
    edit_type: "title_change",
    changes: {}
  });

  const { data: myContent = [] } = useQuery({
    queryKey: ['editable-content', currentUser?.email],
    queryFn: () => base44.entities.StreamingContent.filter({ created_by: currentUser.email }),
    enabled: !!currentUser,
    initialData: []
  });

  const { data: libraries = [] } = useQuery({
    queryKey: ['my-libraries', currentUser?.email],
    queryFn: () => base44.entities.SharedContentLibrary.list(),
    enabled: !!currentUser,
    initialData: []
  });

  const sharedContentIds = libraries.flatMap(l => l.content_ids || []);

  const { data: pendingEdits = [] } = useQuery({
    queryKey: ['pending-edits', currentUser?.email],
    queryFn: async () => {
      const allEdits = await base44.entities.ContentEdit.list();
      return allEdits.filter(e => 
        e.status === 'pending' && 
        myContent.some(c => c.id === e.content_id)
      );
    },
    enabled: !!currentUser && myContent.length > 0,
    initialData: []
  });

  const submitEditMutation = useMutation({
    mutationFn: (data) => base44.entities.ContentEdit.create({
      ...data,
      editor_email: currentUser.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-edits'] });
      setEditForm({ content_id: "", edit_type: "title_change", changes: {} });
      toast.success('Edit submitted for review');
    }
  });

  const reviewEditMutation = useMutation({
    mutationFn: async ({ editId, approved }) => {
      await base44.asServiceRole.entities.ContentEdit.update(editId, {
        status: approved ? 'approved' : 'rejected',
        reviewed_by: currentUser.email
      });

      if (approved) {
        const edit = pendingEdits.find(e => e.id === editId);
        await base44.entities.StreamingContent.update(edit.content_id, edit.changes);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-edits'] });
      queryClient.invalidateQueries({ queryKey: ['editable-content'] });
      toast.success('Edit reviewed');
    }
  });

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-300',
    approved: 'bg-green-500/20 text-green-300',
    rejected: 'bg-red-500/20 text-red-300'
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            Collaborative Editing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Submit Edit */}
            <div className="space-y-3">
              <h3 className="text-white font-semibold">Propose Edit</h3>
              <Select
                value={editForm.content_id}
                onValueChange={(v) => setEditForm({ ...editForm, content_id: v })}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select Content" />
                </SelectTrigger>
                <SelectContent>
                  {myContent.filter(c => sharedContentIds.includes(c.id)).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={editForm.edit_type}
                onValueChange={(v) => setEditForm({ ...editForm, edit_type: v })}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title_change">Change Title</SelectItem>
                  <SelectItem value="description_change">Change Description</SelectItem>
                  <SelectItem value="thumbnail_change">Change Thumbnail</SelectItem>
                  <SelectItem value="metadata">Update Metadata</SelectItem>
                </SelectContent>
              </Select>

              {editForm.edit_type === 'title_change' && (
                <Input
                  placeholder="New Title"
                  onChange={(e) => setEditForm({ ...editForm, changes: { title: e.target.value } })}
                  className="bg-white/10 border-white/20 text-white"
                />
              )}

              {editForm.edit_type === 'description_change' && (
                <Input
                  placeholder="New Description"
                  onChange={(e) => setEditForm({ ...editForm, changes: { description: e.target.value } })}
                  className="bg-white/10 border-white/20 text-white"
                />
              )}

              <Button
                onClick={() => submitEditMutation.mutate(editForm)}
                disabled={!editForm.content_id || Object.keys(editForm.changes).length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Submit for Review
              </Button>
            </div>

            {/* Pending Reviews */}
            <div className="space-y-3">
              <h3 className="text-white font-semibold">Pending Reviews</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pendingEdits.map(edit => (
                  <div key={edit.id} className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <Badge className={statusColors[edit.status]}>
                          {edit.status}
                        </Badge>
                        <p className="text-white text-sm mt-1 capitalize">
                          {edit.edit_type.replace('_', ' ')}
                        </p>
                        <p className="text-gray-400 text-xs">by {edit.editor_email}</p>
                      </div>
                      {edit.editor_email !== currentUser.email && edit.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button
                            onClick={() => reviewEditMutation.mutate({ editId: edit.id, approved: true })}
                            size="sm"
                            className="bg-green-600"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => reviewEditMutation.mutate({ editId: edit.id, approved: false })}
                            size="sm"
                            variant="destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="text-gray-300 text-xs">
                      Changes: {JSON.stringify(edit.changes)}
                    </div>
                  </div>
                ))}
                {pendingEdits.length === 0 && (
                  <p className="text-gray-400 text-center py-4">No pending edits</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}