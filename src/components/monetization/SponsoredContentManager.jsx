import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Briefcase, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function SponsoredContentManager({ currentUser }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    brand_name: "",
    brand_contact_email: "",
    content_type: "video",
    deal_amount: 0,
    deal_terms: "",
    deliverables: [],
    start_date: "",
    end_date: ""
  });

  const { data: sponsorships = [] } = useQuery({
    queryKey: ['sponsorships', currentUser?.email],
    queryFn: () => base44.entities.SponsoredContent.filter({ creator_email: currentUser.email }),
    enabled: !!currentUser
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SponsoredContent.create({ 
      ...data, 
      creator_email: currentUser.email,
      status: "active"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['sponsorships']);
      toast.success('Sponsorship added!');
      setShowModal(false);
    }
  });

  const totalEarnings = sponsorships.reduce((sum, s) => sum + (s.deal_amount || 0), 0);
  const activeDeals = sponsorships.filter(s => s.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Brand Collaborations</h2>
        <Button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          New Deal
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-indigo-400" />
              <div>
                <div className="text-gray-400 text-sm">Active Deals</div>
                <div className="text-white text-2xl font-bold">{activeDeals}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-emerald-400" />
              <div>
                <div className="text-gray-400 text-sm">Total Earnings</div>
                <div className="text-white text-2xl font-bold">${totalEarnings.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 border-pink-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-pink-400" />
              <div>
                <div className="text-gray-400 text-sm">Completed</div>
                <div className="text-white text-2xl font-bold">
                  {sponsorships.filter(s => s.status === "completed").length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {sponsorships.map(deal => (
          <Card key={deal.id} className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-bold text-lg">{deal.brand_name}</h3>
                    <Badge className={
                      deal.status === "active" ? "bg-green-500/20 text-green-300" :
                      deal.status === "completed" ? "bg-blue-500/20 text-blue-300" :
                      "bg-yellow-500/20 text-yellow-300"
                    }>
                      {deal.status}
                    </Badge>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <div className="text-gray-400 text-sm">Deal Amount</div>
                      <div className="text-white font-bold text-xl">${deal.deal_amount.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm">Content Type</div>
                      <div className="text-white">{deal.content_type}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm">Duration</div>
                      <div className="text-white">
                        {new Date(deal.start_date).toLocaleDateString()} - {new Date(deal.end_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm">Contact</div>
                      <div className="text-white text-sm">{deal.brand_contact_email}</div>
                    </div>
                  </div>

                  {deal.deliverables?.length > 0 && (
                    <div className="mt-4">
                      <div className="text-gray-400 text-sm mb-2">Deliverables</div>
                      <div className="flex flex-wrap gap-2">
                        {deal.deliverables.map((item, idx) => (
                          <Badge key={idx} className="bg-indigo-500/20 text-indigo-300">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-gray-900 rounded-3xl p-6"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Add Brand Deal</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Brand Name"
                    value={form.brand_name}
                    onChange={(e) => setForm({...form, brand_name: e.target.value})}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <Input
                    placeholder="Brand Contact Email"
                    value={form.brand_contact_email}
                    onChange={(e) => setForm({...form, brand_contact_email: e.target.value})}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={form.content_type}
                    onChange={(e) => setForm({...form, content_type: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="video">Video</option>
                    <option value="livestream">Livestream</option>
                    <option value="post">Post</option>
                    <option value="story">Story</option>
                    <option value="series">Series</option>
                  </select>
                  <Input
                    type="number"
                    placeholder="Deal Amount ($)"
                    value={form.deal_amount}
                    onChange={(e) => setForm({...form, deal_amount: Number(e.target.value)})}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <Textarea
                  placeholder="Deal Terms & Agreement"
                  value={form.deal_terms}
                  onChange={(e) => setForm({...form, deal_terms: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Start Date</label>
                    <Input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({...form, start_date: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">End Date</label>
                    <Input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm({...form, end_date: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => createMutation.mutate(form)} 
                    disabled={!form.brand_name || !form.deal_amount}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  >
                    Add Deal
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}