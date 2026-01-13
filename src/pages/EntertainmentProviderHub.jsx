import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, Ticket, Calendar, DollarSign, TrendingUp, 
  Users, BarChart3, Scan, Plus, Edit, AlertTriangle
} from "lucide-react";
import ListExperienceModal from "../components/entertainment/ListExperienceModal";
import TicketRedemptionScanner from "../components/entertainment/TicketRedemptionScanner";
import VoidPassModal from "../components/entertainment/VoidPassModal";

export default function EntertainmentProviderHub() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showListModal, setShowListModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [selectedTicketToVoid, setSelectedTicketToVoid] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.log("User not authenticated");
      }
    };
    fetchUser();
  }, []);

  const { data: myExperiences = [] } = useQuery({
    queryKey: ['my-experiences', currentUser?.email],
    queryFn: () => base44.entities.Experience.filter({ provider_email: currentUser.email }),
    enabled: !!currentUser
  });

  const { data: soldTickets = [] } = useQuery({
    queryKey: ['sold-tickets', currentUser?.email],
    queryFn: () => base44.entities.EntertainmentTicket.filter({ provider_email: currentUser.email }),
    enabled: !!currentUser
  });

  const activeTickets = soldTickets.filter(t => t.status === 'active');
  const redeemedTickets = soldTickets.filter(t => t.status === 'redeemed');
  const totalRevenue = soldTickets.reduce((sum, t) => sum + (t.price_paid || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-gray-950 to-blue-950 p-6 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Entertainment Provider Hub</h1>
            <p className="text-gray-400">Manage your experiences and tickets</p>
          </div>
          <Button
            onClick={() => setShowListModal(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Experience
          </Button>
        </div>

        {/* Metrics */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Sparkles className="w-8 h-8 text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">{myExperiences.length}</div>
              <div className="text-purple-300 text-sm">Active Experiences</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">${totalRevenue.toFixed(0)}</div>
              <div className="text-green-300 text-sm">Total Revenue</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Ticket className="w-8 h-8 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">{soldTickets.length}</div>
              <div className="text-blue-300 text-sm">Tickets Sold</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-yellow-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">{activeTickets.length}</div>
              <div className="text-yellow-300 text-sm">Active Tickets</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="experiences" className="space-y-6">
          <TabsList className="bg-white/10 border border-white/20">
            <TabsTrigger value="experiences">My Experiences</TabsTrigger>
            <TabsTrigger value="scanner">Ticket Scanner</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="experiences" className="space-y-4">
            {myExperiences.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No experiences yet</h3>
                  <p className="text-gray-400 mb-6">Create your first entertainment experience to start selling tickets</p>
                  <Button
                    onClick={() => setShowListModal(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Experience
                  </Button>
                </CardContent>
              </Card>
            ) : (
              myExperiences.map((exp) => {
                const expTickets = soldTickets.filter(t => t.experience_id === exp.id);
                const expRevenue = expTickets.reduce((sum, t) => sum + t.price_paid, 0);
                
                return (
                  <Card key={exp.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-6">
                      <div className="flex gap-6">
                        {exp.image_url && (
                          <img src={exp.image_url} className="w-48 h-32 object-cover rounded-lg flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-white font-bold text-xl mb-2">{exp.title}</h3>
                              <Badge className="bg-purple-500/20 text-purple-300 mb-2">
                                {exp.category.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <Button size="sm" variant="outline">
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                          </div>

                          <div className="grid md:grid-cols-3 gap-4 mb-4">
                            <div className="bg-white/5 rounded-lg p-3">
                              <p className="text-gray-400 text-xs">Tickets Sold</p>
                              <p className="text-white font-bold text-lg">{expTickets.length}</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3">
                              <p className="text-gray-400 text-xs">Revenue</p>
                              <p className="text-green-400 font-bold text-lg">${expRevenue.toFixed(0)}</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3">
                              <p className="text-gray-400 text-xs">Upcoming Events</p>
                              <p className="text-white font-bold text-lg">{exp.event_dates?.length || 0}</p>
                            </div>
                          </div>

                          {exp.requires_tickets && exp.ticket_types?.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {exp.ticket_types.map((ticket, idx) => (
                                <div key={idx} className="px-3 py-1 bg-white/10 rounded-full">
                                  <span className="text-white text-xs">{ticket.type}: ${ticket.price}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="scanner">
            <TicketRedemptionScanner currentUser={currentUser} />

            {/* Active Passes Management */}
            <Card className="bg-white/5 border-white/10 mt-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Active Passes Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeTickets.filter(t => t.is_pass).length === 0 ? (
                  <p className="text-gray-400 text-center py-6">No active passes</p>
                ) : (
                  <div className="space-y-2">
                    {activeTickets.filter(t => t.is_pass).map((ticket) => {
                      const experience = myExperiences.find(e => e.id === ticket.experience_id);
                      return (
                        <div key={ticket.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                          <div className="flex-1">
                            <p className="text-white font-semibold">{ticket.buyer_name}</p>
                            <p className="text-gray-400 text-sm">{ticket.ticket_number}</p>
                            <p className="text-purple-400 text-xs">
                              {ticket.pass_type?.replace(/_/g, ' ')} • {ticket.pass_visits_used || 0}/{ticket.pass_visits_allowed} visits
                            </p>
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedTicketToVoid(ticket);
                              setShowVoidModal(true);
                            }}
                            size="sm"
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Void Pass
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Ticket Sales Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-300">Total Sold</span>
                      <span className="text-white font-bold">{soldTickets.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-300">Active</span>
                      <span className="text-green-400 font-bold">{activeTickets.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-300">Redeemed</span>
                      <span className="text-blue-400 font-bold">{redeemedTickets.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-300">Redemption Rate</span>
                      <span className="text-purple-400 font-bold">
                        {soldTickets.length > 0 ? ((redeemedTickets.length / soldTickets.length) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Revenue Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {myExperiences.map((exp) => {
                      const expTickets = soldTickets.filter(t => t.experience_id === exp.id);
                      const expRevenue = expTickets.reduce((sum, t) => sum + t.price_paid, 0);
                      
                      return (
                        <div key={exp.id} className="p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-semibold">{exp.title}</p>
                              <p className="text-gray-400 text-xs">{expTickets.length} tickets sold</p>
                            </div>
                            <p className="text-green-400 font-bold">${expRevenue.toFixed(0)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <ListExperienceModal
          isOpen={showListModal}
          onClose={() => setShowListModal(false)}
          currentUser={currentUser}
        />

        {selectedTicketToVoid && (
          <VoidPassModal
            isOpen={showVoidModal}
            onClose={() => {
              setShowVoidModal(false);
              setSelectedTicketToVoid(null);
            }}
            ticket={selectedTicketToVoid}
            voidPolicies={
              myExperiences.find(e => e.id === selectedTicketToVoid.experience_id)
                ?.pass_types?.find(p => p.pass_type === selectedTicketToVoid.pass_type)
                ?.void_policies || []
            }
            currentUser={currentUser}
          />
        )}
      </div>
    </div>
  );
}