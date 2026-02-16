import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Newspaper, Briefcase, MessageSquare, DollarSign,
  TrendingUp, Users, ChevronRight, Clock, Eye,
  Plus, Star
} from "lucide-react";
import { motion } from "framer-motion";

export default function CommunityHub() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: newsCount = 0 } = useQuery({
    queryKey: ['news-count'],
    queryFn: async () => {
      const posts = await base44.entities.NewsPost.filter({ status: "published" });
      return posts.length;
    },
    initialData: 0
  });

  const { data: jobsCount = 0 } = useQuery({
    queryKey: ['jobs-count'],
    queryFn: async () => {
      const jobs = await base44.entities.JobGig.filter({ status: "active" });
      return jobs.length;
    },
    initialData: 0
  });

  const { data: threadsCount = 0 } = useQuery({
    queryKey: ['threads-count'],
    queryFn: async () => {
      const threads = await base44.entities.ForumThread.list();
      return threads.length;
    },
    initialData: 0
  });

  const { data: affiliateCount = 0 } = useQuery({
    queryKey: ['affiliate-count'],
    queryFn: async () => {
      const listings = await base44.entities.AffiliateListing.filter({ status: "active" });
      return listings.length;
    },
    initialData: 0
  });

  const sections = [
    {
      id: "news",
      title: "News & Updates",
      description: "Community news, announcements, and trending stories",
      icon: Newspaper,
      color: "from-blue-600 to-cyan-600",
      path: "CommunityNews",
      count: newsCount,
      stats: "Latest stories"
    },
    {
      id: "jobs",
      title: "Jobs & Gigs",
      description: "Find work opportunities, post jobs, and connect with talent",
      icon: Briefcase,
      color: "from-purple-600 to-pink-600",
      path: "CommunityJobs",
      count: jobsCount,
      stats: "Active listings"
    },
    {
      id: "forums",
      title: "Community Forums",
      description: "Join discussions, ask questions, and share knowledge",
      icon: MessageSquare,
      color: "from-green-600 to-emerald-600",
      path: "CommunityForums",
      count: threadsCount,
      stats: "Active threads"
    },
    {
      id: "affiliate",
      title: "Affiliate Programs",
      description: "Discover partnerships and monetization opportunities",
      icon: DollarSign,
      color: "from-orange-600 to-red-600",
      path: "CommunityAffiliate",
      count: affiliateCount,
      stats: "Active programs"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold text-white mb-3 flex items-center gap-3">
              <Users className="w-10 h-10" />
              Community Hub
            </h1>
            <p className="text-white/90 text-lg max-w-2xl">
              Your one-stop destination for news, jobs, discussions, and affiliate opportunities
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Main Sections Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card
                  onClick={() => navigate(createPageUrl(section.path))}
                  className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer group h-full"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center transform group-hover:scale-110 transition`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-white transition" />
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2">
                      {section.title}
                    </h3>
                    <p className="text-gray-400 mb-4">
                      {section.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-500/20 text-purple-400 text-lg px-3 py-1">
                          {section.count}
                        </Badge>
                        <span className="text-gray-500 text-sm">{section.stats}</span>
                      </div>
                      <Button
                        variant="ghost"
                        className="text-purple-400 hover:bg-purple-500/20"
                      >
                        Explore
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Stats */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Community Overview
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{newsCount}</p>
                <p className="text-gray-400 text-sm">News Posts</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{jobsCount}</p>
                <p className="text-gray-400 text-sm">Job Listings</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{threadsCount}</p>
                <p className="text-gray-400 text-sm">Forum Threads</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{affiliateCount}</p>
                <p className="text-gray-400 text-sm">Affiliate Programs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}