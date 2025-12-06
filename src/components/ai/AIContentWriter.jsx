import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Wand2, Copy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AIContentWriter({ onContentGenerated }) {
  const [prompt, setPrompt] = useState("");
  const [contentType, setContentType] = useState("blog");
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("medium");
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");

  const generateContent = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setGenerating(true);
    try {
      const lengthWords = { short: 200, medium: 500, long: 1000 };
      const aiPrompt = `Write a ${tone} ${contentType} about: "${prompt}". 
      Target length: ${lengthWords[length]} words. 
      Make it engaging, well-structured, and SEO-friendly.
      ${contentType === 'blog' ? 'Include a compelling title, introduction, body paragraphs, and conclusion.' : ''}
      ${contentType === 'description' ? 'Focus on benefits and key features.' : ''}
      ${contentType === 'social' ? 'Make it shareable and include relevant hashtags.' : ''}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: aiPrompt,
        add_context_from_internet: true
      });

      setGeneratedContent(result);
      if (onContentGenerated) onContentGenerated(result);
      toast.success("Content generated!");
    } catch (error) {
      toast.error("Failed to generate content");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success("Copied to clipboard!");
  };

  return (
    <Card className="glass-effect border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-purple-400" />
          AI Content Writer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-gray-400 text-sm mb-2 block">What do you want to write about?</label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., A blog post about sustainable travel tips for eco-conscious tourists..."
            className="bg-white/10 border-white/20 text-white placeholder-gray-500 min-h-[100px]"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Content Type</label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blog">Blog Post</SelectItem>
                <SelectItem value="description">Description</SelectItem>
                <SelectItem value="social">Social Media</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="story">Story</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Tone</label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
                <SelectItem value="humorous">Humorous</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Length</label>
            <Select value={length} onValueChange={setLength}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="long">Long</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={generateContent} 
          disabled={generating}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              Generate Content
            </>
          )}
        </Button>

        {generatedContent && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-gray-400 text-sm">Generated Content</label>
              <Button onClick={copyToClipboard} variant="outline" size="sm">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 max-h-[400px] overflow-y-auto">
              <p className="text-white whitespace-pre-wrap">{generatedContent}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}