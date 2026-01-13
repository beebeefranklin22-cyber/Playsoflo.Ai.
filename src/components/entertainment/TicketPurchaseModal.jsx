import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Ticket, Loader2, CreditCard, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import StripePaymentForm from "../payment/StripePaymentForm";

export default function TicketPurchaseModal({ isOpen, onClose, experience, currentUser }) {
  const [step, setStep] = useState(1);
  const [selectedTicketType, setSelectedTicketType] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [generatedTickets, setGeneratedTickets] = useState([]);

  const totalPrice = selectedTicketType ? selectedTicketType.price * quantity : 0;

  const generateTicketNumber = () => {
    return `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  };

  const generateQRCode = async (ticketNumber) => {
    // In production, use a proper QR code library
    const qrData = JSON.stringify({
      ticket_number: ticketNumber,
      experience_id: experience.id,
      buyer_email: currentUser.email,
      timestamp: new Date().toISOString()
    });
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="10" y="100" font-size="12">${ticketNumber}</text></svg>`)}`;
  };

  const createTicketsMutation = useMutation({
    mutationFn: async ({ paymentIntentId }) => {
      const tickets = [];
      for (let i = 0; i < quantity; i++) {
        const ticketNumber = generateTicketNumber();
        const qrCode = await generateQRCode(ticketNumber);
        
        const ticket = await base44.entities.EntertainmentTicket.create({
          experience_id: experience.id,
          experience_title: experience.title,
          buyer_email: currentUser.email,
          buyer_name: currentUser.full_name,
          provider_email: experience.provider_email,
          ticket_number: ticketNumber,
          qr_code: qrCode,
          ticket_type: selectedTicketType.type,
          quantity: 1,
          price_paid: selectedTicketType.price,
          event_date: selectedDate?.date || experience.event_dates[0]?.date,
          event_time: selectedDate?.start_time || experience.event_dates[0]?.start_time,
          venue_name: experience.venue_name,
          venue_address: experience.venue_address,
          status: 'active',
          payment_intent_id: paymentIntentId,
          access_code: Math.random().toString(36).substr(2, 6).toUpperCase()
        });
        tickets.push(ticket);
      }
      return tickets;
    },
    onSuccess: async (tickets) => {
      setGeneratedTickets(tickets);
      
      // Send email confirmation
      await base44.integrations.Core.SendEmail({
        to: currentUser.email,
        subject: `Your Tickets for ${experience.title}`,
        body: `
          <h1>Ticket Confirmation</h1>
          <p>Thank you for your purchase!</p>
          <p><strong>Experience:</strong> ${experience.title}</p>
          <p><strong>Date:</strong> ${selectedDate?.date || experience.event_dates[0]?.date}</p>
          <p><strong>Time:</strong> ${selectedDate?.start_time || experience.event_dates[0]?.start_time}</p>
          <p><strong>Venue:</strong> ${experience.venue_name}</p>
          <p><strong>Address:</strong> ${experience.venue_address}</p>
          <p><strong>Tickets:</strong> ${quantity} x ${selectedTicketType.type}</p>
          <p><strong>Total Paid:</strong> $${totalPrice}</p>
          <hr/>
          <p>Your tickets have been sent to your account. You can view and manage them in the app.</p>
          <p>Show your QR code at the venue for entry.</p>
        `
      });

      // Notify provider
      await base44.integrations.Core.SendEmail({
        to: experience.provider_email,
        subject: `New Ticket Purchase - ${experience.title}`,
        body: `
          <h1>New Ticket Purchase</h1>
          <p><strong>Customer:</strong> ${currentUser.full_name} (${currentUser.email})</p>
          <p><strong>Experience:</strong> ${experience.title}</p>
          <p><strong>Tickets:</strong> ${quantity} x ${selectedTicketType.type}</p>
          <p><strong>Total:</strong> $${totalPrice}</p>
          <p><strong>Date:</strong> ${selectedDate?.date || experience.event_dates[0]?.date}</p>
        `
      });

      setPurchaseComplete(true);
      toast.success('Tickets purchased successfully!');
    },
    onError: (error) => {
      toast.error('Failed to generate tickets: ' + error.message);
    }
  });

  const handlePaymentSuccess = async (paymentIntentId) => {
    await createTicketsMutation.mutateAsync({ paymentIntentId });
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

                    {experience.event_dates?.length > 0 && (
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
                      disabled={!selectedTicketType || !selectedDate}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      Continue to Payment
                    </Button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="bg-white/5 rounded-xl p-4 mb-6">
                      <h3 className="text-white font-bold mb-3">Order Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Experience</span>
                          <span className="text-white">{experience.title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Ticket Type</span>
                          <span className="text-white">{selectedTicketType.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Quantity</span>
                          <span className="text-white">{quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Date</span>
                          <span className="text-white">{selectedDate?.date} at {selectedDate?.start_time}</span>
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
                    <p className="text-gray-400 text-xs">Access Code: {ticket.access_code}</p>
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