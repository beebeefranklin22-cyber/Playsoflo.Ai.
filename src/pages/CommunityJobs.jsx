import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Briefcase, Plus, MapPin, DollarSign, Clock, Edit2, Trash2,
  ChevronLeft, Phone, Mail, ExternalLink, Send, MessageCircle, Image as ImageIcon, Loader2, X, Upload,
  Bookmark, BookmarkCheck, ClipboardList, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function CommunityJobs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [comment, setComment] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [savingJob, setSavingJob] = useState(null);
  const [applyingJob, setApplyingJob] = useState(null);
  const imageInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "gig",
    category: "other",
    company_name: "",
    location: "",
    remote_ok: false,
    pay_rate: "",
    pay_type: "negotiable",
    contact_email: "",
    contact_phone: "",
    application_url: "",
    requirements: "",
    benefits: "",
    images: []
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: savedJobIds = [] } = useQuery({
    queryKey: ['saved-job-ids', currentUser?.email],
    queryFn: async () => {
      const saved = await base44.entities.SavedJob.filter({ user_email: currentUser.email });
      return saved.map(s => s.job_id);
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: appliedJobIds = [] } = useQuery({
    queryKey: ['applied-job-ids', currentUser?.email],
    queryFn: async () => {
      const apps = await base44.entities.JobApplication.filter({ user_email: currentUser.email });
      return apps.map(a => a.job_id);
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['job-listings', filterType, filterCategory],
    queryFn: async () => {
      let filtered = await base44.entities.JobGig.list('-created_date');
      filtered = filtered.filter(j => j.status === 'active');
      if (filterType !== 'all') filtered = filtered.filter(j => j.type === filterType);
      if (filterCategory !== 'all') filtered = filtered.filter(j => j.category === filterCategory);
      return filtered;
    },
    initialData: []
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['job-comments', selectedJob?.id],
    queryFn: async () => {
      if (!selectedJob) return [];
      return await base44.entities.Comment.filter({
        post_id: selectedJob.id,
        post_type: 'job'
      });
    },
    enabled: !!selectedJob,
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const requirements = data.requirements ? data.requirements.split('\n').filter(Boolean) : [];
      const benefits = data.benefits ? data.benefits.split('\n').filter(Boolean) : [];
      
      return await base44.entities.JobGig.create({
        ...data,
        requirements,
        benefits,
        poster_email: currentUser.email,
        poster_name: currentUser.full_name,
        poster_photo: currentUser.profile_picture
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job-listings']);
      setShowCreateModal(false);
      setFormData({
        title: "", description: "", type: "gig", category: "other",
        company_name: "", location: "", remote_ok: false, pay_rate: "",
        pay_type: "negotiable", contact_email: "", contact_phone: "",
        application_url: "", requirements: "", benefits: "", images: []
      });
      toast.success('Job posted!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const requirements = data.requirements ? data.requirements.split('\n').filter(Boolean) : [];
      const benefits = data.benefits ? data.benefits.split('\n').filter(Boolean) : [];
      return await base44.entities.JobGig.update(id, { ...data, requirements, benefits });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job-listings']);
      setEditingJob(null);
      toast.success('Job updated!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.JobGig.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job-listings']);
      setSelectedJob(null);
      toast.success('Job deleted!');
    }
  });

  const commentMutation = useMutation({
    mutationFn: async ({ jobId, content }) => {
      await base44.entities.Comment.create({
        post_id: jobId,
        post_type: 'job',
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        user_photo: currentUser.profile_picture,
        content
      });

      const job = jobs.find(j => j.id === jobId);
      if (job && job.poster_email !== currentUser.email) {
        await base44.entities.Notification.create({
          recipient_email: job.poster_email,
          type: 'new_comment',
          title: 'New comment on your job listing',
          message: `${currentUser.full_name} commented on "${job.title}"`,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          sender_photo: currentUser.profile_picture
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job-comments']);
      setComment("");
      toast.success('Comment posted!');
    }
  });

  const handleMessage = async (posterEmail) => {
    const convs = await base44.entities.ChatConversation.list();
    const existing = convs.find(c => 
      c.participants.includes(currentUser.email) && 
      c.participants.includes(posterEmail)
    );

    if (existing) {
      navigate(createPageUrl("Messages") + `?conv=${existing.id}`);
    } else {
      navigate(createPageUrl("Messages") + `?user=${posterEmail}`);
    }
  };

  const handleSaveJob = async (job) => {
    if (!currentUser) return toast.error('Sign in to save jobs');
    if (savedJobIds.includes(job.id)) return toast.info('Already saved');
    setSavingJob(job.id);
    await base44.entities.SavedJob.create({
      user_email: currentUser.email,
      job_id: job.id,
      job_title: job.title,
      company_name: job.company_name || "",
      job_type: job.type,
      job_category: job.category,
      job_location: job.location || "",
      pay_rate: job.pay_rate || "",
      pay_type: job.pay_type || "",
      poster_photo: job.poster_photo || "",
      application_url: job.application_url || ""
    });
    queryClient.invalidateQueries(['saved-job-ids']);
    setSavingJob(null);
    toast.success('Job saved!');
  };

  const handleMarkApplied = async (job) => {
    if (!currentUser) return toast.error('Sign in to track applications');
    if (appliedJobIds.includes(job.id)) {
      navigate(createPageUrl("ApplicationTracker"));
      return;
    }
    setApplyingJob(job.id);
    await base44.entities.JobApplication.create({
      user_email: currentUser.email,
      job_id: job.id,
      job_title: job.title,
      company_name: job.company_name || "",
      job_type: job.type,
      job_category: job.category,
      job_location: job.location || "",
      pay_rate: job.pay_rate || "",
      status: "applied",
      applied_date: new Date().toISOString().split('T')[0],
      poster_photo: job.poster_photo || ""
    });
    queryClient.invalidateQueries(['applied-job-ids']);
    setApplyingJob(null);
    toast.success('Added to your Application Tracker!');
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingImages(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setFormData(prev => ({ ...prev, images: [...(prev.images || []), ...urls] }));
    setUploadingImages(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingJob) {
      updateMutation.mutate({ id: editingJob.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 pb-20">
      <div className="sticky top-16 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(createPageUrl("CommunityHub"))} className="p-2 hover:bg-white/10 rounded-full">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-6 h-6 text-purple-400" />
                  Jobs & Gigs
                </h1>
                <p className="text-gray-400 text-sm">{jobs.length} active listings</p>
              </div>
            </div>
            {currentUser && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate(createPageUrl("SavedJobs"))} className="border-white/20 text-white hidden sm:flex">
                  <Bookmark className="w-4 h-4 mr-2" />
                  Saved
                </Button>
                <Button variant="outline" onClick={() => navigate(createPageUrl("ApplicationTracker"))} className="border-white/20 text-white hidden sm:flex">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Applications
                </Button>
                <Button onClick={() => setShowCreateModal(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Post Job
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40 bg-white/10 border-white/20">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full_time">Full Time</SelectItem>
                <SelectItem value="part_time">Part Time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="gig">Gig</SelectItem>
                <SelectItem value="freelance">Freelance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40 bg-white/10 border-white/20">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
                <SelectItem value="tech">Tech</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          <AnimatePresence>
            {jobs.map((job, idx) => (
              <motion.div key={job.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <img src={job.poster_photo || "https://via.placeholder.com/40"} className="w-10 h-10 rounded-full" />
                        <div>
                          <p className="text-white font-semibold">{job.company_name || job.poster_name}</p>
                          <p className="text-gray-400 text-xs">{new Date(job.created_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {currentUser?.email === job.poster_email && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingJob(job);
                              setFormData({
                                title: job.title,
                                description: job.description,
                                type: job.type,
                                category: job.category,
                                company_name: job.company_name || "",
                                location: job.location || "",
                                remote_ok: job.remote_ok || false,
                                pay_rate: job.pay_rate || "",
                                pay_type: job.pay_type,
                                contact_email: job.contact_email || "",
                                contact_phone: job.contact_phone || "",
                                application_url: job.application_url || "",
                                requirements: job.requirements?.join('\n') || "",
                                benefits: job.benefits?.join('\n') || "",
                                images: job.images || []
                              });
                              setShowCreateModal(true);
                            }}
                            className="p-2 hover:bg-white/10 rounded-full"
                          >
                            <Edit2 className="w-4 h-4 text-gray-400" />
                          </button>
                          <button onClick={() => deleteMutation.mutate(job.id)} className="p-2 hover:bg-red-500/20 rounded-full">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">{job.title}</h3>
                    <p className="text-gray-300 mb-4 line-clamp-3">{job.description}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge className="bg-purple-500/20 text-purple-400">{job.type.replace('_', ' ')}</Badge>
                      <Badge className="bg-blue-500/20 text-blue-400">{job.category}</Badge>
                      {job.remote_ok && <Badge className="bg-green-500/20 text-green-400">Remote</Badge>}
                    </div>

                    {job.location && (
                      <p className="text-gray-400 text-sm flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </p>
                    )}
                    
                    {job.pay_rate && (
                      <p className="text-gray-400 text-sm flex items-center gap-2 mb-4">
                        <DollarSign className="w-4 h-4" />
                        {job.pay_rate} ({job.pay_type})
                      </p>
                    )}

                    {job.images?.length > 0 && (
                      <div className="flex gap-2 flex-wrap mb-4">
                        {job.images.slice(0, 3).map((url, i) => (
                          <img key={i} src={url} className="w-20 h-20 object-cover rounded-lg border border-white/10" />
                        ))}
                        {job.images.length > 3 && <div className="w-20 h-20 rounded-lg bg-white/10 flex items-center justify-center text-gray-400 text-sm">+{job.images.length - 3}</div>}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-4 border-t border-white/10 flex-wrap">
                      <button onClick={() => setSelectedJob(job)} className="text-gray-400 hover:text-white transition p-1">
                        <MessageCircle className="w-5 h-5" />
                      </button>
                      {currentUser && (
                        <button
                          onClick={() => handleSaveJob(job)}
                          disabled={savingJob === job.id}
                          className="p-1 transition"
                          title={savedJobIds.includes(job.id) ? "Saved" : "Save job"}
                        >
                          {savedJobIds.includes(job.id)
                            ? <BookmarkCheck className="w-5 h-5 text-yellow-400" />
                            : <Bookmark className="w-5 h-5 text-gray-400 hover:text-yellow-400" />}
                        </button>
                      )}
                      {currentUser && currentUser.email !== job.poster_email && (
                        <Button
                          onClick={() => handleMarkApplied(job)}
                          disabled={applyingJob === job.id}
                          variant="outline" size="sm"
                          className={`ml-auto border-white/20 ${appliedJobIds.includes(job.id) ? "text-green-400 border-green-500/40" : "text-white"}`}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          {appliedJobIds.includes(job.id) ? "Applied ✓" : "Mark Applied"}
                        </Button>
                      )}
                      {currentUser && currentUser.email !== job.poster_email && (
                        <Button onClick={() => handleMessage(job.poster_email)} variant="outline" size="sm" className="border-white/20 text-white">
                          <Send className="w-4 h-4 mr-1" />
                          Contact
                        </Button>
                      )}
                      {job.application_url && (
                        <Button asChild variant="default" size="sm" className="bg-purple-600">
                          <a href={job.application_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-1" />
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

        {jobs.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <Briefcase className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No jobs found</h3>
            <p className="text-gray-400">Try different filters or be the first to post!</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal - Similar structure to News */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) setEditingJob(null);
      }}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingJob ? 'Edit' : 'Post'} Job/Gig</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Job Title *" required className="bg-white/10 border-white/20" />
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description *" required rows={4} className="bg-white/10 border-white/20" />
            <div className="grid grid-cols-2 gap-4">
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="bg-white/10 border-white/20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="gig">Gig</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                </SelectContent>
              </Select>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="bg-white/10 border-white/20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="tech">Tech</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} placeholder="Company Name" className="bg-white/10 border-white/20" />
            <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Location" className="bg-white/10 border-white/20" />
            <div className="grid grid-cols-2 gap-4">
              <Input value={formData.pay_rate} onChange={(e) => setFormData({ ...formData, pay_rate: e.target.value })} placeholder="Pay Rate" className="bg-white/10 border-white/20" />
              <Select value={formData.pay_type} onValueChange={(value) => setFormData({ ...formData, pay_type: value })}>
                <SelectTrigger className="bg-white/10 border-white/20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="per_project">Per Project</SelectItem>
                  <SelectItem value="negotiable">Negotiable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} placeholder="Contact Email" type="email" className="bg-white/10 border-white/20" />
            <Input value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} placeholder="Contact Phone" className="bg-white/10 border-white/20" />
            <Input value={formData.application_url} onChange={(e) => setFormData({ ...formData, application_url: e.target.value })} placeholder="Application URL" className="bg-white/10 border-white/20" />

            {/* Image Upload */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Photos (optional)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formData.images || []).map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} className="w-20 h-20 object-cover rounded-lg border border-white/20" />
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, j) => j !== i) }))} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => imageInputRef.current?.click()} className="w-20 h-20 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center hover:border-purple-400 transition">
                  {uploadingImages ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" /> : <><Upload className="w-5 h-5 text-gray-400" /><span className="text-gray-500 text-xs mt-1">Add</span></>}
                </button>
              </div>
              <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1 bg-purple-600">{editingJob ? 'Update' : 'Post'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Comments Modal - Same as News */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Comments</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <img src={c.user_photo || "https://via.placeholder.com/40"} className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <p className="text-white font-semibold">{c.user_name}</p>
                  <p className="text-gray-300 text-sm">{c.content}</p>
                  <p className="text-gray-500 text-xs mt-1">{new Date(c.created_date).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && <p className="text-gray-400 text-center py-8">No comments yet</p>}
            {currentUser && (
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment..." className="bg-white/10 border-white/20" onKeyPress={(e) => e.key === 'Enter' && comment.trim() && commentMutation.mutate({ jobId: selectedJob.id, content: comment })} />
                <Button onClick={() => comment.trim() && commentMutation.mutate({ jobId: selectedJob.id, content: comment })} disabled={!comment.trim()}><Send className="w-4 h-4" /></Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}