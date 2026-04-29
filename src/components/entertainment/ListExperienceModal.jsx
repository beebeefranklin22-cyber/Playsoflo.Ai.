import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileSelect } from "@/components/ui/MobileSelect";
import { triggerHaptic } from "@/components/ui/haptic";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { X, Upload, Loader2, Sparkles, Plus, Calendar as CalendarIcon, Ticket, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function ListExperienceModal({ isOpen, onClose, currentUser }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(1);
  const [experience, setExperience] = useState({
    title: "",
    description: "",
    category: "yacht_charter",
    price: 0,
    provider_email: currentUser?.email || "",
    provider_name: currentUser?.full_name || "",
    provider_phone: "",
    image_url: "",
    gallery_images: [],
    venue_name: "",
    venue_address: "",
    venue_city: "",
    venue_state: "",
    venue_zipcode: "",
    requires_tickets: false,
    ticket_types: [],
    total_capacity: 0,
    availability_type: "single_event",
    event_dates: [],
    duration_minutes: 60,
    cancellation_policy: "Full refund up to 24 hours before event",
    refund_policy: "100% refund within 24 hours",
    age_restriction: "All ages welcome",
    dress_code: "Casual",
    included_amenities: [],
    special_requirements: "",
    pricing_tiers: [],
    pass_types: [],
    batch_prefix: `${Date.now().toString(36).toUpperCase().slice(-6)}`,
    current_batch_number: 0
  });

  const [newAmenity, setNewAmenity] = useState("");
  const [newTicketType, setNewTicketType] = useState({ type: "", price: 0, available: 0, description: "" });
  const [newPricingTier, setNewPricingTier] = useState({ name: "", price: 0, description: "", capacity: 0 });
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventTime, setEventTime] = useState({ start_time: "", end_time: "", capacity: 0 });
  const [newPass, setNewPass] = useState({ 
    pass_name: "", 
    pass_type: "day_pass", 
    price: 0, 
    validity_days: 1, 
    visit_limit: 999, 
    perks: [], 
    available_quantity: 100,
    description: "",
    benefits: [],
    rules: [],
    void_policies: []
  });
  const [newPerk, setNewPerk] = useState("");
  const [newBenefit, setNewBenefit] = useState("");
  const [newRule, setNewRule] = useState("");
  const [newVoidPolicy, setNewVoidPolicy] = useState({ reason: "", refund_percent: 0 });

  const createExperienceMutation = useMutation({
    mutationFn: (data) => base44.entities.Experience.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['entertainment-experiences']);
      toast.success('Experience listed successfully!');
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to list experience');
    }
  });

  const resetForm = () => {
    setStep(1);
    setExperience({
      title: "",
      description: "",
      category: "yacht_charter",
      price: 0,
      provider_email: currentUser?.email || "",
      provider_name: currentUser?.full_name || "",
      provider_phone: "",
      image_url: "",
      gallery_images: [],
      venue_name: "",
      venue_address: "",
      venue_city: "",
      venue_state: "",
      venue_zipcode: "",
      requires_tickets: false,
      ticket_types: [],
      total_capacity: 0,
      availability_type: "single_event",
      event_dates: [],
      duration_minutes: 60,
      cancellation_policy: "Full refund up to 24 hours before event",
      refund_policy: "100% refund within 24 hours",
      age_restriction: "All ages welcome",
      dress_code: "Casual",
      included_amenities: [],
      special_requirements: "",
      pricing_tiers: []
    });
  };

  const handleImageUpload = async (file, isGallery = false) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (isGallery) {
        setExperience(prev => ({ ...prev, gallery_images: [...prev.gallery_images, file_url] }));
      } else {
        setExperience(prev => ({ ...prev, image_url: file_url }));
      }
      toast.success('Image uploaded!');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!experience.title || !experience.price || !experience.image_url) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (experience.requires_tickets && experience.ticket_types.length === 0) {
      toast.error('Please add at least one ticket type');
      return;
    }

    if (experience.price <= 0) {
      toast.error('Price must be greater than $0');
      return;
    }

    // Server-side validation
    try {
      const validation = await base44.functions.invoke('validateListing', {
        listing_type: 'experience',
        data: {
          ...experience,
          provider_email: currentUser.email,
          provider_name: currentUser.full_name
        }
      });

      if (!validation.data.valid) {
        toast.error(validation.data.errors.join(', '));
        return;
      }

      createExperienceMutation.mutate(validation.data.sanitized_data);
    } catch (error) {
      toast.error('Validation failed: ' + error.message);
    }
  };

  const addTicketType = () => {
    if (!newTicketType.type || newTicketType.price <= 0) {
      toast.error('Please fill in ticket type details');
      return;
    }
    setExperience(prev => ({
      ...prev,
      ticket_types: [...prev.ticket_types, newTicketType],
      total_capacity: prev.total_capacity + newTicketType.available
    }));
    setNewTicketType({ type: "", price: 0, available: 0, description: "" });
  };

  const addEventDate = () => {
    if (!selectedDate || !eventTime.start_time) {
      toast.error('Please select date and time');
      return;
    }
    setExperience(prev => ({
      ...prev,
      event_dates: [...prev.event_dates, {
        date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: eventTime.start_time,
        end_time: eventTime.end_time,
        capacity: eventTime.capacity || prev.total_capacity
      }]
    }));
    setSelectedDate(null);
    setEventTime({ start_time: "", end_time: "", capacity: 0 });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-xl overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%", scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: "100%", scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl bg-gray-900 rounded-t-3xl sm:rounded-3xl flex flex-col my-0 sm:my-8"
          style={{ maxHeight: '92vh', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-center justify-between p-6 sm:p-8 pb-0 flex-shrink-0">

            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-400" />
              List Your Experience
            </h2>
            <button onClick={onClose}>
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 py-4 px-6 sm:px-8 flex-shrink-0">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition ${
                  s === step ? 'bg-purple-600 text-white' : s < step ? 'bg-green-600 text-white' : 'bg-white/10 text-gray-400'
                }`}
              >
                {s}
              </div>
            ))}
          </div>

          <div className="space-y-6 overflow-y-auto flex-1 px-6 sm:px-8 pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            {step === 1 && (
              <>
                <div>
                  <label className="text-white font-semibold mb-2 block">Experience Title *</label>
                  <Input
                    value={experience.title}
                    onChange={(e) => setExperience({ ...experience, title: e.target.value })}
                    placeholder="Sunset Yacht Charter Experience"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="text-white font-semibold mb-2 block">Category *</label>
                  <MobileSelect 
                    value={experience.category} 
                    onValueChange={(v) => {
                      triggerHaptic('light');
                      setExperience({ ...experience, category: v });
                    }}
                    placeholder="Select category"
                    triggerClassName="bg-white/10 border-white/20 text-white"
                  >
                    <MobileSelect.Item value="yacht_charter">Yacht Charter</MobileSelect.Item>
                    <MobileSelect.Item value="exotic_car">Exotic Car</MobileSelect.Item>
                    <MobileSelect.Item value="wine_tasting">Wine Tasting</MobileSelect.Item>
                    <MobileSelect.Item value="photography">Photography</MobileSelect.Item>
                    <MobileSelect.Item value="event_planning">Event Planning</MobileSelect.Item>
                    <MobileSelect.Item value="nightlife">Nightlife</MobileSelect.Item>
                    <MobileSelect.Item value="comedy_clubs">Comedy Clubs</MobileSelect.Item>
                    <MobileSelect.Item value="concerts">Concerts</MobileSelect.Item>
                    <MobileSelect.Item value="theatre">Theatre</MobileSelect.Item>
                    <MobileSelect.Item value="festivals">Festivals</MobileSelect.Item>
                    <MobileSelect.Item value="karaoke">Karaoke</MobileSelect.Item>
                    <MobileSelect.Item value="escape_rooms">Escape Rooms</MobileSelect.Item>
                    <MobileSelect.Item value="arcade">Arcade</MobileSelect.Item>
                    <MobileSelect.Item value="bowling">Bowling</MobileSelect.Item>
                    <MobileSelect.Item value="cinema">Cinema</MobileSelect.Item>
                    <MobileSelect.Item value="theme_parks">Theme Parks</MobileSelect.Item>
                    <MobileSelect.Item value="water_parks">Water Parks</MobileSelect.Item>
                    <MobileSelect.Item value="casinos">Casinos</MobileSelect.Item>
                    <MobileSelect.Item value="paint_sip">Paint & Sip</MobileSelect.Item>
                    <MobileSelect.Item value="axe_throwing">Axe Throwing</MobileSelect.Item>
                    <MobileSelect.Item value="silent_disco">Silent Disco</MobileSelect.Item>
                    <MobileSelect.Item value="drag_shows">Drag Shows</MobileSelect.Item>
                    <MobileSelect.Item value="roller_skating">Roller Skating</MobileSelect.Item>
                    <MobileSelect.Item value="go_karts">Go Karts</MobileSelect.Item>
                    <MobileSelect.Item value="helicopter_tours">Helicopter Tours</MobileSelect.Item>
                    <MobileSelect.Item value="skydiving">Skydiving</MobileSelect.Item>
                    <MobileSelect.Item value="hot_air_balloon">Hot Air Balloon</MobileSelect.Item>
                    <MobileSelect.Item value="cooking_classes">Cooking Classes</MobileSelect.Item>
                    <MobileSelect.Item value="dance_classes">Dance Classes</MobileSelect.Item>
                    <MobileSelect.Item value="virtual_reality">Virtual Reality</MobileSelect.Item>
                    <MobileSelect.Item value="other">Other (Describe in details)</MobileSelect.Item>
                    </MobileSelect>
                </div>

                <div>
                  <label className="text-white font-semibold mb-2 block">Description *</label>
                  <Textarea
                    value={experience.description}
                    onChange={(e) => setExperience({ ...experience, description: e.target.value })}
                    placeholder="Describe your experience in detail..."
                    rows={4}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-white font-semibold mb-2 block">Base Price (USD) *</label>
                    <Input
                      type="number"
                      value={experience.price}
                      onChange={(e) => setExperience({ ...experience, price: Number(e.target.value) })}
                      placeholder="0"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-white font-semibold mb-2 block">Duration (minutes)</label>
                    <Input
                      type="number"
                      value={experience.duration_minutes}
                      onChange={(e) => setExperience({ ...experience, duration_minutes: Number(e.target.value) })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-white font-semibold mb-2 block">Contact Phone</label>
                  <Input
                    value={experience.provider_phone}
                    onChange={(e) => setExperience({ ...experience, provider_phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="text-white font-semibold mb-2 block">Main Cover Photo *</label>
                  {experience.image_url && (
                    <img src={experience.image_url} className="w-full h-48 object-cover rounded-lg mb-3 border-2 border-purple-500" />
                  )}
                  <input
                    id="cover-photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files?.[0], false)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => document.getElementById('cover-photo').click()}
                    disabled={uploading}
                    variant="outline"
                    className="w-full"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload Cover Photo
                  </Button>
                </div>

                <div>
                  <label className="text-white font-semibold mb-2 block">Gallery Photos</label>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {experience.gallery_images.map((img, idx) => (
                      <div key={idx} className="relative">
                        <img src={img} className="w-full h-24 object-cover rounded-lg" />
                        <button
                          onClick={() => setExperience(prev => ({
                            ...prev,
                            gallery_images: prev.gallery_images.filter((_, i) => i !== idx)
                          }))}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <input
                    id="gallery-photos"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      files.forEach(file => handleImageUpload(file, true));
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => document.getElementById('gallery-photos').click()}
                    disabled={uploading}
                    variant="outline"
                    className="w-full"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Add Gallery Photos
                  </Button>
                </div>

                <div>
                  <label className="text-white font-semibold mb-2 block">Venue Name</label>
                  <Input
                    value={experience.venue_name}
                    onChange={(e) => setExperience({ ...experience, venue_name: e.target.value })}
                    placeholder="Miami Beach Marina"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="text-white font-semibold mb-2 block">Venue Address</label>
                  <Input
                    value={experience.venue_address}
                    onChange={(e) => setExperience({ ...experience, venue_address: e.target.value })}
                    placeholder="123 Ocean Drive"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-white font-semibold mb-2 block">City</label>
                    <Input
                      value={experience.venue_city}
                      onChange={(e) => setExperience({ ...experience, venue_city: e.target.value })}
                      placeholder="Miami"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-white font-semibold mb-2 block">State</label>
                    <Input
                      value={experience.venue_state}
                      onChange={(e) => setExperience({ ...experience, venue_state: e.target.value })}
                      placeholder="FL"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-white font-semibold mb-2 block">Zipcode</label>
                    <Input
                      value={experience.venue_zipcode}
                      onChange={(e) => setExperience({ ...experience, venue_zipcode: e.target.value })}
                      placeholder="33139"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-white font-semibold mb-2 block">Included Amenities</label>
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={newAmenity}
                      onChange={(e) => setNewAmenity(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newAmenity.trim()) {
                          e.preventDefault();
                          setExperience(prev => ({ ...prev, included_amenities: [...prev.included_amenities, newAmenity.trim()] }));
                          setNewAmenity("");
                        }
                      }}
                      placeholder="Champagne, Catering, etc."
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (newAmenity.trim()) {
                          setExperience(prev => ({ ...prev, included_amenities: [...prev.included_amenities, newAmenity.trim()] }));
                          setNewAmenity("");
                        }
                      }}
                      className="bg-purple-600"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {experience.included_amenities.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full">
                        <span className="text-white text-sm">{item}</span>
                        <button
                          onClick={() => setExperience(prev => ({
                            ...prev,
                            included_amenities: prev.included_amenities.filter((_, i) => i !== idx)
                          }))}
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="flex items-center gap-3 p-4 bg-purple-500/20 rounded-xl">
                  <Switch
                    checked={experience.requires_tickets}
                    onCheckedChange={(checked) => setExperience({ ...experience, requires_tickets: checked })}
                  />
                  <div>
                    <p className="text-white font-semibold">Requires E-Tickets</p>
                    <p className="text-gray-400 text-sm">Enable ticketing system for this experience</p>
                  </div>
                </div>

                {experience.requires_tickets && (
                  <>
                    <div className="bg-white/5 rounded-xl p-4 space-y-4">
                      <h3 className="text-white font-bold flex items-center gap-2">
                        <Ticket className="w-5 h-5" />
                        Add Ticket Types
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <Input
                          value={newTicketType.type}
                          onChange={(e) => setNewTicketType({ ...newTicketType, type: e.target.value })}
                          placeholder="e.g., General Admission, VIP"
                          className="bg-white/10 border-white/20 text-white"
                        />
                        <Input
                          type="number"
                          value={newTicketType.price}
                          onChange={(e) => setNewTicketType({ ...newTicketType, price: Number(e.target.value) })}
                          placeholder="Price"
                          className="bg-white/10 border-white/20 text-white"
                        />
                        <Input
                          type="number"
                          value={newTicketType.available}
                          onChange={(e) => setNewTicketType({ ...newTicketType, available: Number(e.target.value) })}
                          placeholder="Available Quantity"
                          className="bg-white/10 border-white/20 text-white"
                        />
                        <Input
                          value={newTicketType.description}
                          onChange={(e) => setNewTicketType({ ...newTicketType, description: e.target.value })}
                          placeholder="Description"
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <Button onClick={addTicketType} className="w-full bg-purple-600">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Ticket Type
                      </Button>

                      {experience.ticket_types.length > 0 && (
                        <div className="space-y-2">
                          {experience.ticket_types.map((ticket, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                              <div>
                                <p className="text-white font-semibold">{ticket.type}</p>
                                <p className="text-gray-400 text-sm">${ticket.price} • {ticket.available} available</p>
                              </div>
                              <button
                                onClick={() => setExperience(prev => ({
                                  ...prev,
                                  ticket_types: prev.ticket_types.filter((_, i) => i !== idx),
                                  total_capacity: prev.total_capacity - ticket.available
                                }))}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <label className="text-white font-semibold mb-2 block">Availability Type</label>
                  <MobileSelect 
                    value={experience.availability_type} 
                    onValueChange={(v) => {
                      triggerHaptic('light');
                      setExperience({ ...experience, availability_type: v });
                    }}
                    placeholder="Select availability type"
                    triggerClassName="bg-white/10 border-white/20 text-white"
                  >
                    <MobileSelect.Item value="single_event">Single Event</MobileSelect.Item>
                    <MobileSelect.Item value="recurring">Recurring Schedule</MobileSelect.Item>
                    <MobileSelect.Item value="open_availability">Open Availability</MobileSelect.Item>
                  </MobileSelect>
                </div>

                {experience.availability_type === 'single_event' && (
                  <div className="bg-white/5 rounded-xl p-4 space-y-4">
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5" />
                      Event Dates & Times
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="rounded-md border border-white/20 bg-white/5 text-white"
                      />
                      <div className="space-y-3">
                        <Input
                          type="time"
                          value={eventTime.start_time}
                          onChange={(e) => setEventTime({ ...eventTime, start_time: e.target.value })}
                          placeholder="Start Time"
                          className="bg-white/10 border-white/20 text-white"
                        />
                        <Input
                          type="time"
                          value={eventTime.end_time}
                          onChange={(e) => setEventTime({ ...eventTime, end_time: e.target.value })}
                          placeholder="End Time"
                          className="bg-white/10 border-white/20 text-white"
                        />
                        <Input
                          type="number"
                          value={eventTime.capacity}
                          onChange={(e) => setEventTime({ ...eventTime, capacity: Number(e.target.value) })}
                          placeholder="Capacity (optional)"
                          className="bg-white/10 border-white/20 text-white"
                        />
                        <Button onClick={addEventDate} className="w-full bg-purple-600">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Date
                        </Button>
                      </div>
                    </div>

                    {experience.event_dates.length > 0 && (
                      <div className="space-y-2">
                        {experience.event_dates.map((ed, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                            <div>
                              <p className="text-white font-semibold">{ed.date}</p>
                              <p className="text-gray-400 text-sm">{ed.start_time} - {ed.end_time}</p>
                            </div>
                            <button
                              onClick={() => setExperience(prev => ({
                                ...prev,
                                event_dates: prev.event_dates.filter((_, i) => i !== idx)
                              }))}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {step === 4 && (
              <>
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
                  <h3 className="text-white font-bold mb-3">Step 4: Scheduling (Optional)</h3>
                  <p className="text-gray-300 text-sm mb-4">Advanced scheduling and seating features available after listing</p>
                  <Button 
                    onClick={() => setStep(5)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Skip to Next Step
                  </Button>
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4 mb-6">
                  <h3 className="text-white font-bold flex items-center gap-2 mb-3">
                    <Ticket className="w-5 h-5" />
                    Passes & Memberships
                  </h3>
                  <p className="text-purple-300 text-sm mb-4">Create day passes, week passes, VIP passes, or custom passes</p>

                  <div className="bg-white/5 rounded-xl p-4 space-y-4 mb-4">
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-white text-sm mb-1 block">Pass Name</label>
                        <Input
                          value={newPass.pass_name}
                          onChange={(e) => setNewPass({ ...newPass, pass_name: e.target.value })}
                          placeholder="Weekend VIP Pass"
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-white text-sm mb-1 block">Pass Type</label>
                        <MobileSelect 
                          value={newPass.pass_type} 
                          onValueChange={(v) => {
                            triggerHaptic('light');
                            const defaults = {
                              day_pass: { validity_days: 1, visit_limit: 999 },
                              week_pass: { validity_days: 7, visit_limit: 999 },
                              month_pass: { validity_days: 30, visit_limit: 999 },
                              vip_pass: { validity_days: 365, visit_limit: 999 },
                              custom_pass: { validity_days: 1, visit_limit: 1 }
                            };
                            setNewPass({ ...newPass, pass_type: v, ...defaults[v] });
                          }}
                          placeholder="Select pass type"
                          triggerClassName="bg-white/10 border-white/20 text-white"
                        >
                          <MobileSelect.Item value="day_pass">Day Pass</MobileSelect.Item>
                          <MobileSelect.Item value="week_pass">Week Pass</MobileSelect.Item>
                          <MobileSelect.Item value="month_pass">Month Pass</MobileSelect.Item>
                          <MobileSelect.Item value="vip_pass">VIP Pass</MobileSelect.Item>
                          <MobileSelect.Item value="custom_pass">Custom Pass</MobileSelect.Item>
                        </MobileSelect>
                      </div>
                      <div>
                        <label className="text-white text-sm mb-1 block">Price (USD)</label>
                        <Input
                          type="number"
                          value={newPass.price}
                          onChange={(e) => setNewPass({ ...newPass, price: Number(e.target.value) })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-white text-sm mb-1 block">Valid For (Days)</label>
                        <Input
                          type="number"
                          value={newPass.validity_days}
                          onChange={(e) => setNewPass({ ...newPass, validity_days: Number(e.target.value) })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-white text-sm mb-1 block">Visit Limit</label>
                        <Input
                          type="number"
                          value={newPass.visit_limit}
                          onChange={(e) => setNewPass({ ...newPass, visit_limit: Number(e.target.value) })}
                          placeholder="999 for unlimited"
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-white text-sm mb-1 block">Available Quantity</label>
                        <Input
                          type="number"
                          value={newPass.available_quantity}
                          onChange={(e) => setNewPass({ ...newPass, available_quantity: Number(e.target.value) })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-white text-sm mb-1 block">Description</label>
                      <Input
                        value={newPass.description}
                        onChange={(e) => setNewPass({ ...newPass, description: e.target.value })}
                        placeholder="Access to all attractions, skip lines..."
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-white text-sm mb-2 block">VIP Perks</label>
                      <div className="flex gap-2 mb-3">
                        <Input
                          value={newPerk}
                          onChange={(e) => setNewPerk(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && newPerk.trim()) {
                              e.preventDefault();
                              setNewPass(prev => ({ ...prev, perks: [...(prev.perks || []), newPerk.trim()] }));
                              setNewPerk("");
                            }
                          }}
                          placeholder="Skip lines, Free drinks, etc."
                          className="bg-white/10 border-white/20 text-white text-sm"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (newPerk.trim()) {
                              setNewPass(prev => ({ ...prev, perks: [...(prev.perks || []), newPerk.trim()] }));
                              setNewPerk("");
                            }
                          }}
                          size="sm"
                          className="bg-purple-600"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {newPass.perks?.map((perk, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full">
                            <span className="text-white text-xs">{perk}</span>
                            <button
                              onClick={() => setNewPass(prev => ({
                                ...prev,
                                perks: prev.perks.filter((_, i) => i !== idx)
                              }))}
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-white text-sm mb-2 block">Benefits & Features</label>
                      <div className="flex gap-2 mb-3">
                        <Input
                          value={newBenefit}
                          onChange={(e) => setNewBenefit(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && newBenefit.trim()) {
                              e.preventDefault();
                              setNewPass(prev => ({ ...prev, benefits: [...(prev.benefits || []), newBenefit.trim()] }));
                              setNewBenefit("");
                            }
                          }}
                          placeholder="Priority seating, Discount on food, etc."
                          className="bg-white/10 border-white/20 text-white text-sm"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (newBenefit.trim()) {
                              setNewPass(prev => ({ ...prev, benefits: [...(prev.benefits || []), newBenefit.trim()] }));
                              setNewBenefit("");
                            }
                          }}
                          size="sm"
                          className="bg-blue-600"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {newPass.benefits?.map((benefit, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full">
                            <span className="text-white text-xs">{benefit}</span>
                            <button
                              onClick={() => setNewPass(prev => ({
                                ...prev,
                                benefits: prev.benefits.filter((_, i) => i !== idx)
                              }))}
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-white text-sm mb-2 block">Rules & Regulations</label>
                      <div className="flex gap-2 mb-3">
                        <Input
                          value={newRule}
                          onChange={(e) => setNewRule(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && newRule.trim()) {
                              e.preventDefault();
                              setNewPass(prev => ({ ...prev, rules: [...(prev.rules || []), newRule.trim()] }));
                              setNewRule("");
                            }
                          }}
                          placeholder="No outside food, Must show ID, etc."
                          className="bg-white/10 border-white/20 text-white text-sm"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (newRule.trim()) {
                              setNewPass(prev => ({ ...prev, rules: [...(prev.rules || []), newRule.trim()] }));
                              setNewRule("");
                            }
                          }}
                          size="sm"
                          className="bg-orange-600"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {newPass.rules?.map((rule, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-orange-500/20 rounded-full">
                            <span className="text-white text-xs">{rule}</span>
                            <button
                              onClick={() => setNewPass(prev => ({
                                ...prev,
                                rules: prev.rules.filter((_, i) => i !== idx)
                              }))}
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-white text-sm mb-2 block">Voiding Policies</label>
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                        <div className="grid md:grid-cols-2 gap-3 mb-3">
                          <Input
                            value={newVoidPolicy.reason}
                            onChange={(e) => setNewVoidPolicy({ ...newVoidPolicy, reason: e.target.value })}
                            placeholder="e.g., Disruptive behavior, Intoxication"
                            className="bg-white/10 border-white/20 text-white text-sm"
                          />
                          <MobileSelect
                            value={String(newVoidPolicy.refund_percent)}
                            onValueChange={(v) => {
                              triggerHaptic('light');
                              setNewVoidPolicy({ ...newVoidPolicy, refund_percent: Number(v) });
                            }}
                            placeholder="Refund percentage"
                            triggerClassName="bg-white/10 border-white/20 text-white"
                          >
                            <MobileSelect.Item value="0">No Refund (0%)</MobileSelect.Item>
                            <MobileSelect.Item value="25">Partial Refund (25%)</MobileSelect.Item>
                            <MobileSelect.Item value="50">Half Refund (50%)</MobileSelect.Item>
                            <MobileSelect.Item value="75">Mostly Refund (75%)</MobileSelect.Item>
                            <MobileSelect.Item value="100">Full Refund (100%)</MobileSelect.Item>
                          </MobileSelect>
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            if (newVoidPolicy.reason.trim()) {
                              setNewPass(prev => ({ 
                                ...prev, 
                                void_policies: [...(prev.void_policies || []), newVoidPolicy] 
                              }));
                              setNewVoidPolicy({ reason: "", refund_percent: 0 });
                            }
                          }}
                          size="sm"
                          className="w-full bg-red-600"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Voiding Policy
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {newPass.void_policies?.map((policy, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <div className="flex-1">
                              <p className="text-white text-sm font-semibold">{policy.reason}</p>
                              <p className="text-gray-400 text-xs">
                                {policy.refund_percent}% refund
                              </p>
                            </div>
                            <button
                              onClick={() => setNewPass(prev => ({
                                ...prev,
                                void_policies: prev.void_policies.filter((_, i) => i !== idx)
                              }))}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button 
                      onClick={() => {
                        if (!newPass.pass_name || newPass.price <= 0) {
                          toast.error('Please fill in pass name and price');
                          return;
                        }
                        setExperience(prev => ({
                          ...prev,
                          pass_types: [...(prev.pass_types || []), newPass]
                        }));
                        setNewPass({ 
                          pass_name: "", 
                          pass_type: "day_pass", 
                          price: 0, 
                          validity_days: 1, 
                          visit_limit: 999, 
                          perks: [], 
                          available_quantity: 100,
                          description: "",
                          benefits: [],
                          rules: [],
                          void_policies: []
                        });
                        toast.success('Pass added!');
                      }}
                      className="w-full bg-purple-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Pass Type
                    </Button>
                  </div>

                  {experience.pass_types.length > 0 && (
                    <div className="space-y-2">
                      {experience.pass_types.map((pass, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-white/10 rounded-lg">
                          <div className="flex-1">
                            <p className="text-white font-bold">{pass.pass_name}</p>
                            <p className="text-gray-400 text-sm">
                              {pass.pass_type.replace(/_/g, ' ')} • Valid {pass.validity_days} days • {pass.visit_limit} visits
                            </p>
                            <p className="text-purple-300 text-xs mt-1">{pass.description}</p>
                            {pass.perks?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {pass.perks.map((perk, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-purple-500/20 rounded text-xs text-purple-300">
                                    {perk}
                                  </span>
                                ))}
                              </div>
                            )}
                            {pass.benefits?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {pass.benefits.map((benefit, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-blue-500/20 rounded text-xs text-blue-300">
                                    ✓ {benefit}
                                  </span>
                                ))}
                              </div>
                            )}
                            {pass.rules?.length > 0 && (
                              <p className="text-orange-400 text-xs mt-1">{pass.rules.length} rules apply</p>
                            )}
                            {pass.void_policies?.length > 0 && (
                              <p className="text-red-400 text-xs mt-1">{pass.void_policies.length} voiding policies</p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-green-400 font-bold text-lg">${pass.price}</p>
                            <button
                              onClick={() => setExperience(prev => ({
                                ...prev,
                                pass_types: prev.pass_types.filter((_, i) => i !== idx)
                              }))}
                              className="text-red-400 hover:text-red-300 text-sm mt-2"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-white font-semibold mb-2 block">Cancellation Policy</label>
                  <Textarea
                    value={experience.cancellation_policy}
                    onChange={(e) => setExperience({ ...experience, cancellation_policy: e.target.value })}
                    rows={3}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="text-white font-semibold mb-2 block">Refund Policy</label>
                  <Textarea
                    value={experience.refund_policy}
                    onChange={(e) => setExperience({ ...experience, refund_policy: e.target.value })}
                    rows={3}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-white font-semibold mb-2 block">Age Restriction</label>
                    <Input
                      value={experience.age_restriction}
                      onChange={(e) => setExperience({ ...experience, age_restriction: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-white font-semibold mb-2 block">Dress Code</label>
                    <Input
                      value={experience.dress_code}
                      onChange={(e) => setExperience({ ...experience, dress_code: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-white font-semibold mb-2 block">Special Requirements</label>
                  <Textarea
                    value={experience.special_requirements}
                    onChange={(e) => setExperience({ ...experience, special_requirements: e.target.value })}
                    placeholder="Any special requirements or notes..."
                    rows={3}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
                  <h3 className="text-white font-bold flex items-center gap-2 mb-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Integration
                  </h3>
                  <p className="text-gray-300 text-sm mb-3">Connect your Stripe account to receive payments directly</p>
                  <Button 
                    onClick={() => window.location.href = '/StripeOnboarding'}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Connect Stripe Account
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 p-6 sm:p-8 pt-4 flex-shrink-0 border-t border-white/10">
            {step > 1 && (
              <Button 
                variant="outline" 
                onClick={() => {
                  triggerHaptic('light');
                  setStep(step - 1);
                }} 
                className="flex-1 min-h-[44px]"
              >
                Back
              </Button>
            )}
            {step < 5 ? (
              <Button 
                onClick={() => {
                  triggerHaptic('light');
                  setStep(step + 1);
                }} 
                className="flex-1 bg-purple-600 hover:bg-purple-700 min-h-[44px]"
              >
                Next Step
              </Button>
            ) : (
              <Button
                onClick={() => {
                  triggerHaptic('medium');
                  handleSubmit();
                }}
                disabled={createExperienceMutation.isPending || uploading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 min-h-[44px]"
              >
                {createExperienceMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  'Publish Experience'
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}