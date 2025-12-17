import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, Search, Filter, Clock, CheckCircle,
  AlertCircle, User, MessageCircle, Package, DollarSign, Car
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { toast } from "sonner";
import AgentChatInterface from "../components/support/AgentChatInterface";

export default function SupportDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    base44.auth.me().then((user) => {
      if (user.role !== 'admin') {
        toast.error('Access denied - Admin only');
        navigate(createPageUrl('Home'));
        return;
      }
      setCurrentUser(user);
    }).catch(() => navigate(createPageUrl('Home')));
  }, []);

  const { data: tickets = [] } = useQuery({
    queryKey: ['all-support-tickets', filterStatus],
    queryFn: async () => {
      const query = filterStatus === 'all' 
        ? {} 
        : { status: filterStatus };
      
      const tickets = await base44.entities.SupportTicket.list('-created_date');
      return tickets.filter(t => {
        if (filterStatus !== 'all' && t.status !== filterStatus) return false;
        if (searchQuery && !t.subject.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !t.user_email.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        return true;
      });
    },
    enabled: !!currentUser,
    refetchInterval: 5000
  });

  const assignTicketMutation = useMutation({
    mutationFn: async (ticketId) => {
      return await base44.entities.SupportTicket.update(ticketId, {
        assigned_agent_email: currentUser.email,
        status: 'assigned'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-support-tickets'] });
      toast.success('Ticket assigned to you');
    }
  });

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-blue-500/20 text-blue-400',
      ai_handling: 'bg-purple-500/20 text-purple-400',
      escalated: 'bg-yellow-500/20 text-yellow-400',
      assigned: 'bg-cyan-500/20 text-cyan-400',
      resolved: 'bg-green-500/20 text-green-400',
      closed: 'bg-gray-500/20 text-gray-400'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-blue-500/20 text-blue-400',
      medium: 'bg-yellow-500/20 text-yellow-400',
      high: 'bg-orange-500/20 text-orange-400',
      urgent: 'bg-red-500/20 text-red-400'
    };
    return colors[priority] || 'bg-gray-500/20';
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 pb-24">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate(createPageUrl("Home"))}
            className="flex items-center gap-2 text-white mb-4 hover:opacity-80 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Support Dashboard</h1>
              <p className="text-purple-100">Manage customer support tickets</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Open Tickets</p>
                  <p className="text-white text-2xl font-bold">
                    {tickets.filter(t => t.status === 'open').length}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">AI Handling</p>
                  <p className="text-white text-2xl font-bold">
                    {tickets.filter(t => t.status === 'ai_handling').length}
                  </p>
                </div>
                <MessageCircle className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Assigned</p>
                  <p className="text-white text-2xl font-bold">
                    {tickets.filter(t => t.status === 'assigned').length}
                  </p>
                </div>
                <User className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Resolved</p>
                  <p className="text-white text-2xl font-bold">
                    {tickets.filter(t => t.status === 'resolved').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <Input
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-white/10 border-white/20 text-white"
          />
          {['all', 'open', 'escalated', 'assigned', 'resolved'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === status
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {status.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Tickets List */}
        <div className="grid lg:grid-cols-2 gap-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="bg-white/10 border-white/20 hover:bg-white/15 transition cursor-pointer">
              <CardContent className="p-6" onClick={() => setSelectedTicket(ticket)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-white font-bold mb-1">{ticket.subject}</h3>
                    <p className="text-gray-400 text-sm">#{ticket.ticket_number?.substring(0, 8)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                    <Badge className={getPriorityColor(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <User className="w-4 h-4" />
                    {ticket.user_email}
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Clock className="w-4 h-4" />
                    {new Date(ticket.created_date).toLocaleString()}
                  </div>
                  {ticket.user_context && (
                    <div className="flex gap-2 mt-2">
                      {ticket.user_context.active_rentals?.length > 0 && (
                        <Badge className="bg-blue-500/20 text-blue-300">
                          <Car className="w-3 h-3 mr-1" />
                          {ticket.user_context.active_rentals.length} Rentals
                        </Badge>
                      )}
                      {ticket.user_context.active_deliveries?.length > 0 && (
                        <Badge className="bg-green-500/20 text-green-300">
                          <Package className="w-3 h-3 mr-1" />
                          {ticket.user_context.active_deliveries.length} Deliveries
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {!ticket.assigned_agent_email && ticket.status !== 'resolved' && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      assignTicketMutation.mutate(ticket.id);
                    }}
                    className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
                  >
                    Assign to Me
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {selectedTicket && (
        <AgentChatInterface
          ticket={selectedTicket}
          currentUser={currentUser}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
}