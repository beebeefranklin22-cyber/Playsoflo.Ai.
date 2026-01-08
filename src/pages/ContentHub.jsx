import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, BarChart3, Calendar, Upload, Settings } from "lucide-react";
import ContentDashboard from "../components/content/ContentDashboard";
import ContentAnalytics from "../components/content/ContentAnalytics";
import ContentScheduler from "../components/content/ContentScheduler";
import ContentLibrary from "../components/content/ContentLibrary";
import ContentSettings from "../components/content/ContentSettings";

export default function ContentHub() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Content Hub</h1>
          <p className="text-gray-300 text-lg">Manage, schedule, and analyze all your content</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/10 backdrop-blur-xl border border-white/20">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-2">
              <Upload className="w-4 h-4" />
              Library
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="scheduler" className="gap-2">
              <Calendar className="w-4 h-4" />
              Scheduler
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <ContentDashboard currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="library">
            <ContentLibrary currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="analytics">
            <ContentAnalytics currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="scheduler">
            <ContentScheduler currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="settings">
            <ContentSettings currentUser={currentUser} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}