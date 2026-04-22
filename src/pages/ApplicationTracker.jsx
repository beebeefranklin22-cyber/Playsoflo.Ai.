import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  ClipboardList, ChevronLeft, MapPin, DollarSign, Briefcase,
  CheckCircle2, MessageSquare, Trophy, XCircle, MinusCircle, Pencil, Trash2, Bookmark
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const STATUS_CONFIG = {
  applied: { label: "Applied", color: "bg-blue-500/20 text-blue-400", border: "border-blue-500/30", icon: Briefcase, dot: "bg-blue-400" },
  interviewing: { label: "Interviewing", color: "bg-yellow-500/20 text-yellow-400", border: "border-yellow-500/30", icon: MessageSquare, dot: "bg-yellow-400" },
  offer_received: { label: "Offer Received", color: "bg-green-500/20 text-green-400", border: "border-green-500/30", icon: Trophy, dot: "bg-green-400" },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-400", border: "border-red-500/30", icon: XCircle, dot: "bg-red-400" },
  withdrawn: { label: "Withdrawn", color: "bg-gray-500/20 text-gray-400", border: "border-gray-500/30", icon: MinusCircle, dot: "bg-gray-400" }
};

const COLUMNS = ["applied", "interviewing", "offer_received", "rejected", "withdrawn"];

export default function ApplicationTracker() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [editingApp, setEditingApp] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [editForm, setEditForm] = useState({ status: "applied", notes: "", next_step: "" });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['job-applications', currentUser?.email],
    queryFn: () => base44.entities.JobApplication.filter({ user_email: currentUser.email }, '-created_date'),
    enabled: !!currentUser,
    initialData: []
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.JobApplication.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['job-applications']);
      setEditingApp(null);
      toast.success('Application updated!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.JobApplication.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['job-applications']);
      toast.success('Application removed');
    }
  });

  const openEdit = (app) => {
    setEditingApp(app);
    setEditForm({ status: app.status, notes: app.notes || "", next_step: app.next_step || "" });
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    updateMutation.mutate({ id: editingApp.id, data: editForm });
  };

  const filtered = filterStatus === "all" ? applications : applications.filter(a => a.status === filterStatus);

  // Stats
  const stats = COLUMNS.map(s => ({ key: s, count: applications.filter(a => a.status === s).length, ...STATUS_CONFIG[s] }));

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Please sign in to view your applications.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 pb-20">
      {/* Header */}
      <div className="sticky top-16 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(createPageUrl("CommunityJobs"))} className="p-2 hover:bg-white/10 rounded-full">
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-purple-400" />
                Application Tracker
              </h1>
              <p className="text-gray-400 text-sm">{applications.length} total applications</p>
            </div>
          </div>
          <Button onClick={() => navigate(createPageUrl("SavedJobs"))} variant="outline" className="border-white/20 text-white">
            <Bookmark className="w-4 h-4 mr-2" />
            Saved Jobs
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {stats.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => setFilterStatus(filterStatus === s.key ? "all" : s.key)}
                className={`rounded-xl border p-4 text-left transition ${s.border} ${filterStatus === s.key ? s.color : "bg-white/5 border-white/10 hover:bg-white/10"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <Icon className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-white">{s.count}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {COLUMNS.map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-gray-400 text-sm">{filtered.length} applications</p>
        </div>

        {/* Applications list */}
        {isLoading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <ClipboardList className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No applications yet</h3>
            <p className="text-gray-400 mb-6">Apply to jobs from the listings and they'll appear here.</p>
            <Button onClick={() => navigate(createPageUrl("CommunityJobs"))} className="bg-purple-600">Browse Jobs</Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <AnimatePresence>
              {filtered.map((app, idx) => {
                const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.applied;
                const Icon = cfg.icon;
                return (
                  <motion.div key={app.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.04 }}>
                    <Card className={`bg-white/5 border hover:bg-white/10 transition h-full ${cfg.border}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <img src={app.poster_photo || "https://via.placeholder.com/40"} className="w-10 h-10 rounded-full object-cover" />
                            <div>
                              <p className="text-white font-semibold">{app.company_name || "—"}</p>
                              <p className="text-gray-400 text-xs">Applied {app.applied_date ? new Date(app.applied_date).toLocaleDateString() : new Date(app.created_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(app)} className="p-1.5 hover:bg-white/10 rounded-full transition">
                              <Pencil className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                            <button onClick={() => deleteMutation.mutate(app.id)} className="p-1.5 hover:bg-red-500/20 rounded-full transition">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-base font-bold text-white mb-2">{app.job_title}</h3>

                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge className={cfg.color}>
                            <Icon className="w-3 h-3 mr-1" />{cfg.label}
                          </Badge>
                          {app.job_type && <Badge className="bg-white/10 text-gray-300">{app.job_type.replace('_', ' ')}</Badge>}
                        </div>

                        {app.job_location && (
                          <p className="text-gray-400 text-xs flex items-center gap-1 mb-1">
                            <MapPin className="w-3 h-3" />{app.job_location}
                          </p>
                        )}
                        {app.pay_rate && (
                          <p className="text-gray-400 text-xs flex items-center gap-1 mb-2">
                            <DollarSign className="w-3 h-3" />{app.pay_rate}
                          </p>
                        )}
                        {app.notes && <p className="text-gray-400 text-xs bg-white/5 rounded-lg px-3 py-2 mb-2 line-clamp-2">📝 {app.notes}</p>}
                        {app.next_step && <p className="text-purple-300 text-xs">➡ {app.next_step}</p>}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editingApp} onOpenChange={() => setEditingApp(null)}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Update Application</DialogTitle>
          </DialogHeader>
          {editingApp && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Job</p>
                <p className="text-white font-semibold">{editingApp.job_title}</p>
                {editingApp.company_name && <p className="text-gray-400 text-sm">{editingApp.company_name}</p>}
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Status</label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Next Step</label>
                <Input value={editForm.next_step} onChange={(e) => setEditForm(p => ({ ...p, next_step: e.target.value }))} placeholder="e.g. Interview on Friday at 2pm" className="bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Notes</label>
                <Textarea value={editForm.notes} onChange={(e) => setEditForm(p => ({ ...p, notes: e.target.value }))} placeholder="Add notes about this application..." rows={3} className="bg-white/10 border-white/20 text-white" />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1 border-white/20" onClick={() => setEditingApp(null)}>Cancel</Button>
                <Button type="submit" className="flex-1 bg-purple-600">Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}