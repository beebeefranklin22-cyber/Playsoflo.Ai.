import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, Film, TrendingUp, BookOpen, Camera, Palette, 
  Type, Zap, Check, Plus, X, Search, Save
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function TemplateLibrary({ onApplyTemplate, currentUser }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ['video-templates'],
    queryFn: async () => {
      return await base44.entities.VideoTemplate.list();
    }
  });

  const { data: myTemplates = [] } = useQuery({
    queryKey: ['my-video-templates', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.VideoTemplate.filter({
        created_by: currentUser.email
      });
    },
    enabled: !!currentUser
  });

  const useTemplateMutation = useMutation({
    mutationFn: async (templateId) => {
      const template = [...templates, ...myTemplates].find(t => t.id === templateId);
      // Increment use count (best-effort, non-blocking)
      base44.entities.VideoTemplate.update(templateId, {
        uses_count: (template.uses_count || 0) + 1
      }).catch(() => {});
      return template;
    },
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ['video-templates'] });
      onApplyTemplate(template);
      toast.success(`${template.template_name} applied!`);
    }
  });

  const allTemplates = [...templates, ...myTemplates.filter(mt => !templates.find(t => t.id === mt.id))];

  const filteredTemplates = allTemplates.filter(t => {
    const matchesSearch = (t.template_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: "all", label: "All Templates", icon: Sparkles },
    { id: "social_media", label: "Social Media", icon: TrendingUp },
    { id: "vlog", label: "Vlog", icon: Camera },
    { id: "promo", label: "Promo", icon: Film },
    { id: "tutorial", label: "Tutorial", icon: BookOpen },
    { id: "cinematic", label: "Cinematic", icon: Palette }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-purple-400" />
            Template Library
          </h2>
          <p className="text-gray-400 mt-1">Professional presets to speed up your workflow</p>
        </div>
        <Button
          onClick={() => setShowCreateTemplate(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Save Current as Template
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="pl-10 bg-white/10 border-white/20 text-white"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="bg-white/5 border border-white/10 p-1">
          {categories.map((cat) => (
            <TabsTrigger 
              key={cat.id}
              value={cat.id}
              className="data-[state=active]:bg-purple-600"
            >
              <cat.icon className="w-4 h-4 mr-1" />
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Templates Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-white/5 border-white/10 hover:border-purple-500/50 transition group">
              <CardContent className="p-4">
                {/* Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg mb-3 flex items-center justify-center">
                  <Film className="w-12 h-12 text-purple-400" />
                </div>

                {/* Info */}
                <div className="mb-3">
                  <h3 className="text-white font-bold mb-1">{template.template_name}</h3>
                  <p className="text-gray-400 text-xs line-clamp-2">{template.description}</p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge className="bg-purple-500/20 text-purple-300 text-xs">
                    {template.category}
                  </Badge>
                  <span className="text-gray-500 text-xs">
                    {template.uses_count || 0} uses
                  </span>
                </div>

                {/* Features */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  {template.color_grade && (
                    <div className="flex items-center gap-1 text-purple-300">
                      <Palette className="w-3 h-3" />
                      Color Grade
                    </div>
                  )}
                  {template.text_overlays?.length > 0 && (
                    <div className="flex items-center gap-1 text-blue-300">
                      <Type className="w-3 h-3" />
                      {template.text_overlays.length} Overlays
                    </div>
                  )}
                  {template.transitions?.length > 0 && (
                    <div className="flex items-center gap-1 text-green-300">
                      <Zap className="w-3 h-3" />
                      {template.transitions.length} Transitions
                    </div>
                  )}
                </div>

                {/* Apply Button */}
                <Button
                  onClick={() => useTemplateMutation.mutate(template.id)}
                  disabled={useTemplateMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Use Template
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No templates found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}