import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  X, ChevronLeft, ChevronRight, CheckCircle, Loader2, Calendar, Clock,
  ShoppingBag, CreditCard, Wallet, Package, Truck, MapPin, Star, Tag,
  Zap, RefreshCw, AlertCircle, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// ── Stripe inner form ─────────────────────────────────────────────────────────
function StripeCheckoutForm({ amount, onSuccess, onCancel, isProcessing, setIsProcessing }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsProcessing(true);
    setError(null);
    const { error: submitError } = await elements.submit();
    if (submitError) { setError(submitError.message); setIsProcessing(false); return; }
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: window.location.href },
    });
    if (confirmError) { setError(confirmError.message); setIsProcessing(false); return; }
    if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
      onSuccess(paymentIntent.id);
    } else {
      setError("Payment was not completed. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 border-white/20 text-white">
          Back
        </Button>
        <Button type="submit" disabled={!stripe || isProcessing} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 font-bold">
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
          Pay ${amount?.toFixed(2)}
        </Button>
      </div>
    </form>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function UnifiedBookingModal({
  isOpen,
  onClose,
  provider,           // { email, full_name, provider_business_name, ... }
  item,               // { id, title, description, price, category, image_url, ... }
  orderType,          // service_booking | product_order | digital_product | subscription | experience | food_order
  onSuccess,
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=item+options, 2=schedule(if applicable), 3=fulfillment, 4=payment, 5=done
  const [currentUser, setCurrentUser] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [completedOrderId, setCompletedOrderId] = useState(null);

  const [form, setForm] = useState({
    quantity: 1,
    selectedVariant: null,
    selectedAddOns: [],
    booking_date: '',
    booking_time: '',
    fulfillment_method: 'pickup', // pickup | shipping | local_delivery
    delivery_address: '',
    shipping_address: '',
    customer_notes: '',
    customer_phone: '',
    payment_method: 'stripe', // stripe | wallet
    subscription_interval: 'monthly',
  });

  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    base44.auth.me().then(u => {
      setCurrentUser(u);
      setForm(f => ({ ...f, customer_phone: u.provider_phone || u.phone || '' }));
    }).catch(() => {});
    // Reset state on open
    setStep(1);
    setClientSecret(null);
    setPaymentIntentId(null);
    setCompletedOrderId(null);
    setProcessing(false);
  }, [isOpen]);

  // Compute total
  const basePrice = parseFloat(item?.price || 0);
  const variantMod = form.selectedVariant ? parseFloat(form.selectedVariant.price_modifier || 0) / 100 * basePrice : 0;
  const addOnsTotal = form.selectedAddOns.reduce((s, ao) => s + parseFloat(ao.price || 0), 0);
  const unitPrice = basePrice + variantMod;
  const lineTotal = unitPrice * form.quantity + addOnsTotal;
  const platformFeeRate = { service_booking: 0.15, product_order: 0.15, digital_product: 0.20, subscription: 0.20, experience: 0.19, food_order: 0.10 }[orderType] || 0.15;
  const platformFee = parseFloat((lineTotal * platformFeeRate).toFixed(2));
  const providerEarnings = parseFloat((lineTotal - platformFee).toFixed(2));

  const needsSchedule = ['service_booking', 'experience'].includes(orderType);
  const needsFulfillment = ['product_order', 'food_order'].includes(orderType);
  const isDigital = ['digital_product', 'subscription'].includes(orderType);

  // Load available time slots
  useEffect(() => {
    if (form.booking_date && provider?.email && needsSchedule) {
      loadAvailableSlots();
    }
  }, [form.booking_date]);

  const loadAvailableSlots = async () => {
    setLoadingSlots(true);
    try {
      const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = dayMap[new Date(form.booking_date + 'T12:00:00').getDay()];
      const avails = await base44.entities.ProviderAvailability.filter({
        provider_email: provider.email,
        day_of_week: dayOfWeek,
      });
      if (!avails.length || !avails[0].is_available) { setAvailableSlots([]); return; }
      const avail = avails[0];
      const duration = avail.slot_duration_minutes || 60;
      const existing = await base44.entities.ServiceBooking.filter({
        provider_email: provider.email,
        booking_date: form.booking_date,
      });
      const slots = [];
      let cur = new Date(`2000-01-01T${avail.start_time}`);
      const end = new Date(`2000-01-01T${avail.end_time}`);
      while (cur < end) {
        const t = cur.toTimeString().substring(0, 5);
        if (!existing.some(b => b.booking_time === t)) slots.push(t);
        cur = new Date(cur.getTime() + duration * 60000);
      }
      setAvailableSlots(slots);
    } catch (e) {
      console.error(e);
      // Fallback default slots
      setAvailableSlots(['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00']);
    } finally {
      setLoadingSlots(false);
    }
  };

  const getTomorrowDate = () => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  // Determine which steps to show
  const steps = ['Items'];
  if (needsSchedule) steps.push('Schedule');
  if (needsFulfillment) steps.push('Delivery');
  steps.push('Payment');
  steps.push('Done');

  const totalSteps = steps.length;

  const goNext = () => setStep(s => Math.min(s + 1, totalSteps));
  const goBack = () => setStep(s => Math.max(s - 1, 1));

  // Step titles mapped to number
  const stepName = steps[step - 1];

  // ── PAYMENT INITIATION ────────────────────────────────────────────────────
  const initiatePayment = async () => {
    setProcessing(true);
    try {
      if (form.payment_method === 'wallet') {
        // Wallet: single call that completes everything
        const res = await base44.functions.invoke('processUnifiedCheckout', {
          order_type: orderType,
          payment_method: 'wallet',
          amount: lineTotal,
          provider_email: provider.email,
          provider_name: provider.provider_business_name || provider.full_name,
          item_id: item?.id,
          item_title: item?.title,
          item_description: item?.description,
          booking_date: form.booking_date,
          booking_time: form.booking_time,
          customer_notes: form.customer_notes,
          customer_phone: form.customer_phone,
          fulfillment_method: form.fulfillment_method,
          delivery_address: form.delivery_address,
          shipping_address: form.shipping_address,
          quantity: form.quantity,
          subscription_interval: form.subscription_interval,
        });
        const data = res?.data || res;
        if (data?.error) throw new Error(data.error);
        setCompletedOrderId(data?.order_id);
        setStep(totalSteps);
        if (onSuccess) onSuccess(data);
        toast.success('Payment successful!');
      } else {
        // Stripe: get client_secret, then show Stripe form
        const res = await base44.functions.invoke('processUnifiedCheckout', {
          order_type: orderType,
          payment_method: 'stripe',
          amount: lineTotal,
          provider_email: provider.email,
          provider_name: provider.provider_business_name || provider.full_name,
          item_id: item?.id,
          item_title: item?.title,
          item_description: item?.description,
          booking_date: form.booking_date,
          booking_time: form.booking_time,
          customer_notes: form.customer_notes,
          customer_phone: form.customer_phone,
          fulfillment_method: form.fulfillment_method,
          delivery_address: form.delivery_address,
          shipping_address: form.shipping_address,
          quantity: form.quantity,
          subscription_interval: form.subscription_interval,
        });
        const data = res?.data || res;
        if (data?.error) throw new Error(data.error);
        if (!data?.client_secret || !data?.publishable_key) throw new Error('Payment setup failed — missing credentials');
        const stripe = await loadStripe(data.publishable_key);
        setStripePromise(stripe);
        setClientSecret(data.client_secret);
        setPaymentIntentId(data.payment_intent_id);
      }
    } catch (err) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  // After Stripe confirms on frontend, call backend to finalize
  const onStripeSuccess = async (intentId) => {
    setProcessing(true);
    try {
      const res = await base44.functions.invoke('processUnifiedCheckout', {
        order_type: orderType,
        payment_method: 'stripe',
        amount: lineTotal,
        provider_email: provider.email,
        provider_name: provider.provider_business_name || provider.full_name,
        item_id: item?.id,
        item_title: item?.title,
        item_description: item?.description,
        booking_date: form.booking_date,
        booking_time: form.booking_time,
        customer_notes: form.customer_notes,
        customer_phone: form.customer_phone,
        fulfillment_method: form.fulfillment_method,
        delivery_address: form.delivery_address,
        shipping_address: form.shipping_address,
        quantity: form.quantity,
        subscription_interval: form.subscription_interval,
        confirm_payment_intent_id: intentId,
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      setCompletedOrderId(data?.order_id);
      setStep(totalSteps);
      if (onSuccess) onSuccess(data);
      toast.success('Payment successful!');
    } catch (err) {
      toast.error(err.message || 'Failed to finalize order');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  const providerName = provider?.provider_business_name || provider?.full_name || 'Provider';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="w-full sm:max-w-lg bg-gray-950 border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              {step > 1 && step < totalSteps && (
                <button onClick={goBack} className="p-1.5 hover:bg-white/10 rounded-full transition">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
              )}
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">
                  {stepName === 'Done' ? '🎉 Confirmed!' : `${orderTypeLabel(orderType)}`}
                </h2>
                <p className="text-gray-400 text-xs">{providerName} • Step {step} of {totalSteps}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-white/10 flex-shrink-0">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              animate={{ width: `${(step / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 p-5 space-y-5">
            <AnimatePresence mode="wait">

              {/* ── STEP 1: Item + Options ── */}
              {stepName === 'Items' && (
                <motion.div key="step-items" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  {/* Item card */}
                  <div className="flex gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
                    {item?.image_url && (
                      <img src={item.image_url} alt={item.title} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-base">{item?.title}</h3>
                      {item?.description && <p className="text-gray-400 text-sm mt-1 line-clamp-2">{item.description}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-green-400 font-bold text-lg">${basePrice.toFixed(2)}</span>
                        {item?.price_type && <span className="text-gray-500 text-xs">/ {item.price_type}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Variants */}
                  {item?.variations?.length > 0 && (
                    <div>
                      <label className="text-gray-300 text-sm font-medium block mb-2">Select Variant</label>
                      <div className="grid grid-cols-2 gap-2">
                        {item.variations.map(v => (
                          <button
                            key={v.id}
                            onClick={() => setForm(f => ({ ...f, selectedVariant: f.selectedVariant?.id === v.id ? null : v }))}
                            className={`p-3 rounded-xl border text-left transition ${form.selectedVariant?.id === v.id ? 'border-purple-500 bg-purple-500/20 text-white' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'}`}
                          >
                            <p className="font-medium text-sm">{v.name}</p>
                            {v.price_modifier !== 0 && <p className="text-xs mt-0.5">{v.price_modifier > 0 ? '+' : ''}{v.price_modifier}%</p>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add-ons */}
                  {item?.add_ons?.length > 0 && (
                    <div>
                      <label className="text-gray-300 text-sm font-medium block mb-2">Add-ons (Optional)</label>
                      <div className="space-y-2">
                        {item.add_ons.map(ao => {
                          const selected = form.selectedAddOns.some(x => x.id === ao.id);
                          return (
                            <button
                              key={ao.id}
                              onClick={() => setForm(f => ({
                                ...f,
                                selectedAddOns: selected ? f.selectedAddOns.filter(x => x.id !== ao.id) : [...f.selectedAddOns, ao]
                              }))}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border transition ${selected ? 'border-purple-500 bg-purple-500/20 text-white' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'}`}
                            >
                              <div className="text-left">
                                <p className="font-medium text-sm">{ao.name}</p>
                                {ao.description && <p className="text-xs text-gray-400">{ao.description}</p>}
                              </div>
                              <span className="text-green-400 font-semibold">+${parseFloat(ao.price || 0).toFixed(2)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quantity (products only) */}
                  {['product_order', 'food_order'].includes(orderType) && (
                    <div>
                      <label className="text-gray-300 text-sm font-medium block mb-2">Quantity</label>
                      <div className="flex items-center gap-4">
                        <button onClick={() => setForm(f => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold text-lg transition">−</button>
                        <span className="text-white font-bold text-xl w-8 text-center">{form.quantity}</span>
                        <button onClick={() => setForm(f => ({ ...f, quantity: f.quantity + 1 }))} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold text-lg transition">+</button>
                      </div>
                    </div>
                  )}

                  {/* Subscription interval */}
                  {orderType === 'subscription' && (
                    <div>
                      <label className="text-gray-300 text-sm font-medium block mb-2">Billing Interval</label>
                      <div className="grid grid-cols-2 gap-3">
                        {['monthly', 'yearly'].map(interval => (
                          <button
                            key={interval}
                            onClick={() => setForm(f => ({ ...f, subscription_interval: interval }))}
                            className={`p-3 rounded-xl border transition ${form.subscription_interval === interval ? 'border-purple-500 bg-purple-500/20 text-white' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'}`}
                          >
                            <p className="font-bold capitalize">{interval}</p>
                            {interval === 'yearly' && <p className="text-xs text-green-400 mt-0.5">Save ~20%</p>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <Textarea
                    placeholder="Special requests or notes (optional)"
                    value={form.customer_notes}
                    onChange={e => setForm(f => ({ ...f, customer_notes: e.target.value }))}
                    rows={2}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 resize-none"
                  />

                  <PriceSummary total={lineTotal} platformFee={platformFee} providerEarnings={providerEarnings} platformFeeRate={platformFeeRate} />

                  <Button onClick={goNext} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 font-bold py-5">
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* ── STEP: Schedule ── */}
              {stepName === 'Schedule' && (
                <motion.div key="step-schedule" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm font-medium block mb-2 flex items-center gap-2"><Calendar className="w-4 h-4" /> Select Date</label>
                    <Input
                      type="date"
                      min={getTomorrowDate()}
                      value={form.booking_date}
                      onChange={e => setForm(f => ({ ...f, booking_date: e.target.value, booking_time: '' }))}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  {form.booking_date && (
                    <div>
                      <label className="text-gray-300 text-sm font-medium block mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> Select Time</label>
                      {loadingSlots ? (
                        <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>
                      ) : availableSlots.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-4">No slots available on this day. Choose another date.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {availableSlots.map(slot => (
                            <button
                              key={slot}
                              onClick={() => setForm(f => ({ ...f, booking_time: slot }))}
                              className={`p-3 rounded-xl border text-sm font-medium transition ${form.booking_time === slot ? 'border-purple-500 bg-purple-500/20 text-white' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'}`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <Input
                    placeholder="Phone number (optional)"
                    value={form.customer_phone}
                    onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white"
                  />

                  <Button
                    onClick={goNext}
                    disabled={!form.booking_date || !form.booking_time}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 font-bold py-5"
                  >
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* ── STEP: Fulfillment ── */}
              {stepName === 'Delivery' && (
                <motion.div key="step-fulfillment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <label className="text-gray-300 text-sm font-medium block mb-2">How would you like to receive this?</label>
                  <div className="space-y-2">
                    {[
                      { value: 'pickup', label: 'Pickup', desc: 'Pick up from provider', icon: ShoppingBag },
                      { value: 'shipping', label: 'Shipping', desc: 'Shipped to your address', icon: Package },
                      { value: 'local_delivery', label: 'Local Delivery', desc: 'Driver delivers to you', icon: Truck },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setForm(f => ({ ...f, fulfillment_method: opt.value }))}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition ${form.fulfillment_method === opt.value ? 'border-purple-500 bg-purple-500/20 text-white' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'}`}
                      >
                        <opt.icon className="w-5 h-5 flex-shrink-0" />
                        <div className="text-left">
                          <p className="font-semibold text-sm">{opt.label}</p>
                          <p className="text-xs text-gray-400">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {(form.fulfillment_method === 'shipping' || form.fulfillment_method === 'local_delivery') && (
                    <div>
                      <label className="text-gray-300 text-sm font-medium block mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> Delivery Address</label>
                      <Textarea
                        placeholder="Full address including city, state, zip"
                        value={form.fulfillment_method === 'local_delivery' ? form.delivery_address : form.shipping_address}
                        onChange={e => setForm(f => ({
                          ...f,
                          [form.fulfillment_method === 'local_delivery' ? 'delivery_address' : 'shipping_address']: e.target.value
                        }))}
                        rows={3}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 resize-none"
                      />
                      {form.fulfillment_method === 'local_delivery' && (
                        <div className="mt-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                          <p className="text-blue-300 text-xs">🚗 A driver will be dispatched and assigned to your order. You'll be notified with tracking updates.</p>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={goNext}
                    disabled={
                      (form.fulfillment_method === 'local_delivery' && !form.delivery_address.trim()) ||
                      (form.fulfillment_method === 'shipping' && !form.shipping_address.trim())
                    }
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 font-bold py-5"
                  >
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* ── STEP: Payment ── */}
              {stepName === 'Payment' && (
                <motion.div key="step-payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  {/* Order summary */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 text-sm">
                    <h4 className="text-white font-bold mb-3">Order Summary</h4>
                    <SummaryRow label={item?.title} value={`$${unitPrice.toFixed(2)}${form.quantity > 1 ? ` × ${form.quantity}` : ''}`} />
                    {form.selectedAddOns.map(ao => <SummaryRow key={ao.id} label={ao.name} value={`+$${parseFloat(ao.price).toFixed(2)}`} />)}
                    {form.booking_date && <SummaryRow label="Date / Time" value={`${form.booking_date} @ ${form.booking_time}`} />}
                    {form.fulfillment_method !== 'pickup' && form.fulfillment_method && (
                      <SummaryRow label="Fulfillment" value={form.fulfillment_method.replace('_', ' ')} />
                    )}
                    <div className="border-t border-white/10 pt-2 mt-2">
                      <SummaryRow label={`Platform Fee (${Math.round(platformFeeRate * 100)}%)`} value={`$${platformFee.toFixed(2)}`} muted />
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-white font-bold text-base">Total</span>
                        <span className="text-white font-bold text-xl">${lineTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment method selector */}
                  {!clientSecret && (
                    <>
                      <label className="text-gray-300 text-sm font-medium block">Payment Method</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 'stripe', label: 'Card / Bank', icon: CreditCard, desc: 'Visa, Mastercard, ACH' },
                          { value: 'wallet', label: 'SoFlo Wallet', icon: Wallet, desc: `Balance: $${parseFloat(currentUser?.usd_balance || 0).toFixed(2)}` },
                        ].map(pm => (
                          <button
                            key={pm.value}
                            onClick={() => setForm(f => ({ ...f, payment_method: pm.value }))}
                            className={`p-4 rounded-xl border transition text-left ${form.payment_method === pm.value ? 'border-purple-500 bg-purple-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                          >
                            <pm.icon className={`w-5 h-5 mb-2 ${form.payment_method === pm.value ? 'text-purple-400' : 'text-gray-400'}`} />
                            <p className="text-white font-semibold text-sm">{pm.label}</p>
                            <p className="text-gray-400 text-xs">{pm.desc}</p>
                          </button>
                        ))}
                      </div>

                      {form.payment_method === 'wallet' && parseFloat(currentUser?.usd_balance || 0) < lineTotal && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          <p className="text-red-400 text-sm">Insufficient balance. Need ${(lineTotal - parseFloat(currentUser?.usd_balance || 0)).toFixed(2)} more.</p>
                        </div>
                      )}

                      <Button
                        onClick={initiatePayment}
                        disabled={processing || (form.payment_method === 'wallet' && parseFloat(currentUser?.usd_balance || 0) < lineTotal)}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 font-bold py-5 text-base"
                      >
                        {processing ? (
                          <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing...</>
                        ) : (
                          <>{form.payment_method === 'wallet' ? <Wallet className="w-5 h-5 mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />} Pay ${lineTotal.toFixed(2)}</>
                        )}
                      </Button>
                    </>
                  )}

                  {/* Stripe Elements */}
                  {clientSecret && stripePromise && (
                    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#8b5cf6' } } }}>
                      <StripeCheckoutForm
                        amount={lineTotal}
                        onSuccess={onStripeSuccess}
                        onCancel={() => { setClientSecret(null); setStripePromise(null); }}
                        isProcessing={processing}
                        setIsProcessing={setProcessing}
                      />
                    </Elements>
                  )}
                </motion.div>
              )}

              {/* ── STEP: Done ── */}
              {stepName === 'Done' && (
                <motion.div key="step-done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 py-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">{orderType === 'subscription' ? 'Subscribed!' : 'Confirmed!'}</h3>
                    <p className="text-gray-400">
                      {orderType === 'service_booking' ? `Your appointment for "${item?.title}" on ${form.booking_date} at ${form.booking_time} is confirmed.` :
                       orderType === 'subscription' ? `You're now subscribed to "${item?.title}". Enjoy your access!` :
                       orderType === 'digital_product' ? `"${item?.title}" is now available in your account.` :
                       `Your order for "${item?.title}" is confirmed. You'll receive updates shortly.`}
                    </p>
                    {form.fulfillment_method === 'local_delivery' && (
                      <p className="text-blue-300 text-sm mt-2">🚗 A driver is being dispatched and will be assigned to your delivery.</p>
                    )}
                  </div>
                  <div className="space-y-3">
                    {orderType === 'service_booking' && (
                      <Button onClick={() => navigate(createPageUrl("CustomerBookings"))} className="w-full bg-purple-600 hover:bg-purple-700">
                        View My Bookings
                      </Button>
                    )}
                    {['product_order', 'food_order'].includes(orderType) && (
                      <Button onClick={() => navigate(createPageUrl("CustomerBookings"))} className="w-full bg-purple-600 hover:bg-purple-700">
                        Track My Order
                      </Button>
                    )}
                    <Button onClick={onClose} variant="outline" className="w-full border-white/20 text-white">
                      Close
                    </Button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function orderTypeLabel(t) {
  return { service_booking: 'Book Service', product_order: 'Order Product', digital_product: 'Purchase', subscription: 'Subscribe', experience: 'Book Experience', food_order: 'Order Food' }[t] || 'Checkout';
}
function SummaryRow({ label, value, muted }) {
  return (
    <div className={`flex justify-between items-center ${muted ? 'text-gray-500' : 'text-gray-300'}`}>
      <span className="text-sm">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
function PriceSummary({ total, platformFee, providerEarnings, platformFeeRate }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1.5 text-sm">
      <div className="flex justify-between text-gray-400">
        <span>Platform fee ({Math.round(platformFeeRate * 100)}%)</span>
        <span>${platformFee.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-white font-bold text-base pt-1 border-t border-white/10 mt-1">
        <span>Total</span>
        <span>${total.toFixed(2)}</span>
      </div>
    </div>
  );
}