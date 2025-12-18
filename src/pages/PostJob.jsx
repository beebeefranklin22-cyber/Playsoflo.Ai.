import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, ChevronLeft, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function PostJob() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [requirementInput, setRequirementInput] = useState("");

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const [jobForm, setJobForm] = useState({
    title: "",
    company_name: "",
    job_type: "gig",
    category: "other",
    description: "",
    requirements: [],
    pay_type: "hourly",
    pay_amount: 0,
    pay_currency: "USD",
    location: "",
    remote_allowed: false,
    poster_email: "",
    contact_email: "",
    application_url: "",
    expires_at: ""
  });

  const createJobMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Job.create({
        ...data,
        poster_email: currentUser.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('✅ Job posted successfully!');
      navigate(createPageUrl("UniverseHub") + "?tab=jobs");
    }
  });

  const addRequirement = () => {
    if (requirementInput.trim()) {
      setJobForm({
        ...jobForm,
        requirements: [...jobForm.requirements, requirementInput.trim()]
      });
      setRequirementInput("");
    }
  };

  const removeRequirement = (index) => {
    setJobForm({
      ...jobForm,
      requirements: jobForm.requirements.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-16 z-30 glass-effect border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Post a Job or Gig</h1>
            <p className="text-gray-400 text-sm">Find the perfect candidate</p>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-3xl mx-auto">
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Job Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                placeholder="Job Title *"
                value={jobForm.title}
                onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
              <Input
                placeholder="Company Name"
                value={jobForm.company_name}
                onChange={(e) => setJobForm({ ...jobForm, company_name: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Select value={jobForm.job_type} onValueChange={(v) => setJobForm({ ...jobForm, job_type: v })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Job Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="gig">Gig</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>

              <Select value={jobForm.category} onValueChange={(v) => setJobForm({ ...jobForm, category: v })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tech">Tech</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="customer_service">Customer Service</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="hospitality">Hospitality</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Textarea
              placeholder="Job Description *"
              value={jobForm.description}
              onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
              rows={6}
              className="bg-white/10 border-white/20 text-white"
            />

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Requirements</label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Add a requirement..."
                  value={requirementInput}
                  onChange={(e) => setRequirementInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addRequirement()}
                  className="bg-white/10 border-white/20 text-white"
                />
                <Button onClick={addRequirement} variant="outline" className="bg-white/5 border-white/20">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {jobForm.requirements.map((req, idx) => (
                  <div key={idx} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm flex items-center gap-2">
                    {req}
                    <button onClick={() => removeRequirement(idx)}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Select value={jobForm.pay_type} onValueChange={(v) => setJobForm({ ...jobForm, pay_type: v })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Pay Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="fixed">Fixed Price</SelectItem>
                  <SelectItem value="commission">Commission</SelectItem>
                  <SelectItem value="negotiable">Negotiable</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="Pay Amount"
                value={jobForm.pay_amount}
                onChange={(e) => setJobForm({ ...jobForm, pay_amount: Number(e.target.value) })}
                className="bg-white/10 border-white/20 text-white"
              />

              <Select value={jobForm.pay_currency} onValueChange={(v) => setJobForm({ ...jobForm, pay_currency: v })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="SoFloCoin">SoFloCoin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                placeholder="Location (or 'Remote')"
                value={jobForm.location}
                onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
              <Input
                type="date"
                placeholder="Expires At"
                value={jobForm.expires_at}
                onChange={(e) => setJobForm({ ...jobForm, expires_at: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={jobForm.remote_allowed}
                onChange={(e) => setJobForm({ ...jobForm, remote_allowed: e.target.checked })}
                className="w-5 h-5 rounded accent-purple-500"
              />
              <label className="text-white">Remote work allowed</label>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                placeholder="Contact Email *"
                type="email"
                value={jobForm.contact_email}
                onChange={(e) => setJobForm({ ...jobForm, contact_email: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
              <Input
                placeholder="Application URL (optional)"
                value={jobForm.application_url}
                onChange={(e) => setJobForm({ ...jobForm, application_url: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <Button
              onClick={() => createJobMutation.mutate(jobForm)}
              disabled={!jobForm.title || !jobForm.description || !jobForm.contact_email || createJobMutation.isLoading}
              className="w-full py-6 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-lg font-bold"
            >
              {createJobMutation.isLoading ? 'Posting...' : 'Post Job'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}