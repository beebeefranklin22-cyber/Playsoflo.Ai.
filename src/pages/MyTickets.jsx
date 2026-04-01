import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, QrCode, Calendar, MapPin, Clock, Download, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function MyTickets() {
  const [currentUser, setCurrentUser] = useState(null);

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

  const { data: tickets = [] } = useQuery({
    queryKey: ['my-tickets', currentUser?.email],
    queryFn: () => base44.entities.EntertainmentTicket.filter({ buyer_email: currentUser.email }),
    enabled: !!currentUser,
    refetchInterval: 10000
  });

  const activeTickets = tickets.filter(t => t.status === 'active' || t.status === 'partially_used');
  const redeemedTickets = tickets.filter(t => t.status === 'redeemed');
  const cancelledTickets = tickets.filter(t => t.status === 'cancelled');

  const downloadTicket = (ticket) => {
    const ticketHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket - ${ticket.experience_title}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .ticket { border: 2px solid #8B5CF6; border-radius: 16px; padding: 30px; background: linear-gradient(to bottom right, #f3f4f6, #e5e7eb); }
          .header { text-align: center; margin-bottom: 30px; }
          .qr { text-align: center; margin: 20px 0; }
          .details { margin: 20px 0; }
          .details div { margin: 10px 0; }
          .label { color: #6b7280; font-size: 14px; }
          .value { color: #111827; font-weight: bold; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">
            <h1 style="color: #8B5CF6; margin: 0;">${ticket.experience_title}</h1>
            <p style="color: #6b7280;">Event Ticket</p>
          </div>
          <div class="qr">
            <img src="${ticket.qr_code}" alt="QR Code" style="width: 200px; height: 200px;" />
            <p style="font-family: monospace; font-size: 18px; margin-top: 10px;">${ticket.ticket_number}</p>
            <p style="font-size: 14px; color: #6b7280;">Access Code: ${ticket.access_code}</p>
          </div>
          <div class="details">
            <div><span class="label">Name:</span> <span class="value">${ticket.buyer_name}</span></div>
            <div><span class="label">Date:</span> <span class="value">${ticket.event_date}</span></div>
            <div><span class="label">Time:</span> <span class="value">${ticket.event_time}</span></div>
            <div><span class="label">Venue:</span> <span class="value">${ticket.venue_name}</span></div>
            <div><span class="label">Address:</span> <span class="value">${ticket.venue_address}</span></div>
            <div><span class="label">Ticket Type:</span> <span class="value">${ticket.ticket_type}</span></div>
            ${ticket.seat_number ? `<div><span class="label">Seat:</span> <span class="value">${ticket.seat_number}</span></div>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([ticketHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${ticket.ticket_number}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Ticket downloaded!');
  };

  const statusConfig = {
    active: { color: 'bg-green-500/20 text-green-300 border-green-500/30', icon: CheckCircle },
    partially_used: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: CheckCircle },
    redeemed: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: CheckCircle },
    cancelled: { color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: XCircle },
    expired: { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', icon: XCircle }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-gray-950 to-blue-950 p-6 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
            <Ticket className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">My Tickets</h1>
            <p className="text-gray-400">View and manage your event tickets</p>
          </div>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="bg-white/10 border border-white/20">
            <TabsTrigger value="active">Active ({activeTickets.length})</TabsTrigger>
            <TabsTrigger value="redeemed">Used ({redeemedTickets.length})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled ({cancelledTickets.length})</TabsTrigger>
          </TabsList>

          {['active', 'redeemed', 'cancelled'].map((status) => {
            const ticketList = status === 'active' ? activeTickets : status === 'redeemed' ? redeemedTickets : cancelledTickets;
            
            return (
              <TabsContent key={status} value={status} className="space-y-4">
                {ticketList.length === 0 ? (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-12 text-center">
                      <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">No {status} tickets</p>
                    </CardContent>
                  </Card>
                ) : (
                  ticketList.map((ticket) => {
                    const StatusIcon = statusConfig[ticket.status].icon;
                    return (
                      <motion.div
                        key={ticket.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Card className="bg-white/5 border-white/10 hover:border-purple-500/30 transition">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="text-white font-bold text-xl mb-2">{ticket.experience_title}</h3>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-gray-300">
                                    <Calendar className="w-4 h-4" />
                                    <span className="text-sm">{ticket.event_date}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-gray-300">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm">{ticket.event_time}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-gray-300">
                                    <MapPin className="w-4 h-4" />
                                    <span className="text-sm">{ticket.venue_name}</span>
                                  </div>
                                </div>
                              </div>
                              <Badge className={statusConfig[ticket.status].color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {ticket.status}
                              </Badge>
                            </div>

                            {(ticket.status === 'active' || ticket.status === 'partially_used') && (
                              <div className="bg-white/10 rounded-xl p-4 mb-4">
                                <div className="flex items-center justify-center mb-3">
                                  {ticket.qr_code && (
                                    <img src={ticket.qr_code} alt="QR Code" className="w-48 h-48 bg-white rounded-lg p-2" />
                                  )}
                                </div>
                                <p className="text-center text-purple-400 font-mono font-bold mb-1">{ticket.ticket_number}</p>
                                <p className="text-center text-gray-400 text-sm">Batch: {ticket.batch_id}</p>
                                <p className="text-center text-gray-400 text-sm">Access Code: {ticket.access_code}</p>
                                {ticket.is_pass && (
                                  <div className="mt-3 pt-3 border-t border-white/20 text-center">
                                    <p className="text-green-300 text-sm font-semibold mb-1">
                                      Pass Valid Until: {new Date(ticket.pass_valid_until).toLocaleDateString()}
                                    </p>
                                    <p className="text-blue-300 text-xs">
                                      Visits: {ticket.pass_visits_used || 0} / {ticket.pass_visits_allowed}
                                    </p>
                                    {ticket.pass_perks?.length > 0 && (
                                      <div className="mt-2">
                                        <p className="text-gray-400 text-xs mb-1">VIP Perks:</p>
                                        <div className="flex flex-wrap gap-1 justify-center">
                                          {ticket.pass_perks.map((perk, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-green-500/20 rounded text-green-300 text-xs">
                                              ✓ {perk}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="grid md:grid-cols-2 gap-3">
                              <div className="bg-white/5 rounded-lg p-3">
                                <p className="text-gray-400 text-xs">Ticket Type</p>
                                <p className="text-white font-semibold">{ticket.ticket_type}</p>
                              </div>
                              <div className="bg-white/5 rounded-lg p-3">
                                <p className="text-gray-400 text-xs">Price Paid</p>
                                <p className="text-green-400 font-bold">${ticket.price_paid}</p>
                              </div>
                            </div>

                            {ticket.status === 'active' && (
                              <Button
                                onClick={() => downloadTicket(ticket)}
                                className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download Ticket
                              </Button>
                            )}

                            {ticket.status === 'redeemed' && ticket.redeemed_at && (
                              <p className="text-gray-400 text-sm mt-4 text-center">
                                Redeemed on {new Date(ticket.redeemed_at).toLocaleString()}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}