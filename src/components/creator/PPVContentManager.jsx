import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Lock, DollarSign, TrendingUp, Eye, Plus } from "lucide-react";
import { toast } from "sonner";

export default function PPVContentManager({ currentUser }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    content_type: "video",
    price_usd: 4.99,
    price_rri: 0,
    thumbnail_url: "",
    access_duration_hours: 48
  });

  const { data: ppvContent = [] } = useQuery({
    queryKey: ['ppv-content', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.PPVContent.filter({ creator_email: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const createPPVMutation = useMutation({
    mutationFn: (data) => base44.entities.PPVContent.create({
      ...data,
      creator_email: currentUser.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppv-content'] });
      setForm({
        title: "",
        description: "",
        content_type: "video",
        price_usd: 4.99,
        price_rri: 0,
        thumbnail_url: "",
        access_duration_hours: 48
      });
      toast.success('PPV content created!');
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => 
      base44.entities.PPVContent.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppv-content'] });
    }
  });

  const totalRevenue = ppvContent.reduce((sum, content) => sum + (content.revenue_generated || 0), 0);
  const totalPurchases = ppvContent.reduce((sum, content) => sum + (content.total_purchases || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <DollarSign className="w-5 h-5" />
              <span className="text-sm">PPV Revenue</span>
            </div>
            <div className="text-3xl font-bold text-white">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Eye className="w-5 h-5" />
              <span className="text-sm">Total Purchases</span>
            </div>
            <div className="text-3xl font-bold text-white">{totalPurchases}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <Lock className="w-5 h-5" />
              <span className="text-sm">PPV Content</span>
            </div>
            <div className="text-3xl font-bold text-white">{ppvContent.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Create PPV Content */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create Pay-Per-View Content
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              placeholder="Content Title"
              value={form.title}
              onChange={(e) => setForm({...form, title: e.target.value})}
              className="bg-white/10 border-white/20 text-white"
            />
            <Select value={form.content_type} onValueChange={(v) => setForm({...form, content_type: v})}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="livestream">Exclusive Livestream</SelectItem>
                <SelectItem value="video">Premium Video</SelectItem>
                <SelectItem value="series">Content Series</SelectItem>
                <SelectItem value="event">Special Event</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({...form, description: e.target.value})}
            className="bg-white/10 border-white/20 text-white"
          />

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Price (USD)</label>
              <Input
                type="number"
                step="0.01"
                value={form.price_usd}
                onChange={(e) => setForm({...form, price_usd: Number(e.target.value)})}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Price (SoFloCoin)</label>
              <Input
                type="number"
                value={form.price_rri}
                onChange={(e) => setForm({...form, price_rri: Number(e.target.value)})}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Access Duration (hours)</label>
              <Input
                type="number"
                value={form.access_duration_hours}
                onChange={(e) => setForm({...form, access_duration_hours: Number(e.target.value)})}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          <Input
            placeholder="Thumbnail URL"
            value={form.thumbnail_url}
            onChange={(e) => setForm({...form, thumbnail_url: e.target.value})}
            className="bg-white/10 border-white/20 text-white"
          />

          <Button
            onClick={() => createPPVMutation.mutate(form)}
            disabled={!form.title || createPPVMutation.isPending}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            Create PPV Content
          </Button>
        </CardContent>
      </Card>

      {/* PPV Content List */}
      <div className="grid md:grid-cols-2 gap-4">
        {ppvContent.map((content) => (
          <Card key={content.id} className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              {content.thumbnail_url && (
                <img src={content.thumbnail_url} className="w-full h-40 object-cover rounded-lg mb-3" />
              )}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-white font-semibold">{content.title}</h3>
                  <Badge className="bg-purple-500/20 text-purple-300 mt-1 capitalize">
                    {content.content_type}
                  </Badge>
                </div>
                <Button
                  onClick={() => toggleActiveMutation.mutate({ 
                    id: content.id, 
                    is_active: !content.is_active 
                  })}
                  size="sm"
                  variant="outline"
                  className={content.is_active ? 'bg-green-500/20' : 'bg-red-500/20'}
                >
                  {content.is_active ? 'Active' : 'Inactive'}
                </Button>
              </div>
              <p className="text-gray-400 text-sm mb-3">{content.description}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-black/20 rounded p-2">
                  <div className="text-gray-400">Price</div>
                  <div className="text-white font-bold">${content.price_usd}</div>
                </div>
                <div className="bg-black/20 rounded p-2">
                  <div className="text-gray-400">Purchases</div>
                  <div className="text-white font-bold">{content.total_purchases || 0}</div>
                </div>
                <div className="bg-black/20 rounded p-2">
                  <div className="text-gray-400">Revenue</div>
                  <div className="text-green-400 font-bold">${(content.revenue_generated || 0).toFixed(2)}</div>
                </div>
                <div className="bg-black/20 rounded p-2">
                  <div className="text-gray-400">Access</div>
                  <div className="text-white font-bold">{content.access_duration_hours}h</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}