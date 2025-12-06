import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, HandshakeIcon, Package, CheckCircle, XCircle, 
  Clock, TrendingUp, DollarSign, Calendar, Sparkles
} from "lucide-react";
import { motion } from "framer-motion";

export default function CollaborationHub() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showProposal, setShowProposal] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: collaborations = [] } = useQuery({
    queryKey: ['collaborations'],
    queryFn: () => base44.entities.Collaboration.list('-created_date'),
    initialData: []
  });

  const { data: allCreators = [] } = useQuery({
    queryKey: ['creators'],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ is_creator: true });
      return users;
    },
    initialData: []
  });

  const [proposalForm, setProposalForm] = useState({
    collaboration_type: "co_host_experience",
    title: "",
    description: "",
    collaborator_email: "",
    revenue_split: {
      initiator_percentage: 50,
      collaborator_percentage: 50
    },
    start_date: "",
    end_date: "",
    terms: ""
  });

  const createProposalMutation = useMutation({
    mutationFn: async (data) => {
      const collaboration = await base44.entities.Collaboration.create({
        ...data,
        initiator_email: currentUser.email
      });

      // Send notification to collaborator
      await base44.entities.Notification.create({
        recipient_email: data.collaborator_email,
        type: "system_alert",
        title: "New Collaboration Proposal",
        message: `${currentUser.full_name || currentUser.email} invited you to collaborate on "${data.title}"`,
        reference_type: "user",
        reference_id: collaboration.id
      });

      return collaboration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborations'] });
      setShowProposal(false);
      setProposalForm({
        collaboration_type: "co_host_experience",
        title: "",
        description: "",
        collaborator_email: "",
        revenue_split: { initiator_percentage: 50, collaborator_percentage: 50 },
        start_date: "",
        end_date: "",
        terms: ""
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Collaboration.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborations'] });
    }
  });

  const myProposals = collaborations.filter(c => c.initiator_email === currentUser?.email);
  const receivedProposals = collaborations.filter(c => c.collaborator_email === currentUser?.email);
  const activeCollaborations = collaborations.filter(c => 
    (c.initiator_email === currentUser?.email || c.collaborator_email === currentUser?.email) && 
    c.status === 'active'
  );

  const statusColors = {
    proposed: "bg-blue-100 text-blue-800",
    accepted: "bg-green-100 text-green-800",
    declined: "bg-red-100 text-red-800",
    active: "bg-purple-100 text-purple-800",
    completed: "bg-gray-100 text-gray-800",
    cancelled: "bg-orange-100 text-orange-800"
  };

  const statusIcons = {
    proposed: Clock,
    accepted: CheckCircle,
    declined: XCircle,
    active: TrendingUp,
    completed: CheckCircle,
    cancelled: XCircle
  };

  const collaborationTypeLabels = {
    co_host_experience: "Co-Host Experience",
    bundled_offer: "Bundled Offer",
    content_creation: "Content Creation",
    shoutout: "Shoutout/Feature",
    cross_promotion: "Cross Promotion",
    joint_event: "Joint Event"
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <HandshakeIcon className="w-10 h-10 text-purple-400" />
              Collaboration Hub
            </h1>
            <p className="text-gray-300 text-lg">Connect and create with other creators</p>
          </div>
          <Button
            onClick={() => setShowProposal(!showProposal)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Propose Collaboration
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <HandshakeIcon className="w-8 h-8 text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {activeCollaborations.length}
              </div>
              <div className="text-gray-400 text-sm">Active Collaborations</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {myProposals.length}
              </div>
              <div className="text-gray-400 text-sm">Sent Proposals</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {receivedProposals.filter(p => p.status === 'proposed').length}
              </div>
              <div className="text-gray-400 text-sm">Pending Invites</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-8 h-8 text-yellow-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {collaborations.filter(c => c.status === 'completed').length}
              </div>
              <div className="text-gray-400 text-sm">Completed</div>
            </CardContent>
          </Card>
        </div>

        {/* Proposal Form */}
        {showProposal && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="bg-white/5 border-white/10 mb-8">
              <CardHeader>
                <CardTitle className="text-white">Propose New Collaboration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Collaboration Type</label>
                    <Select 
                      value={proposalForm.collaboration_type} 
                      onValueChange={(v) => setProposalForm({...proposalForm, collaboration_type: v})}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(collaborationTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Collaborator Email</label>
                    <Input
                      placeholder="creator@example.com"
                      value={proposalForm.collaborator_email}
                      onChange={(e) => setProposalForm({...proposalForm, collaborator_email: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <Input
                  placeholder="Collaboration Title"
                  value={proposalForm.title}
                  onChange={(e) => setProposalForm({...proposalForm, title: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />

                <textarea
                  placeholder="Describe your collaboration idea..."
                  value={proposalForm.description}
                  onChange={(e) => setProposalForm({...proposalForm, description: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Your Revenue Share (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={proposalForm.revenue_split.initiator_percentage}
                      onChange={(e) => setProposalForm({
                        ...proposalForm, 
                        revenue_split: {
                          initiator_percentage: Number(e.target.value),
                          collaborator_percentage: 100 - Number(e.target.value)
                        }
                      })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Their Revenue Share (%)</label>
                    <Input
                      type="number"
                      value={proposalForm.revenue_split.collaborator_percentage}
                      disabled
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Start Date</label>
                    <Input
                      type="date"
                      value={proposalForm.start_date}
                      onChange={(e) => setProposalForm({...proposalForm, start_date: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">End Date (Optional)</label>
                    <Input
                      type="date"
                      value={proposalForm.end_date}
                      onChange={(e) => setProposalForm({...proposalForm, end_date: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <textarea
                  placeholder="Terms & conditions (optional)"
                  value={proposalForm.terms}
                  onChange={(e) => setProposalForm({...proposalForm, terms: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowProposal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createProposalMutation.mutate(proposalForm)}
                    disabled={!proposalForm.title || !proposalForm.collaborator_email || createProposalMutation.isLoading}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    Send Proposal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="received" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/10 backdrop-blur-xl border border-white/20">
            <TabsTrigger value="received">Received</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
          </TabsList>

          {/* Received Proposals */}
          <TabsContent value="received" className="space-y-4">
            {receivedProposals.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No proposals yet</h3>
                  <p className="text-gray-400">When creators invite you to collaborate, they'll appear here</p>
                </CardContent>
              </Card>
            ) : (
              receivedProposals.map((collab) => {
                const StatusIcon = statusIcons[collab.status];
                return (
                  <Card key={collab.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                            <HandshakeIcon className="w-6 h-6 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold text-lg mb-1">{collab.title}</h3>
                            <p className="text-gray-400 text-sm mb-2">From: {collab.initiator_email}</p>
                            <Badge className="capitalize">
                              {collaborationTypeLabels[collab.collaboration_type]}
                            </Badge>
                          </div>
                        </div>
                        <Badge className={statusColors[collab.status]}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {collab.status}
                        </Badge>
                      </div>

                      <p className="text-gray-300 mb-4">{collab.description}</p>

                      {collab.revenue_split && (
                        <div className="flex items-center gap-4 mb-4 p-3 bg-white/5 rounded-xl">
                          <DollarSign className="w-5 h-5 text-green-400" />
                          <div className="text-sm text-gray-300">
                            Revenue Split: You get {collab.revenue_split.collaborator_percentage}% / 
                            They get {collab.revenue_split.initiator_percentage}%
                          </div>
                        </div>
                      )}

                      {collab.status === 'proposed' && (
                        <div className="flex gap-3 mt-4">
                          <Button
                            onClick={() => updateStatusMutation.mutate({ id: collab.id, status: 'accepted' })}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accept
                          </Button>
                          <Button
                            onClick={() => updateStatusMutation.mutate({ id: collab.id, status: 'declined' })}
                            variant="outline"
                            className="flex-1"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Decline
                          </Button>
                        </div>
                      )}

                      {collab.status === 'accepted' && (
                        <Button
                          onClick={() => updateStatusMutation.mutate({ id: collab.id, status: 'active' })}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                          Start Collaboration
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Sent Proposals */}
          <TabsContent value="sent" className="space-y-4">
            {myProposals.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No proposals sent</h3>
                  <p className="text-gray-400">Start collaborating by proposing your first collaboration</p>
                </CardContent>
              </Card>
            ) : (
              myProposals.map((collab) => {
                const StatusIcon = statusIcons[collab.status];
                return (
                  <Card key={collab.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-white font-semibold text-lg mb-1">{collab.title}</h3>
                          <p className="text-gray-400 text-sm mb-2">To: {collab.collaborator_email}</p>
                          <Badge className="capitalize">
                            {collaborationTypeLabels[collab.collaboration_type]}
                          </Badge>
                        </div>
                        <Badge className={statusColors[collab.status]}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {collab.status}
                        </Badge>
                      </div>

                      <p className="text-gray-300 mb-4">{collab.description}</p>

                      <div className="text-sm text-gray-400">
                        Sent {new Date(collab.created_date).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Active Collaborations */}
          <TabsContent value="active" className="space-y-4">
            {activeCollaborations.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No active collaborations</h3>
                  <p className="text-gray-400">Accept proposals to start collaborating</p>
                </CardContent>
              </Card>
            ) : (
              activeCollaborations.map((collab) => (
                <Card key={collab.id} className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-white font-semibold text-lg mb-1">{collab.title}</h3>
                        <p className="text-gray-300 text-sm mb-2">
                          {collab.initiator_email === currentUser?.email 
                            ? `With: ${collab.collaborator_email}`
                            : `With: ${collab.initiator_email}`}
                        </p>
                        <Badge className="bg-purple-500/30 text-purple-200">
                          {collaborationTypeLabels[collab.collaboration_type]}
                        </Badge>
                      </div>
                      <Badge className="bg-green-500/30 text-green-200">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>

                    <p className="text-gray-300 mb-4">{collab.description}</p>

                    {collab.start_date && (
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
                        <Calendar className="w-4 h-4" />
                        Started: {new Date(collab.start_date).toLocaleDateString()}
                        {collab.end_date && ` • Ends: ${new Date(collab.end_date).toLocaleDateString()}`}
                      </div>
                    )}

                    <Button
                      onClick={() => updateStatusMutation.mutate({ id: collab.id, status: 'completed' })}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Completed
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}