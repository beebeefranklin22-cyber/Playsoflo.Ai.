import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, ChevronLeft, MapPin, DollarSign, ExternalLink, Trash2, Briefcase, ClipboardList } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function SavedJobs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: savedJobs = [], isLoading } = useQuery({
    queryKey: ['saved-jobs', currentUser?.email],
    queryFn: () => base44.entities.SavedJob.filter({ user_email: currentUser.email }, '-created_date'),
    enabled: !!currentUser,
    initialData: []
  });

  const removeMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedJob.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['saved-jobs']);
      toast.success('Removed from saved jobs');
    }
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Please sign in to view saved jobs.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 pb-20">
      {/* Header */}
      <div className="sticky top-16 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(createPageUrl("CommunityJobs"))} className="p-2 hover:bg-white/10 rounded-full">
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Bookmark className="w-6 h-6 text-yellow-400" />
                Saved Jobs
              </h1>
              <p className="text-gray-400 text-sm">{savedJobs.length} saved</p>
            </div>
          </div>
          <Button
            onClick={() => navigate(createPageUrl("ApplicationTracker"))}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            My Applications
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : savedJobs.length === 0 ? (
          <div className="text-center py-20">
            <Bookmark className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No saved jobs yet</h3>
            <p className="text-gray-400 mb-6">Bookmark jobs from the listings to save them here.</p>
            <Button onClick={() => navigate(createPageUrl("CommunityJobs"))} className="bg-purple-600">
              Browse Jobs
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <AnimatePresence>
              {savedJobs.map((saved, idx) => (
                <motion.div key={saved.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.04 }}>
                  <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition h-full">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <img src={saved.poster_photo || "https://via.placeholder.com/40"} className="w-10 h-10 rounded-full object-cover" />
                          <div>
                            <p className="text-white font-semibold">{saved.company_name || "—"}</p>
                            <p className="text-gray-400 text-xs">Saved {new Date(saved.created_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button onClick={() => removeMutation.mutate(saved.id)} className="p-2 hover:bg-red-500/20 rounded-full transition">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>

                      <h3 className="text-lg font-bold text-white mb-2">{saved.job_title}</h3>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {saved.job_type && <Badge className="bg-purple-500/20 text-purple-400">{saved.job_type.replace('_', ' ')}</Badge>}
                        {saved.job_category && <Badge className="bg-blue-500/20 text-blue-400">{saved.job_category}</Badge>}
                      </div>

                      {saved.job_location && (
                        <p className="text-gray-400 text-sm flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4" />{saved.job_location}
                        </p>
                      )}
                      {saved.pay_rate && (
                        <p className="text-gray-400 text-sm flex items-center gap-2 mb-4">
                          <DollarSign className="w-4 h-4" />{saved.pay_rate} {saved.pay_type ? `(${saved.pay_type})` : ""}
                        </p>
                      )}

                      <div className="flex gap-2 pt-4 border-t border-white/10">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-white/20 text-white"
                          onClick={() => navigate(createPageUrl("CommunityJobs"))}
                        >
                          <Briefcase className="w-4 h-4 mr-2" />
                          View Listing
                        </Button>
                        {saved.application_url && (
                          <Button asChild size="sm" className="flex-1 bg-purple-600">
                            <a href={saved.application_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Apply
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}