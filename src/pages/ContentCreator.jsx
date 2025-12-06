import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wand2, Edit3, Tag, Video } from "lucide-react";
import AIContentWriter from "../components/ai/AIContentWriter";
import AIContentEditor from "../components/ai/AIContentEditor";
import AITagGenerator from "../components/ai/AITagGenerator";
import AIVideoGenerator from "../components/ai/AIVideoGenerator";

export default function ContentCreator() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            AI Content Studio
          </h1>
          <p className="text-gray-300 text-xl">
            Write, edit, optimize, and transform content with AI
          </p>
        </div>

        <Tabs defaultValue="writer" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white/10 border border-white/20 mb-8">
            <TabsTrigger value="writer" className="flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              Writer
            </TabsTrigger>
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags & SEO
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Video Gen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="writer">
            <AIContentWriter />
          </TabsContent>

          <TabsContent value="editor">
            <AIContentEditor />
          </TabsContent>

          <TabsContent value="tags">
            <AITagGenerator />
          </TabsContent>

          <TabsContent value="video">
            <AIVideoGenerator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}