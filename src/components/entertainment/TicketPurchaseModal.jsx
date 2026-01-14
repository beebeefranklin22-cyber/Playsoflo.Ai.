import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Ticket, Loader2, CreditCard, CheckCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import StripePaymentForm from "../payment/StripePaymentForm";
import TicketPurchaseWalletIntegration from "./TicketPurchaseWalletIntegration";

export default function TicketPurchaseModal({ isOpen, onClose, experience, currentUser }) {
  const [step, setStep] = useState(1);
  const [selectedTicketType, setSelectedTicketType] = useState(null);
  const [selectedPass, setSelectedPass] = useState(null);
  const [isPurchasingPass, setIsPurchasingPass] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [generatedTickets, setGeneratedTickets] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState(null);

  const totalPrice = isPurchasingPass 
    ? (selectedPass ? selectedPass.price * quantity : 0)
    : (selectedTicketType ? selectedTicketType.price * quantity : 0);

  const generateBatchId = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${experience.batch_prefix || 'EXP'}-B${timestamp}-${random}`;
  };

  const generateTicketNumber = (batchId, index) => {
    const ticketNum = `${batchId}-T${String(index).padStart(4, '0')}`;
    return ticketNum;
  };

  const generateSecurityHash = async (ticketNumber, accessCode, timestamp) => {
    const data = `${ticketNumber}:${accessCode}:${timestamp}:${experience.id}:${currentUser.email}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16).toUpperCase();
  };

  const generateQRCode = async (ticketData) => {
    const qrData = JSON.stringify({
      ticket_number: ticketData.ticket_number,
      security_hash: ticketData.security_hash,
      access_code: ticketData.access_code,
      experience_id: experience.id,
      buyer_email: currentUser.email,
      timestamp: ticketData.timestamp
    });
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><text x="100" y="90" font-size="10" text-anchor="middle" font-family="monospace">${ticketData.ticket_number}</text><text x="100" y="110" font-size="8" text-anchor="middle" fill="#666">${ticketData.access_code}</text></svg>`)}`;
  };

  const createTicketsMutation = useMutation({
    mutationFn: async ({ paymentIntentId, useWallet = false }) => {
      // Process wallet payment if applicable
      if (useWallet) {
        const buyers = await base44.entities.User.filter({ email: currentUser.email });
        if (buyers.length === 0) throw new Error('User not found');
        
        const currentBalance = buyers[0].soflo_balance || 0;
        if (currentBalance < totalPrice) {
          throw new Error('Insufficient wallet balance');
        }

        // Deduct from buyer's wallet
        await base44.entities.User.update(buyers[0].id, {
          soflo_balance: currentBalance - totalPrice
        });

        // Add to provider's wallet
        const providers = await base44.entities.User.filter({ email: experience.provider_email });
        if (providers.length > 0) {
          const providerBalance = providers[0].soflo_balance || 0;
          await base44.entities.User.update(providers[0].id, {
            soflo_balance: providerBalance + totalPrice
          });
        }

        // Create payment record
        await base44.entities.Payment.create({
          sender_email: currentUser.email,
          recipient_email: experience.provider_email,
          amount: totalPrice,
          currency: 'USD',
          payment_method: 'wallet',
          status: 'completed',
          transaction_type: 'purchase',
          reference_type: 'entertainment_ticket',
          reference_id: experience.id,
          description: `${isPurchasingPass ? 'Pass' : 'Ticket'} purchase: ${experience.title}`
        });
      }
      const tickets = [];
      const batchId = generateBatchId();
      const timestamp = new Date().toISOString();
      
      for (let i = 0; i < quantity; i++) {
        const accessCode = Math.random().toString(36).substr(2, 6).toUpperCase();
        const ticketNumber = generateTicketNumber(batchId, i + 1);
        const securityHash = await generateSecurityHash(ticketNumber, accessCode, timestamp);
        const ticketData = { ticket_number: ticketNumber, security_hash: securityHash, access_code: accessCode, timestamp };
        const qrCode = await generateQRCode(ticketData);
        
        const ticketBase = {
          experience_id: experience.id,
          experience_title: experience.title,
          buyer_email: currentUser.email,
          buyer_name: currentUser.full_name,
          provider_email: experience.provider_email,
          ticket_number: ticketNumber,
          batch_id: batchId,
          qr_code: qrCode,
          security_hash: securityHash,
          quantity: 1,
          venue_name: experience.venue_name,
          venue_address: experience.venue_address,
          status: 'active',
          payment_intent_id: paymentIntentId,
          access_code: accessCode,
          verification_timestamp: timestamp
        };

        if (isPurchasingPass) {
          const validFrom = new Date();
          const validUntil = new Date(validFrom);
          validUntil.setDate(validUntil.getDate() + selectedPass.validity_days);

          const ticket = await base44.entities.EntertainmentTicket.create({
            ...ticketBase,
            is_pass: true,
            pass_type: selectedPass.pass_type,
            pass_valid_from: validFrom.toISOString(),
            pass_valid_until: validUntil.toISOString(),
            pass_visits_allowed: selectedPass.visit_limit,
            pass_visits_used: 0,
            pass_perks: selectedPass.perks || [],
            price_paid: selectedPass.price,
            ticket_type: selectedPass.pass_type
          });
          tickets.push(ticket);
        } else {
          const ticket = await base44.entities.EntertainmentTicket.create({
            ...ticketBase,
            ticket_type: selectedTicketType.type,
            price_paid: selectedTicketType.price,
            event_date: selectedDate?.date || experience.event_dates[0]?.date,
            event_time: selectedDate?.start_time || experience.event_dates[0]?.start_time,
            is_pass: false
          });
          tickets.push(ticket);
        }
      }
      return tickets;
    },
    onSuccess: async (tickets) => {
      setGeneratedTickets(tickets);
      
      // Send email confirmation
      const emailBody = isPurchasingPass ? `
        <h1>Pass Purchase Confirmation</h1>
        <p>Thank you for your purchase!</p>
        <p><strong>Experience:</strong> ${experience.title}</p>
        <p><strong>Pass Type:</strong> ${selectedPass.pass_name} (${selectedPass.pass_type.replace(/_/g, ' ')})</p>
        <p><strong>Valid From:</strong> ${new Date(tickets[0].pass_valid_from).toLocaleDateString()}</p>
        <p><strong>Valid Until:</strong> ${new Date(tickets[0].pass_valid_until).toLocaleDateString()}</p>
        <p><strong>Visit Limit:</strong> ${selectedPass.visit_limit === 999 ? 'Unlimited' : selectedPass.visit_limit} visits</p>
        ${selectedPass.perks?.length > 0 ? `<p><strong>VIP Perks:</strong> ${selectedPass.perks.join(', ')}</p>` : ''}
        <p><strong>Passes:</strong> ${quantity}</p>
        <p><strong>Total Paid:</strong> $${totalPrice}</p>
        <hr/>
        <p><strong>Security:</strong> Each pass has a unique batch ID and security hash for verification.</p>
        <p>Your passes are available in your account. Show your QR code at the venue for entry.</p>
      ` : `
        <h1>Ticket Confirmation</h1>
        <p>Thank you for your purchase!</p>
        <p><strong>Experience:</strong> ${experience.title}</p>
        <p><strong>Date:</strong> ${selectedDate?.date || experience.event_dates[0]?.date}</p>
        <p><strong>Time:</strong> ${selectedDate?.start_time || experience.event_dates[0]?.start_time}</p>
        <p><strong>Venue:</strong> ${experience.venue_name}</p>
        <p><strong>Address:</strong> ${experience.venue_address}</p>
        <p><strong>Tickets:</strong> ${quantity} x ${selectedTicketType.type}</p>
        <p><strong>Total Paid:</strong> $${totalPrice}</p>
        <p><strong>Batch ID:</strong> ${tickets[0].batch_id}</p>
        <hr/>
        <p><strong>Security:</strong> Your tickets include unique security hashes and access codes for authenticity.</p>
        <p>Your tickets are available in your account. Show your QR code at the venue for entry.</p>
      `;

      await base44.integrations.Core.SendEmail({
        to: currentUser.email,
        subject: isPurchasingPass ? `Your Pass for ${experience.title}` : `Your Tickets for ${experience.title}`,
        body: emailBody
      });

      // Notify provider
      const providerEmailBody = isPurchasingPass ? `
        <h1>New Pass Purchase</h1>
        <p><strong>Customer:</strong> ${currentUser.full_name} (${currentUser.email})</p>
        <p><strong>Experience:</strong> ${experience.title}</p>
        <p><strong>Pass Type:</strong> ${quantity} x ${selectedPass.pass_name}</p>
        <p><strong>Total:</strong> $${totalPrice}</p>
        <p><strong>Batch ID:</strong> ${tickets[0].batch_id}</p>
        <p><strong>Valid Until:</strong> ${new Date(tickets[0].pass_valid_until).toLocaleDateString()}</p>
      ` : `
        <h1>New Ticket Purchase</h1>
        <p><strong>Customer:</strong> ${currentUser.full_name} (${currentUser.email})</p>
        <p><strong>Experience:</strong> ${experience.title}</p>
        <p><strong>Tickets:</strong> ${quantity} x ${selectedTicketType.type}</p>
        <p><strong>Total:</strong> $${totalPrice}</p>
        <p><strong>Date:</strong> ${selectedDate?.date || experience.event_dates[0]?.date}</p>
        <p><strong>Batch ID:</strong> ${tickets[0].batch_id}</p>
      `;
      
      await base44.integrations.Core.SendEmail({
        to: experience.provider_email,
        subject: isPurchasingPass ? `New Pass Purchase - ${experience.title}` : `New Ticket Purchase - ${experience.title}`,
        body: providerEmailBody
      });

      setPurchaseComplete(true);
      toast.success('Tickets purchased successfully!');
    },
    onError: (error) => {
      toast.error('Failed to generate tickets: ' + error.message);
    }
  });

  const handlePaymentSuccess = async (paymentIntentId) => {
    await createTicketsMutation.mutateAsync({ paymentIntentId, useWallet: false });
  };

  const handleWalletPayment = async () => {
    await createTicketsMutation.mutateAsync({ paymentIntentId: null, useWallet: true });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-gray-900 rounded-3xl p-8 my-8"
        >
          {!purchaseComplete ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Ticket className="w-7 h-7 text-purple-400" />
                  Purchase Tickets
                </h2>
                <button onClick={onClose}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-6">
                {step === 1 && (
                  <>
                    {/* Toggle between tickets and passes */}
                    {experience.pass_types?.length > 0 && (
                      <div className="flex gap-2 mb-4">
                        <Button
                          onClick={() => setIsPurchasingPass(false)}
                          className={isPurchasingPass ? 'bg-white/10' : 'bg-purple-600'}
                          variant={isPurchasingPass ? 'outline' : 'default'}
                        >
                          <Ticket className="w-4 h-4 mr-2" />
                          Single Tickets
                        </Button>
                        <Button
                          onClick={() => setIsPurchasingPass(true)}
                          className={!isPurchasingPass ? 'bg-white/10' : 'bg-purple-600'}
                          variant={!isPurchasingPass ? 'outline' : 'default'}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Passes
                        </Button>
                      </div>
                    )}

                    {isPurchasingPass ? (
                      <div>
                        <h3 className="text-white font-semibold mb-3">Select Pass Type</h3>
                        <div className="space-y-2">
                          {experience.pass_types?.map((pass, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedPass(pass)}
                              className={`w-full p-4 rounded-xl border-2 transition ${
                                selectedPass?.pass_name === pass.pass_name
                                  ? 'bg-purple-500/20 border-purple-500'
                                  : 'bg-white/5 border-white/10 hover:border-purple-500/50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-left flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-white font-bold">{pass.pass_name}</p>
                                    <span className="px-2 py-0.5 bg-purple-500/30 rounded text-purple-300 text-xs">
                                      {pass.pass_type.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                  <p className="text-gray-400 text-sm">{pass.description}</p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                    <span>Valid {pass.validity_days} days</span>
                                    <span>•</span>
                                    <span>{pass.visit_limit === 999 ? 'Unlimited' : pass.visit_limit} visits</span>
                                  </div>
                                  {pass.perks?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {pass.perks.map((perk, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-green-500/20 rounded text-green-300 text-xs">
                                          ✓ {perk}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {pass.benefits?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {pass.benefits.map((benefit, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-blue-500/20 rounded text-blue-300 text-xs">
                                          {benefit}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {pass.rules?.length > 0 && (
                                    <details className="mt-2">
                                      <summary className="text-orange-400 text-xs cursor-pointer">View Rules ({pass.rules.length})</summary>
                                      <ul className="mt-2 space-y-1 pl-4 list-disc">
                                        {pass.rules.map((rule, i) => (
                                          <li key={i} className="text-gray-400 text-xs">{rule}</li>
                                        ))}
                                      </ul>
                                    </details>
                                  )}
                                </div>
                                <p className="text-green-400 font-bold text-xl ml-4">${pass.price}</p>
                              </div>
                            </button>
                          ))}
                        </div>

                        {selectedPass?.void_policies?.length > 0 && (
                          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <p className="text-red-400 text-xs font-semibold mb-2">Voiding Policies:</p>
                            <ul className="space-y-1">
                              {selectedPass.void_policies.map((policy, i) => (
                                <li key={i} className="text-red-300 text-xs">
                                  • {policy.reason}: {policy.refund_percent}% refund
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-white font-semibold mb-3">Select Ticket Type</h3>
                        <div className="space-y-2">
                          {experience.ticket_types?.map((ticket, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedTicketType(ticket)}
                            className={`w-full p-4 rounded-xl border-2 transition ${
                              selectedTicketType?.type === ticket.type
                                ? 'bg-purple-500/20 border-purple-500'
                                : 'bg-white/5 border-white/10 hover:border-purple-500/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-left">
                                <p className="text-white font-bold">{ticket.type}</p>
                                <p className="text-gray-400 text-sm">{ticket.description}</p>
                                <p className="text-gray-500 text-xs mt-1">{ticket.available} available</p>
                              </div>
                              <p className="text-green-400 font-bold text-xl">${ticket.price}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                      </div>
                    )}

                    {!isPurchasingPass && experience.event_dates?.length > 0 && (
                      <div>
                        <h3 className="text-white font-semibold mb-3">Select Date</h3>
                        <Select value={selectedDate?.date} onValueChange={(v) => {
                          const date = experience.event_dates.find(d => d.date === v);
                          setSelectedDate(date);
                        }}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Choose a date" />
                          </SelectTrigger>
                          <SelectContent>
                            {experience.event_dates.map((date, idx) => (
                              <SelectItem key={idx} value={date.date}>
                                {date.date} at {date.start_time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <h3 className="text-white font-semibold mb-3">Quantity</h3>
                      <Input
                        type="number"
                        min="1"
                        max={selectedTicketType?.available || 10}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-300">Subtotal</span>
                        <span className="text-white font-bold">${totalPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-300">Service Fee</span>
                        <span className="text-white font-bold">$0.00</span>
                      </div>
                      <hr className="border-white/10 my-3" />
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold text-lg">Total</span>
                        <span className="text-green-400 font-bold text-2xl">${totalPrice.toFixed(2)}</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => setStep(2)}
                      disabled={isPurchasingPass ? !selectedPass : (!selectedTicketType || !selectedDate)}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      Continue to Payment
                    </Button>
                  </>
                )}

                {step === 2 && !paymentMethod && (
                  <TicketPurchaseWalletIntegration
                    totalPrice={totalPrice}
                    currentUser={currentUser}
                    onWalletPayment={handleWalletPayment}
                    onCardPayment={() => setPaymentMethod('card')}
                    isProcessing={createTicketsMutation.isPending}
                  />
                )}

                {step === 2 && paymentMethod === 'card' && (
                  <>
                    <div className="bg-white/5 rounded-xl p-4 mb-6">
                      <h3 className="text-white font-bold mb-3">Order Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Experience</span>
                          <span className="text-white">{experience.title}</span>
                        </div>
                        {isPurchasingPass ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Pass Type</span>
                              <span className="text-white">{selectedPass.pass_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Validity</span>
                              <span className="text-white">{selectedPass.validity_days} days</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Visits</span>
                              <span className="text-white">{selectedPass.visit_limit === 999 ? 'Unlimited' : selectedPass.visit_limit}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Ticket Type</span>
                              <span className="text-white">{selectedTicketType.type}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Date</span>
                              <span className="text-white">{selectedDate?.date} at {selectedDate?.start_time}</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-400">Quantity</span>
                          <span className="text-white">{quantity}</span>
                        </div>
                        <hr className="border-white/10 my-2" />
                        <div className="flex justify-between">
                          <span className="text-white font-bold">Total</span>
                          <span className="text-green-400 font-bold">${totalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <StripePaymentForm
                      amount={totalPrice}
                      description={`${quantity}x ${selectedTicketType.type} - ${experience.title}`}
                      onSuccess={handlePaymentSuccess}
                      onCancel={() => setStep(1)}
                    />
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-3">Purchase Complete!</h2>
              <p className="text-gray-300 mb-6">
                Your tickets have been sent to your email and are available in your account.
              </p>
              <div className="bg-white/5 rounded-xl p-6 mb-6">
                <h3 className="text-white font-bold mb-3">Ticket Details</h3>
                {generatedTickets.map((ticket, idx) => (
                  <div key={idx} className="bg-white/10 rounded-lg p-4 mb-2">
                    <p className="text-purple-400 font-mono text-sm">{ticket.ticket_number}</p>
                    <p className="text-gray-400 text-xs">Batch: {ticket.batch_id}</p>
                    <p className="text-gray-400 text-xs">Access Code: {ticket.access_code}</p>
                    {ticket.is_pass && (
                      <p className="text-green-400 text-xs mt-1">
                        Valid until {new Date(ticket.pass_valid_until).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <Button onClick={onClose} className="bg-purple-600 hover:bg-purple-700">
                Done
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}