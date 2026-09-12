import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Ticket, CheckCircle, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { processUnifiedCheckout } from "@/functions/processUnifiedCheckout";
import StripeCheckoutForm from "../payment/StripeCheckoutForm";
import TicketPurchaseWalletIntegration from "./TicketPurchaseWalletIntegration";

// Matches PLATFORM_FEE_RATES.entertainment_ticket in api/_lib/orderHelpers.js
// — kept in sync there since the server is the source of truth for what's
// actually charged; this is only used to show the buyer an accurate total
// before they pay.
const PLATFORM_FEE_RATE = 0.19;

export default function TicketPurchaseModal({ isOpen, onClose, experience, currentUser }) {
  const [step, setStep] = useState(1);
  const [selectedTicketType, setSelectedTicketType] = useState(null);
  const [selectedPass, setSelectedPass] = useState(null);
  const [isPurchasingPass, setIsPurchasingPass] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [completedTicket, setCompletedTicket] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);

  // Non-ticket (direct booking) mode: no ticket types defined
  const isDirectBooking = !experience?.requires_tickets || !experience?.ticket_types?.length;

  const itemSubtotal = isDirectBooking
    ? (experience?.price || 0) * quantity
    : isPurchasingPass
      ? (selectedPass ? selectedPass.price * quantity : 0)
      : (selectedTicketType ? selectedTicketType.price * quantity : 0);
  // Kept as `totalPrice` too — a lot of the selection UI below was written
  // against that name and it's still exactly the item subtotal.
  const totalPrice = itemSubtotal;
  const platformFee = Math.round(itemSubtotal * PLATFORM_FEE_RATE * 100) / 100;
  const lineTotal = Math.round((itemSubtotal + platformFee) * 100) / 100;

  // Everything api/_lib/orderHelpers.js's entertainment_ticket branch needs
  // to build the ticket row — money moves first (Stripe/wallet, inside
  // api/checkout.js), and only after that succeeds does the server insert
  // this ticket. If the charge fails, nothing here ever runs, so there's no
  // way to be charged without getting a ticket anymore.
  const buildCheckoutPayload = () => ({
    order_type: 'entertainment_ticket',
    amount: itemSubtotal,
    provider_email: experience.provider_email,
    provider_name: experience.provider_name,
    item_id: experience.id,
    item_title: experience.title,
    item_description: experience.description,
    quantity,
    buyer_name: currentUser?.full_name,
    venue_name: experience.venue_name,
    venue_address: experience.venue_address,
    ...(isPurchasingPass
      ? {
          is_pass: true,
          pass_type: selectedPass?.pass_type,
          pass_validity_days: selectedPass?.validity_days,
          pass_visit_limit: selectedPass?.visit_limit,
          pass_perks: selectedPass?.perks || [],
        }
      : {
          is_pass: false,
          ticket_type: selectedTicketType?.type,
          event_date: selectedDate?.date || experience.event_dates?.[0]?.date,
          event_time: selectedDate?.start_time || experience.event_dates?.[0]?.start_time,
        }),
  });

  const sendConfirmationEmails = async (ticket) => {
    // Best-effort — the purchase has already fully succeeded server-side by
    // the time this runs, so a failed email here never costs anyone money
    // or a ticket.
    try {
      const emailBody = ticket.is_pass ? `
        <h1>Pass Purchase Confirmation</h1>
        <p>Thank you for your purchase!</p>
        <p><strong>Experience:</strong> ${experience.title}</p>
        <p><strong>Pass Type:</strong> ${selectedPass?.pass_name || ticket.pass_type}</p>
        ${ticket.pass_valid_until ? `<p><strong>Valid Until:</strong> ${new Date(ticket.pass_valid_until).toLocaleDateString()}</p>` : ''}
        <p><strong>Passes:</strong> ${quantity}</p>
        <p><strong>Total Paid:</strong> $${lineTotal.toFixed(2)}</p>
        <p><strong>Access Code:</strong> ${ticket.access_code}</p>
        <p>Your pass is available in your account. Show your QR code at the venue for entry.</p>
      ` : `
        <h1>Ticket Confirmation</h1>
        <p>Thank you for your purchase!</p>
        <p><strong>Experience:</strong> ${experience.title}</p>
        <p><strong>Date:</strong> ${ticket.event_date || ''}</p>
        <p><strong>Time:</strong> ${ticket.event_time || ''}</p>
        <p><strong>Venue:</strong> ${experience.venue_name || ''}</p>
        <p><strong>Tickets:</strong> ${quantity} x ${ticket.ticket_type || ''}</p>
        <p><strong>Total Paid:</strong> $${lineTotal.toFixed(2)}</p>
        <p><strong>Ticket Number:</strong> ${ticket.ticket_number}</p>
        <p>Your tickets are available in your account. Show your QR code at the venue for entry.</p>
      `;

      await base44.integrations.Core.SendEmail({
        to: currentUser.email,
        subject: ticket.is_pass ? `Your Pass for ${experience.title}` : `Your Tickets for ${experience.title}`,
        body: emailBody,
      });

      await base44.integrations.Core.SendEmail({
        to: experience.provider_email,
        subject: ticket.is_pass ? `New Pass Purchase - ${experience.title}` : `New Ticket Purchase - ${experience.title}`,
        body: `
          <h1>New ${ticket.is_pass ? 'Pass' : 'Ticket'} Purchase</h1>
          <p><strong>Customer:</strong> ${currentUser.full_name} (${currentUser.email})</p>
          <p><strong>Experience:</strong> ${experience.title}</p>
          <p><strong>Quantity:</strong> ${quantity}</p>
          <p><strong>Total:</strong> $${lineTotal.toFixed(2)}</p>
          <p><strong>Ticket Number:</strong> ${ticket.ticket_number}</p>
        `,
      });
    } catch (err) {
      console.error('Failed to send confirmation email:', err);
    }
  };

  const finalizePurchase = async (data) => {
    const ticket = data?.ticket || null;
    setCompletedTicket(ticket);
    setPurchaseComplete(true);
    toast.success('Purchase complete!');
    if (ticket) await sendConfirmationEmails(ticket);
  };

  const handleWalletPayment = async () => {
    setProcessing(true);
    try {
      const res = await processUnifiedCheckout({ ...buildCheckoutPayload(), payment_method: 'wallet' });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      await finalizePurchase(data);
    } catch (err) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleCardPayment = async () => {
    setPaymentMethod('card');
    setProcessing(true);
    try {
      const res = await processUnifiedCheckout({ ...buildCheckoutPayload(), payment_method: 'stripe' });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      if (!data?.client_secret || !data?.publishable_key) throw new Error('Payment setup failed — missing credentials');
      const stripe = await loadStripe(data.publishable_key);
      setStripePromise(stripe);
      setClientSecret(data.client_secret);
    } catch (err) {
      toast.error(err.message || 'Payment failed');
      setPaymentMethod(null);
    } finally {
      setProcessing(false);
    }
  };

  const onStripeSuccess = async (intentId) => {
    setProcessing(true);
    try {
      const res = await processUnifiedCheckout({
        ...buildCheckoutPayload(),
        payment_method: 'stripe',
        confirm_payment_intent_id: intentId,
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      await finalizePurchase(data);
    } catch (err) {
      toast.error(err.message || 'Failed to finalize purchase');
    } finally {
      setProcessing(false);
    }
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
                {step === 1 && isDirectBooking && (
                  <>
                    <p className="text-gray-300 text-sm mb-4">Book <strong className="text-white">{experience.title}</strong> directly for ${experience?.price}/person.</p>
                    <div>
                      <h3 className="text-white font-semibold mb-2">Guests</h3>
                      <Input
                        type="number" min="1" max="20"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <PriceBreakdown subtotal={itemSubtotal} fee={platformFee} total={lineTotal} />
                    <Button onClick={() => setStep(2)} disabled={itemSubtotal <= 0} className="w-full bg-purple-600 hover:bg-purple-700">
                      Continue to Payment
                    </Button>
                  </>
                )}

                {step === 1 && !isDirectBooking && (
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

                    <PriceBreakdown subtotal={itemSubtotal} fee={platformFee} total={lineTotal} />

                    <Button
                      onClick={() => setStep(2)}
                      disabled={isPurchasingPass ? !selectedPass : (!selectedTicketType || (!selectedDate && experience.event_dates?.length > 0))}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      Continue to Payment
                    </Button>
                  </>
                )}

                {step === 2 && !paymentMethod && (
                  <TicketPurchaseWalletIntegration
                    totalPrice={lineTotal}
                    currentUser={currentUser}
                    onWalletPayment={handleWalletPayment}
                    onCardPayment={handleCardPayment}
                    isProcessing={processing}
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
                        ) : !isDirectBooking ? (
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
                        ) : null}
                        <div className="flex justify-between">
                          <span className="text-gray-400">Quantity</span>
                          <span className="text-white">{quantity}</span>
                        </div>
                        <hr className="border-white/10 my-2" />
                        <div className="flex justify-between">
                          <span className="text-gray-400">Subtotal</span>
                          <span className="text-white">${itemSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Platform Fee ({Math.round(PLATFORM_FEE_RATE * 100)}%)</span>
                          <span className="text-white">${platformFee.toFixed(2)}</span>
                        </div>
                        <hr className="border-white/10 my-2" />
                        <div className="flex justify-between">
                          <span className="text-white font-bold">Total</span>
                          <span className="text-green-400 font-bold">${lineTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {clientSecret && stripePromise ? (
                      <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#8b5cf6' } } }}>
                        <StripeCheckoutForm
                          amount={lineTotal}
                          onSuccess={onStripeSuccess}
                          onCancel={() => { setPaymentMethod(null); setClientSecret(null); setStripePromise(null); }}
                          isProcessing={processing}
                          setIsProcessing={setProcessing}
                        />
                      </Elements>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                        <p className="text-gray-400 text-sm">Setting up secure payment...</p>
                      </div>
                    )}
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
              {completedTicket && (
                <div className="bg-white/5 rounded-xl p-6 mb-6">
                  <h3 className="text-white font-bold mb-3">Ticket Details</h3>
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-purple-400 font-mono text-sm">{completedTicket.ticket_number}</p>
                    <p className="text-gray-400 text-xs">Access Code: {completedTicket.access_code}</p>
                    {completedTicket.quantity > 1 && (
                      <p className="text-gray-400 text-xs">Covers {completedTicket.quantity} {completedTicket.is_pass ? 'passes' : 'tickets'}</p>
                    )}
                    {completedTicket.is_pass && completedTicket.pass_valid_until && (
                      <p className="text-green-400 text-xs mt-1">
                        Valid until {new Date(completedTicket.pass_valid_until).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
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

function PriceBreakdown({ subtotal, fee, total }) {
  return (
    <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-300">Subtotal</span>
        <span className="text-white font-bold">${subtotal.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-300">Platform Fee ({Math.round(PLATFORM_FEE_RATE * 100)}%)</span>
        <span className="text-white font-bold">${fee.toFixed(2)}</span>
      </div>
      <hr className="border-white/10 my-3" />
      <div className="flex items-center justify-between">
        <span className="text-white font-bold text-lg">Total</span>
        <span className="text-green-400 font-bold text-2xl">${total.toFixed(2)}</span>
      </div>
    </div>
  );
}
