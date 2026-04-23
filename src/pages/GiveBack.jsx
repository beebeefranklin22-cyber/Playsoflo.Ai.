import React, { useState, useEffect } from "react";
import PageWrapper from "@/components/PageWrapper";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Heart, Target, TrendingUp, Users, Building, Briefcase, Home as HomeIcon, Utensils, Activity, BookOpen, AlertCircle, Leaf, Plus, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import CreateCauseModal from "@/components/giveback/CreateCauseModal";
import CauseDetailModal from "@/components/giveback/CauseDetailModal";

const causeCategories = [
  { id: "all", label: "All Causes", icon: Heart },
  
  // Individual & Family Support
  { id: "single_mothers", label: "Single Mothers", icon: Heart },
  { id: "families_in_need", label: "Families in Need", icon: Users },
  { id: "homeless_support", label: "Homeless Support", icon: HomeIcon },
  { id: "veterans_support", label: "Veterans Support", icon: Target },
  
  // Organizations
  { id: "charities", label: "Charities", icon: Target },
  { id: "churches", label: "Churches & Faith", icon: Building },
  { id: "food_banks", label: "Food Banks", icon: Utensils },
  
  // Healthcare & Wellness
  { id: "rehab_shelter", label: "Rehab & Shelter", icon: HomeIcon },
  { id: "senior_care", label: "Senior Care", icon: Users },
  { id: "community_health", label: "Community Health", icon: Activity },
  
  // Community Development
  { id: "community_projects", label: "Community Projects", icon: HomeIcon },
  { id: "restoration_services", label: "Restoration Services", icon: Briefcase },
  { id: "infrastructure", label: "Infrastructure", icon: Building },
  { id: "community_assets", label: "Community Assets", icon: TrendingUp },
  
  // Economic & Educational
  { id: "job_creation", label: "Job Creation", icon: Briefcase },
  { id: "education_scholarships", label: "Education & Scholarships", icon: BookOpen },
  { id: "youth_programs", label: "Youth Programs", icon: Users },
  
  // Emergency & Long-term
  { id: "disaster_relief", label: "Disaster Relief", icon: AlertCircle },
  { id: "humanitarian_aid", label: "Humanitarian Aid", icon: Heart },
  { id: "environmental_conservation", label: "Environment", icon: Leaf },
];

export default function GiveBack() {
  const qc = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCause, setSelectedCause] = useState(null);
  const [editingCause, setEditingCause] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: causes = [] } = useQuery({
    queryKey: ["donations"],
    queryFn: () => base44.entities.Donation.list().catch(() => []),
    initialData: [],
    retry: 1
  });

  const filteredCauses = selectedCategory === "all"
    ? causes
    : causes.filter(c => c.cause_type === selectedCategory);

  return (
    <PageWrapper>
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-950 to-emerald-950">
      <div className="relative h-64 flex items-end">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/50 to-transparent" />
        <div className="relative z-10 w-full px-6 pb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Give Back
          </h1>
          <p className="text-gray-300 text-lg mb-4">
            Support causes that matter. Every contribution makes a difference.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-full text-white font-semibold transition"
          >
            <Plus className="w-5 h-5" />
            Create a Cause
          </button>
        </div>
      </div>

      {/* Enhanced Impact Stats */}
      <div className="px-6 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-1">
                {causes.length}
              </div>
              <div className="text-gray-400 text-sm">Active Causes</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-1">
                ${causes.reduce((sum, c) => sum + (c.raised_usd || 0), 0).toLocaleString()}
              </div>
              <div className="text-gray-400 text-sm">Total Raised</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-1">
                {causes.reduce((sum, c) => sum + (c.beneficiary_count || 0), 0).toLocaleString()}
              </div>
              <div className="text-gray-400 text-sm">Lives Impacted</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-1">
                {causes.filter(c => c.community_owned).length}
              </div>
              <div className="text-gray-400 text-sm">Community Owned</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mission Statement */}
      <div className="px-6 mb-8">
        <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Heart className="w-12 h-12 text-emerald-400 flex-shrink-0" />
              <div>
                <h3 className="text-white font-bold text-xl mb-2">Our Mission</h3>
                <p className="text-gray-300 mb-3">
                  Building stronger communities through direct support, infrastructure development, and sustainable initiatives. 
                  Every contribution creates lasting impact for families, organizations, and community resources.
                </p>
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Building className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-semibold text-sm">Infrastructure</span>
                    </div>
                    <p className="text-gray-400 text-xs">
                      Building community assets and essential services
                    </p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Briefcase className="w-4 h-4 text-green-400" />
                      <span className="text-white font-semibold text-sm">Job Creation</span>
                    </div>
                    <p className="text-gray-400 text-xs">
                      Creating employment and economic opportunities
                    </p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                      <span className="text-white font-semibold text-sm">Community Assets</span>
                    </div>
                    <p className="text-gray-400 text-xs">
                      Fractional ownership for collective benefit
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Filters */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 overflow-x-auto pb-4 hide-scrollbar">
          {causeCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-full font-medium transition ${
                selectedCategory === cat.id
                  ? "bg-emerald-500 text-white"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Causes Grid */}
      <div className="px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredCauses.map((cause, idx) => {
              const progress = cause.goal_usd ? (cause.raised_usd / cause.goal_usd) * 100 : 0;
              
              return (
                <motion.div
                  key={cause.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer h-full" onClick={() => setSelectedCause(cause)}>
                    <CardContent className="p-6">
                      {cause.image_url && (
                        <img
                          src={cause.image_url}
                          alt={cause.title}
                          className="w-full h-48 object-cover rounded-xl mb-4"
                        />
                      )}
                      
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold capitalize">
                          {cause.cause_type?.replace(/_/g, " ")}
                        </span>
                        {cause.community_owned && (
                          <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-semibold flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Community Owned
                          </span>
                        )}
                        {cause.long_term_initiative && (
                          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold">
                            Ongoing
                          </span>
                        )}
                      </div>

                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-bold text-white flex-1">
                          {cause.title}
                        </h3>
                        {currentUser && (currentUser.email === cause.creator_email || currentUser.role === "admin") && (
                          <button
                            onClick={e => { e.stopPropagation(); setEditingCause(cause); }}
                            className="ml-2 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition flex-shrink-0"
                          >
                            <Pencil className="w-4 h-4 text-gray-300" />
                          </button>
                        )}
                      </div>

                      <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                        {cause.description}
                      </p>

                      {cause.beneficiary_count > 0 && (
                        <div className="mb-3 p-3 bg-white/5 rounded-xl">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="w-4 h-4 text-emerald-400" />
                            <span className="text-white font-semibold">
                              {cause.beneficiary_count.toLocaleString()} people helped
                            </span>
                          </div>
                        </div>
                      )}

                      {cause.goal_usd && (
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-400">
                              ${cause.raised_usd?.toLocaleString() || 0} raised
                            </span>
                            <span className="text-emerald-400 font-semibold">
                              ${cause.goal_usd.toLocaleString()} goal
                            </span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={e => { e.stopPropagation(); setSelectedCause(cause); }}>
                        <Heart className="w-4 h-4 mr-2" />
                        Support This Cause
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredCauses.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No causes found</h3>
            <p className="text-gray-400 mb-6">
              {selectedCategory === "all" ? "Be the first to create a cause!" : "No causes in this category yet."}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-full text-white font-semibold transition"
            >
              Create a Cause
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <CreateCauseModal onClose={() => setShowCreateModal(false)} />
        )}
        {editingCause && (
          <CreateCauseModal editCause={editingCause} onClose={() => setEditingCause(null)} />
        )}
        {selectedCause && (
          <CauseDetailModal
            cause={selectedCause}
            onClose={() => setSelectedCause(null)}
            onEdit={() => { setEditingCause(selectedCause); setSelectedCause(null); }}
          />
        )}
      </AnimatePresence>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
    </PageWrapper>
  );
}