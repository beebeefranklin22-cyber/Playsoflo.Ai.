import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Newspaper, MessageSquare, TrendingUp, Briefcase,
  Search, ChevronLeft, MapPin, DollarSign, Clock,
  ExternalLink, Users, ThumbsUp, MessageCircle,
  Share2, Bookmark, Filter, Plus, ArrowUpRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function UniverseHub() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("news");
  const [newsFilter, setNewsFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch news from API
  const { data: news = [], isLoading: loadingNews } = useQuery({
    queryKey: ['world-news', newsFilter],
    queryFn: async () => {
      try {
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `Get the latest world news headlines from today. Include ${newsFilter === 'all' ? 'all categories' : newsFilter} news. Return an array of news articles with title, summary, category, source, and url.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              articles: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    summary: { type: "string" },
                    category: { type: "string" },
                    source: { type: "string" },
                    url: { type: "string" },
                    image_url: { type: "string" }
                  }
                }
              }
            }
          }
        });
        return response.articles || [];
      } catch (error) {
        console.error('News fetch error:', error);
        return [];
      }
    },
    refetchInterval: 300000
  });

  const { data: forums = [] } = useQuery({
    queryKey: ['forum-posts'],
    queryFn: async () => {
      return await base44.entities.ForumPost.list('-created_date', 20);
    },
    initialData: []
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs', jobFilter],
    queryFn: async () => {
      const allJobs = await base44.entities.Job.filter({ status: 'active' });
      if (jobFilter === 'all') return allJobs;
      return allJobs.filter(j => j.category === jobFilter);
    },
    initialData: []
  });

  const { data: affiliatePrograms = [] } = useQuery({
    queryKey: ['affiliate-programs'],
    queryFn: async () => {
      // Return affiliate opportunities
      return [
        {
          id: 'shopify',
          name: 'Shopify Affiliate',
          description: 'Earn commissions by promoting Shopify products',
          commission_rate: '10-20%',
          payout_threshold: '$25',
          icon: '🛍️',
          color: 'green'
        },
        {
          id: 'stripe',
          name: 'Stripe Partner',
          description: 'Refer businesses to Stripe and earn revenue share',
          commission_rate: 'Revenue share',
          payout_threshold: '$100',
          icon: '💳',
          color: 'purple'
        },
        {
          id: 'creator',
          name: 'Creator Referrals',
          description: 'Refer creators to the platform and earn',
          commission_rate: '15%',
          payout_threshold: '$50',
          icon: '🎨',
          color: 'pink'
        }
      ];
    }
  });

  const newsCategories = ['all', 'technology', 'business', 'sports', 'entertainment', 'health', 'science'];
  const jobCategories = ['all', 'tech', 'creative', 'marketing', 'driver', 'delivery', 'hospitality', 'freelance'];

  const filteredNews = news.filter(article =>
    !searchQuery || article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredJobs = jobs.filter(job =>
    !searchQuery || job.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredForums = forums.filter(post =>
    !searchQuery || post.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-16 z-30 glass-effect border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(createPageUrl("Universe"))}
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Universe Hub</h1>
            <p className="text-gray-400 text-sm">News, forums, jobs & opportunities</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search news, jobs, forums..."
            className="pl-12 bg-white/10 border-white/20 text-white"
          />
        </div>
      </div>

      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-white/10 border border-white/20">
            <TabsTrigger value="news" className="flex items-center gap-2">
              <Newspaper className="w-4 h-4" />
              <span className="hidden sm:inline">News</span>
            </TabsTrigger>
            <TabsTrigger value="forums" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Forums</span>
            </TabsTrigger>
            <TabsTrigger value="affiliate" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Affiliate</span>
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">Jobs</span>
            </TabsTrigger>
          </TabsList>

          {/* News Tab */}
          <TabsContent value="news" className="space-y-4 mt-6">
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {newsCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setNewsFilter(cat)}
                  className={`px-4 py-2 rounded-full font-medium transition flex-shrink-0 ${
                    newsFilter === cat
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            {loadingNews ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading news...</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredNews.map((article, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="glass-effect border-white/10 hover:bg-white/10 transition cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {article.image_url && (
                            <img
                              src={article.image_url}
                              alt={article.title}
                              className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="text-white font-bold line-clamp-2">{article.title}</h3>
                              <Badge className="bg-blue-500/20 text-blue-300 flex-shrink-0">
                                {article.category}
                              </Badge>
                            </div>
                            <p className="text-gray-400 text-sm line-clamp-2 mb-2">{article.summary}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500 text-xs">{article.source}</span>
                              {article.url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(article.url, '_blank')}
                                  className="text-blue-400 hover:text-blue-300"
                                >
                                  Read More
                                  <ExternalLink className="w-3 h-3 ml-1" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Forums Tab */}
          <TabsContent value="forums" className="space-y-4 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Community Discussions</h2>
              <Button
                onClick={() => navigate(createPageUrl("CommunityHub"))}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Post
              </Button>
            </div>

            <div className="space-y-3">
              {filteredForums.map((post, idx) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card 
                    className="glass-effect border-white/10 hover:bg-white/10 transition cursor-pointer"
                    onClick={() => navigate(createPageUrl("CommunityHub") + `?post=${post.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {post.created_by?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-bold mb-1">{post.title}</h3>
                          <p className="text-gray-400 text-sm line-clamp-2 mb-2">{post.content}</p>
                          <div className="flex items-center gap-4 text-gray-500 text-xs">
                            <div className="flex items-center gap-1">
                              <ThumbsUp className="w-3 h-3" />
                              {post.likes?.length || 0}
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" />
                              {post.replies_count || 0}
                            </div>
                            <span>{new Date(post.created_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {filteredForums.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No discussions yet</p>
                  <Button
                    onClick={() => navigate(createPageUrl("CommunityHub"))}
                    className="mt-4 bg-purple-600 hover:bg-purple-700"
                  >
                    Start a Discussion
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Affiliate Tab */}
          <TabsContent value="affiliate" className="space-y-4 mt-6">
            <Card className="glass-effect border-white/10 bg-gradient-to-r from-green-500/10 to-blue-500/10">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg mb-2">Earn with Affiliate Marketing</h3>
                    <p className="text-gray-300 text-sm mb-4">
                      Promote products and services, earn commission on every sale
                    </p>
                    <Button
                      onClick={() => navigate(createPageUrl("AffiliateHub"))}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      View Your Earnings
                      <ArrowUpRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <h2 className="text-xl font-bold text-white mt-6">Available Programs</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {affiliatePrograms.map(program => (
                <Card key={program.id} className="glass-effect border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`text-4xl`}>{program.icon}</div>
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-lg mb-1">{program.name}</h3>
                        <p className="text-gray-400 text-sm">{program.description}</p>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Commission:</span>
                        <span className="text-green-400 font-bold">{program.commission_rate}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Min. Payout:</span>
                        <span className="text-white font-medium">{program.payout_threshold}</span>
                      </div>
                    </div>
                    <Button className={`w-full bg-${program.color}-600 hover:bg-${program.color}-700`}>
                      Join Program
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4 mt-6">
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar mb-4">
              {jobCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setJobFilter(cat)}
                  className={`px-4 py-2 rounded-full font-medium transition flex-shrink-0 ${
                    jobFilter === cat
                      ? 'bg-orange-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <p className="text-gray-400 text-sm">{filteredJobs.length} opportunities available</p>
              <Button
                onClick={() => navigate(createPageUrl("PostJob"))}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Post a Job
              </Button>
            </div>

            <div className="grid gap-4">
              {filteredJobs.map((job, idx) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="glass-effect border-white/10 hover:bg-white/10 transition">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {job.company_logo ? (
                          <img src={job.company_logo} className="w-12 h-12 rounded-lg object-cover" alt={job.company_name} />
                        ) : (
                          <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                            <Briefcase className="w-6 h-6 text-orange-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="text-white font-bold text-lg">{job.title}</h3>
                              <p className="text-gray-400 text-sm">{job.company_name || 'Private Employer'}</p>
                            </div>
                            <Badge className="bg-orange-500/20 text-orange-300 capitalize flex-shrink-0">
                              {job.job_type.replace('_', ' ')}
                            </Badge>
                          </div>

                          <p className="text-gray-300 text-sm mb-3 line-clamp-2">{job.description}</p>

                          <div className="flex flex-wrap gap-3 mb-3 text-sm">
                            {job.location && (
                              <div className="flex items-center gap-1 text-gray-400">
                                <MapPin className="w-4 h-4" />
                                {job.location}
                              </div>
                            )}
                            {job.remote_allowed && (
                              <Badge className="bg-green-500/20 text-green-300">
                                Remote OK
                              </Badge>
                            )}
                            <div className="flex items-center gap-1 text-green-400 font-medium">
                              <DollarSign className="w-4 h-4" />
                              {job.pay_amount ? `$${job.pay_amount}/${job.pay_type}` : 'Negotiable'}
                            </div>
                            {job.expires_at && (
                              <div className="flex items-center gap-1 text-gray-500 text-xs">
                                <Clock className="w-3 h-3" />
                                Expires {new Date(job.expires_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                if (job.application_url) {
                                  window.open(job.application_url, '_blank');
                                } else if (job.contact_email) {
                                  window.location.href = `mailto:${job.contact_email}`;
                                } else {
                                  toast.info('Contact info not available');
                                }
                              }}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              Apply Now
                            </Button>
                            <Button variant="outline" className="bg-white/5 border-white/20">
                              <Bookmark className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {filteredJobs.length === 0 && (
                <div className="text-center py-12">
                  <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No jobs found</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}