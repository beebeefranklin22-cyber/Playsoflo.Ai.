import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Tag, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AITagGenerator({ content = "", onTagsGenerated }) {
  const [inputContent, setInputContent] = useState(content);
  const [generating, setGenerating] = useState(false);
  const [tags, setTags] = useState([]);
  const [metadata, setMetadata] = useState(null);

  const generateTags = async () => {
    if (!inputContent.trim()) {
      toast.error("Please enter content");
      return;
    }

    setGenerating(true);
    try {
      const aiPrompt = `Analyze this content and provide:
1. 10 relevant SEO tags/keywords
2. A compelling meta description (150-160 characters)
3. A suggested title (if not present)
4. 3-5 relevant categories

Content: "${inputContent}"

Return as JSON with: tags, meta_description, title, categories`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: aiPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            tags: { type: "array", items: { type: "string" } },
            meta_description: { type: "string" },
            title: { type: "string" },
            categories: { type: "array", items: { type: "string" } }
          }
        }
      });

      setTags(result.tags || []);
      setMetadata({
        description: result.meta_description,
        title: result.title,
        categories: result.categories || []
      });
      
      if (onTagsGenerated) onTagsGenerated({ tags: result.tags, metadata: result });
      toast.success("Tags generated!");
    } catch (error) {
      toast.error("Failed to generate tags");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="glass-effect border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Tag className="w-5 h-5 text-green-400" />
          AI Tag & Metadata Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-gray-400 text-sm mb-2 block">Content</label>
          <Textarea
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            placeholder="Paste your content to generate tags and metadata..."
            className="bg-white/10 border-white/20 text-white placeholder-gray-500 min-h-[150px]"
          />
        </div>

        <Button 
          onClick={generateTags} 
          disabled={generating}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Tags & Metadata
            </>
          )}
        </Button>

        {tags.length > 0 && (
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, idx) => (
                  <Badge key={idx} className="bg-green-500/20 text-green-300">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>

            {metadata && (
              <>
                {metadata.title && (
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Suggested Title</label>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-white">{metadata.title}</p>
                    </div>
                  </div>
                )}

                {metadata.description && (
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Meta Description</label>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-gray-300 text-sm">{metadata.description}</p>
                    </div>
                  </div>
                )}

                {metadata.categories && metadata.categories.length > 0 && (
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Categories</label>
                    <div className="flex flex-wrap gap-2">
                      {metadata.categories.map((cat, idx) => (
                        <Badge key={idx} className="bg-blue-500/20 text-blue-300">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}