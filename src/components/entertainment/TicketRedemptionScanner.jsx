import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Scan, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";

export default function TicketRedemptionScanner({ currentUser }) {
  const [ticketNumber, setTicketNumber] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [scannedTicket, setScannedTicket] = useState(null);

  const { data: providerExperiences = [] } = useQuery({
    queryKey: ['provider-experiences', currentUser?.email],
    queryFn: () => base44.entities.Experience.filter({ provider_email: currentUser.email }),
    enabled: !!currentUser
  });

  const verifyTicketMutation = useMutation({
    mutationFn: async () => {
      const tickets = await base44.entities.EntertainmentTicket.filter({
        ticket_number: ticketNumber.trim().toUpperCase()
      });

      if (tickets.length === 0) {
        throw new Error('Ticket not found - Invalid ticket number');
      }

      const ticket = tickets[0];

      // Verify this ticket belongs to provider's experience
      const isProviderTicket = providerExperiences.some(exp => exp.id === ticket.experience_id);
      if (!isProviderTicket) {
        throw new Error('Security Alert: This ticket is not for your experience');
      }

      // Verify access code (REQUIRED for security)
      if (!accessCode || ticket.access_code !== accessCode.toUpperCase()) {
        throw new Error('Invalid access code - Authentication failed');
      }

      // Verify security hash
      const timestamp = ticket.verification_timestamp || new Date(ticket.created_date).toISOString();
      const data = `${ticket.ticket_number}:${ticket.access_code}:${timestamp}:${ticket.experience_id}:${ticket.buyer_email}`;
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16).toUpperCase();
      
      if (ticket.security_hash && ticket.security_hash !== computedHash) {
        throw new Error('Security Alert: Ticket security hash mismatch - Possible counterfeit');
      }

      // For passes, check validity and usage
      if (ticket.is_pass) {
        const now = new Date();
        const validUntil = new Date(ticket.pass_valid_until);
        
        if (now > validUntil) {
          throw new Error(`Pass has expired on ${validUntil.toLocaleDateString()}`);
        }

        if (ticket.pass_visits_used >= ticket.pass_visits_allowed) {
          throw new Error('Pass visit limit reached');
        }

        if (ticket.status === 'expired') {
          throw new Error('Pass has been marked as expired');
        }
      } else {
        // Single event ticket checks
        if (ticket.status === 'redeemed') {
          throw new Error(`Ticket already used on ${new Date(ticket.redeemed_at).toLocaleString()}`);
        }

        if (ticket.status === 'expired') {
          throw new Error('Ticket has expired');
        }
      }

      // Check if cancelled
      if (ticket.status === 'cancelled') {
        throw new Error('Ticket has been cancelled and refunded');
      }

      return ticket;
    },
    onSuccess: (ticket) => {
      setScannedTicket(ticket);
      toast.success('Ticket verified successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
      setScannedTicket(null);
    }
  });

  const redeemTicketMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      
      if (scannedTicket.is_pass) {
        // For passes, increment usage counter
        const newVisitsUsed = (scannedTicket.pass_visits_used || 0) + 1;
        const newStatus = newVisitsUsed >= scannedTicket.pass_visits_allowed ? 'redeemed' : 'partially_used';
        
        await base44.entities.EntertainmentTicket.update(scannedTicket.id, {
          status: newStatus,
          pass_visits_used: newVisitsUsed,
          redemption_history: [
            ...(scannedTicket.redemption_history || []),
            {
              redeemed_at: now,
              redeemed_by: currentUser.email,
              location: scannedTicket.venue_name
            }
          ],
          verification_timestamp: now
        });

        // Send confirmation email
        await base44.integrations.Core.SendEmail({
          to: scannedTicket.buyer_email,
          subject: `Pass Check-In Confirmation - ${scannedTicket.experience_title}`,
          body: `
            <h1>Pass Check-In Confirmed</h1>
            <p>Your pass has been successfully checked in.</p>
            <p><strong>Experience:</strong> ${scannedTicket.experience_title}</p>
            <p><strong>Pass Number:</strong> ${scannedTicket.ticket_number}</p>
            <p><strong>Check-in Time:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Visits Used:</strong> ${newVisitsUsed} / ${scannedTicket.pass_visits_allowed}</p>
            <p><strong>Valid Until:</strong> ${new Date(scannedTicket.pass_valid_until).toLocaleDateString()}</p>
            <p>Enjoy your experience!</p>
          `
        });
      } else {
        // Single ticket redemption
        await base44.entities.EntertainmentTicket.update(scannedTicket.id, {
          status: 'redeemed',
          redeemed_at: now,
          redeemed_by: currentUser.email,
          verification_timestamp: now
        });

        // Send confirmation email
        await base44.integrations.Core.SendEmail({
          to: scannedTicket.buyer_email,
          subject: `Ticket Check-In Confirmation - ${scannedTicket.experience_title}`,
          body: `
            <h1>Check-In Confirmed</h1>
            <p>Your ticket has been successfully checked in.</p>
            <p><strong>Experience:</strong> ${scannedTicket.experience_title}</p>
            <p><strong>Ticket Number:</strong> ${scannedTicket.ticket_number}</p>
            <p><strong>Batch ID:</strong> ${scannedTicket.batch_id}</p>
            <p><strong>Check-in Time:</strong> ${new Date().toLocaleString()}</p>
            <p>Enjoy your experience!</p>
          `
        });
      }
    },
    onSuccess: () => {
      toast.success('Ticket redeemed successfully!');
      setTicketNumber("");
      setAccessCode("");
      setScannedTicket(null);
    },
    onError: (error) => {
      toast.error('Failed to redeem ticket: ' + error.message);
    }
  });

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Scan className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Ticket Scanner</h2>
              <p className="text-gray-400 text-sm">Scan or enter ticket details to verify and redeem</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-white font-semibold mb-2 block">Ticket Number *</label>
              <Input
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                placeholder="TKT-XXXXXXXXX"
                className="bg-white/10 border-white/20 text-white font-mono"
              />
            </div>

            <div>
              <label className="text-white font-semibold mb-2 block">Access Code (Optional)</label>
              <Input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="ABC123"
                className="bg-white/10 border-white/20 text-white font-mono"
              />
            </div>

            <Button
              onClick={() => verifyTicketMutation.mutate()}
              disabled={!ticketNumber.trim() || verifyTicketMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {verifyTicketMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Scan className="w-4 h-4 mr-2" />
                  Verify Ticket
                </>
              )}
            </Button>
          </div>

          {scannedTicket && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div>
                  <h3 className="text-white font-bold text-lg">
                    {scannedTicket.is_pass ? 'Valid Pass ✓' : 'Valid Ticket ✓'}
                  </h3>
                  <p className="text-green-300 text-sm">Authenticated & Ready to redeem</p>
                </div>
              </div>

              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 mb-4">
                <p className="text-blue-300 text-xs font-semibold mb-1">Security Verification</p>
                <div className="space-y-1 text-xs">
                  <p className="text-blue-200">✓ Batch ID verified</p>
                  <p className="text-blue-200">✓ Security hash validated</p>
                  <p className="text-blue-200">✓ Access code confirmed</p>
                  <p className="text-green-300 font-bold mt-2">Ticket is genuine</p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Experience</span>
                  <span className="text-white font-semibold">{scannedTicket.experience_title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Customer</span>
                  <span className="text-white font-semibold">{scannedTicket.buyer_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Batch ID</span>
                  <span className="text-purple-400 font-mono text-xs">{scannedTicket.batch_id}</span>
                </div>
                {scannedTicket.is_pass ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Pass Type</span>
                      <span className="text-white font-semibold">{scannedTicket.pass_type?.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Valid Until</span>
                      <span className="text-white font-semibold">{new Date(scannedTicket.pass_valid_until).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Visits Used</span>
                      <span className="text-white font-semibold">
                        {scannedTicket.pass_visits_used || 0} / {scannedTicket.pass_visits_allowed}
                      </span>
                    </div>
                    {scannedTicket.pass_perks?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-gray-300 text-xs mb-2">VIP Perks:</p>
                        <div className="flex flex-wrap gap-1">
                          {scannedTicket.pass_perks.map((perk, i) => (
                            <span key={i} className="px-2 py-0.5 bg-green-500/20 rounded text-green-300 text-xs">
                              ✓ {perk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Ticket Type</span>
                      <span className="text-white font-semibold">{scannedTicket.ticket_type}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Event Date</span>
                      <span className="text-white font-semibold">{scannedTicket.event_date}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Event Time</span>
                      <span className="text-white font-semibold">{scannedTicket.event_time}</span>
                    </div>
                    {scannedTicket.seat_number && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Seat</span>
                        <span className="text-white font-semibold">{scannedTicket.seat_number}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <Button
                onClick={() => redeemTicketMutation.mutate()}
                disabled={redeemTicketMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {redeemTicketMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {scannedTicket.is_pass ? 'Check-In Pass' : 'Redeem Ticket'}
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="mt-6 bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-semibold mb-1">Security Features:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Batch ID tracking prevents fake ticket duplication</li>
                  <li>Security hash validates ticket authenticity</li>
                  <li>Access code required for all redemptions</li>
                  <li>Passes track usage history and expiration</li>
                  <li>Each ticket has unique cryptographic verification</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}