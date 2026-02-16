import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function GoLiveNewsModal({ isOpen, onClose, currentUser, onGoLive }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "other"
  });

  const createLiveNewsMutation = useMutation({
    mutationFn: async (data) => {
      const channelName = `news_${Date.now()}_${currentUser.email}`;
      
      const newsPost = await base44.entities.NewsPost.create({
        ...data,
        author_email: currentUser.email,
        author_name: currentUser.full_name,
        author_photo: currentUser.profile_picture,
        is_live: true,
        agora_channel_name: channelName,
        live_started_at: new Date().toISOString(),
        status: 'published'
      });

      return { newsPost, channelName };
    },
    onSuccess: ({ newsPost, channelName }) => {
      queryClient.invalidateQueries(['news-posts']);
      toast.success('Going live!');
      onGoLive(newsPost, channelName);
      onClose();
      setFormData({ title: "", content: "", category: "other" });
    },
    onError: (error) => {
      console.error('Error starting live news:', error);
      toast.error('Failed to start live broadcast');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createLiveNewsMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-red-500" />
            Go Live - News Broadcast
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">News Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Breaking: Major event happening now..."
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
                <SelectItem value="local">Local</SelectItem>
                <SelectItem value="entertainment">Entertainment</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="lifestyle">Lifestyle</SelectItem>
                <SelectItem value="politics">Politics</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Description *</label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Describe what you'll be covering..."
              required
              rows={4}
              className="bg-white/10 border-white/20"
            />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-400 text-sm">
              📹 Your camera will be accessed for live streaming
            </p>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createLiveNewsMutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {createLiveNewsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Go Live Now
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}