import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Edit3, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AIContentEditor({ initialContent = "", onContentEdited }) {
  const [content, setContent] = useState(initialContent);
  const [editAction, setEditAction] = useState("improve");
  const [tone, setTone] = useState("professional");
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");

  const editContent = async () => {
    if (!content.trim()) {
      toast.error("Please enter content to edit");
      return;
    }

    setEditing(true);
    try {
      const actions = {
        improve: "Improve the clarity and readability of this text while maintaining its meaning",
        shorten: "Make this text more concise while keeping the key points",
        expand: "Expand this text with more details and examples",
        simplify: "Simplify this text for easier understanding",
        tone: `Rewrite this text in a ${tone} tone`
      };

      const aiPrompt = `${actions[editAction]}:\n\n"${content}"\n\nProvide only the edited version without explanations.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: aiPrompt
      });

      setEditedContent(result);
      if (onContentEdited) onContentEdited(result);
      toast.success("Content edited!");
    } catch (error) {
      toast.error("Failed to edit content");
    } finally {
      setEditing(false);
    }
  };

  const useEditedContent = () => {
    setContent(editedContent);
    setEditedContent("");
  };

  return (
    <Card className="glass-effect border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-blue-400" />
          AI Content Editor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-gray-400 text-sm mb-2 block">Your Content</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your content here to edit..."
            className="bg-white/10 border-white/20 text-white placeholder-gray-500 min-h-[150px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Edit Action</label>
            <Select value={editAction} onValueChange={setEditAction}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="improve">Improve</SelectItem>
                <SelectItem value="shorten">Shorten</SelectItem>
                <SelectItem value="expand">Expand</SelectItem>
                <SelectItem value="simplify">Simplify</SelectItem>
                <SelectItem value="tone">Change Tone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {editAction === 'tone' && (
            <div>
              <label className="text-gray-400 text-sm mb-2 block">New Tone</label>
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
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Button 
          onClick={editContent} 
          disabled={editing}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
        >
          {editing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Editing...
            </>
          ) : (
            <>
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Content
            </>
          )}
        </Button>

        {editedContent && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-gray-400 text-sm">Edited Version</label>
              <Button onClick={useEditedContent} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Use This
              </Button>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 max-h-[300px] overflow-y-auto">
              <p className="text-white whitespace-pre-wrap">{editedContent}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}