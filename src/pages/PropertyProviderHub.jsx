import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Home, Building, Hotel, Plus, Upload, X, MapPin, Bed, Bath,
  Maximize, Star, DollarSign, Calendar, Check, ChevronLeft,
  Clock, TrendingUp, Users, Inbox
} from "lucide-react";
import { toast } from "sonner";
import PropertyCalendar from "../components/property/PropertyCalendar";
import PropertyMessaging from "../components/property/PropertyMessaging";
import PropertyReviewModal from "../components/property/PropertyReviewModal";
import PropertyEditModal from "../components/property/PropertyEditModal";
import HostDashboardOverview from "../components/property/HostDashboardOverview";

export default function PropertyProviderHub() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("properties");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBookingForChat, setSelectedBookingForChat] = useState(null);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const [form, setForm] = useState({
    title: "",
    property_type: "apartment",
    listing_type: "for_rent",
    description: "",
    price_per_night: 0,
    price_per_month: 0,
    sale_price: 0,
    bedrooms: 1,
    bathrooms: 1,
    square_feet: 0,
    location: "",
    address: "",
    amenities: [],
    main_image: "",
    images: [],
    minimum_stay: 1,
    verified_host: false
  });

  const [newAmenity, setNewAmenity] = useState("");

  const { data: myProperties = [] } = useQuery({
    queryKey: ["my-properties", currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.Property.list();
    },
    enabled: !!currentUser,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["property-bookings", currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const allBookings = await base44.entities.Booking.list();
      const propertyIds = myProperties.map(p => p.id);
      return allBookings.filter(b => propertyIds.includes(b.experience_id));
    },
    enabled: !!currentUser && myProperties.length > 0,
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Property.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries(["my-properties"]);
      setShowAddModal(false);
      toast.success("Property listed successfully!");
      setForm({
        title: "",
        property_type: "apartment",
        listing_type: "for_rent",
        description: "",
        price_per_night: 0,
        price_per_month: 0,
        sale_price: 0,
        bedrooms: 1,
        bathrooms: 1,
        square_feet: 0,
        location: "",
        address: "",
        amenities: [],
        main_image: "",
        images: [],
        minimum_stay: 1,
        verified_host: false
      });
    },
  });

  const handleImageUpload = async (file, type) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (type === "main") {
      setForm({ ...form, main_image: file_url });
    } else {
      setForm({ ...form, images: [...(form.images || []), file_url] });
    }
  };

  const addAmenity = () => {
    if (newAmenity.trim()) {
      setForm({ ...form, amenities: [...(form.amenities || []), newAmenity.trim()] });
      setNewAmenity("");
    }
  };

  const totalRevenue = bookings
    .filter(b => b.booking_status === "completed")
    .reduce((sum, b) => sum + (b.total_price_usd || 0), 0);

  const upcomingBookings = bookings.filter(
    b => new Date(b.booking_date) >= new Date() && b.booking_status === "confirmed"
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-emerald-950 to-gray-950 p-6 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white">Property Provider Hub</h1>
            <p className="text-gray-300">Manage your real estate listings</p>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 border-emerald-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Building className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">{myProperties.length}</div>
              <div className="text-emerald-300 text-sm">Total Properties</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">{upcomingBookings}</div>
              <div className="text-blue-300 text-sm">Upcoming Bookings</div>
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

          <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Inbox className="w-8 h-8 text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">{bookings.length}</div>
              <div className="text-purple-300 text-sm">Total Bookings</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/10 border border-white/20">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6 mt-6">
            <HostDashboardOverview bookings={bookings} properties={myProperties} />
          </TabsContent>

          <TabsContent value="properties" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-3 gap-6">
              {myProperties.map((property) => (
                <Card key={property.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="relative h-48 rounded-lg overflow-hidden mb-4">
                      <img
                        src={property.main_image}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge className={
                          property.listing_type === "short_term"
                            ? "bg-yellow-500/90"
                            : property.listing_type === "for_rent"
                            ? "bg-blue-500/90"
                            : "bg-green-500/90"
                        }>
                          {property.listing_type === "short_term" ? "Coming Soon" :
                           property.listing_type === "for_rent" ? "For Rent" : "For Sale"}
                        </Badge>
                      </div>
                    </div>

                    <h3 className="text-white font-bold text-lg mb-2">{property.title}</h3>
                    
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                      <MapPin className="w-4 h-4" />
                      {property.location}
                    </div>

                    <div className="flex items-center gap-4 text-gray-300 text-sm mb-4">
                      {property.bedrooms && (
                        <div className="flex items-center gap-1">
                          <Bed className="w-4 h-4" />
                          <span>{property.bedrooms}</span>
                        </div>
                      )}
                      {property.bathrooms && (
                        <div className="flex items-center gap-1">
                          <Bath className="w-4 h-4" />
                          <span>{property.bathrooms}</span>
                        </div>
                      )}
                      {property.square_feet && (
                        <div className="flex items-center gap-1">
                          <Maximize className="w-4 h-4" />
                          <span>{property.square_feet}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-2xl font-bold text-white mb-2">
                      {property.listing_type === "short_term" && property.price_per_night
                        ? `$${property.price_per_night}/night`
                        : property.listing_type === "for_rent" && property.price_per_month
                        ? `$${property.price_per_month.toLocaleString()}/mo`
                        : property.listing_type === "for_sale" && property.sale_price
                        ? `$${property.sale_price.toLocaleString()}`
                        : "Contact for price"}
                    </div>

                    {property.verified_host && (
                      <div className="flex items-center gap-1 text-green-400 text-sm">
                        <Check className="w-4 h-4" />
                        <span>Verified</span>
                      </div>
                    )}

                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingProperty(property)}
                        className="flex-1"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(createPageUrl("PropertyHostProfile") + `?host=${currentUser.email}`)}
                        className="flex-1"
                      >
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {myProperties.length === 0 && (
              <div className="text-center py-20">
                <Building className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No properties yet</h3>
                <p className="text-gray-400 mb-6">Add your first property to get started</p>
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Property
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <PropertyCalendar bookings={bookings} properties={myProperties} />
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4 mt-6">
            {bookings.length === 0 ? (
              <div className="text-center py-20">
                <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No bookings yet</h3>
                <p className="text-gray-400">Bookings will appear here once guests book your properties</p>
              </div>
            ) : (
              bookings.map((booking) => (
                <Card key={booking.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-white font-bold text-lg mb-1">
                          {booking.experience_title}
                        </h4>
                        <p className="text-gray-400 text-sm mb-2">
                          Check-in: {new Date(booking.booking_date).toLocaleDateString()}
                          {booking.checkout_date && ` • Check-out: ${new Date(booking.checkout_date).toLocaleDateString()}`}
                        </p>
                        <p className="text-gray-400 text-sm mb-2">
                          {booking.number_of_guests} guest{booking.number_of_guests > 1 ? 's' : ''}
                        </p>
                        <Badge className={
                          booking.booking_status === "confirmed"
                            ? "bg-green-500/20 text-green-400"
                            : booking.booking_status === "pending"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : booking.booking_status === "completed"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-red-500/20 text-red-400"
                        }>
                          {booking.booking_status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-2xl">${booking.total_price_usd}</p>
                        <p className="text-gray-400 text-sm">{booking.payment_status}</p>
                      </div>
                    </div>

                    {booking.booking_status === "pending" && (
                      <div className="flex gap-2 pt-4 border-t border-white/10">
                        <Button
                          onClick={async () => {
                            await base44.entities.Booking.update(booking.id, {
                              booking_status: "confirmed"
                            });
                            qc.invalidateQueries(["property-bookings"]);
                            toast.success("Booking confirmed!");
                          }}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={async () => {
                            await base44.entities.Booking.update(booking.id, {
                              booking_status: "cancelled"
                            });
                            qc.invalidateQueries(["property-bookings"]);
                            toast.success("Booking declined");
                          }}
                          variant="outline"
                          className="flex-1"
                        >
                          Decline
                        </Button>
                      </div>
                    )}

                    {booking.special_requests && (
                      <div className="mt-4 bg-white/5 rounded-lg p-3">
                        <p className="text-gray-400 text-sm mb-1">Special Requests:</p>
                        <p className="text-white text-sm">{booking.special_requests}</p>
                      </div>
                    )}

                    <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedBookingForChat(booking)}
                        className="flex-1"
                      >
                        Message Guest
                      </Button>
                      {booking.booking_status === "completed" && !booking.rating && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedBookingForReview(booking)}
                          className="flex-1"
                        >
                          Leave Review
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="messages" className="space-y-4 mt-6">
            {bookings.length === 0 ? (
              <div className="text-center py-20">
                <Inbox className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No conversations yet</h3>
                <p className="text-gray-400">Messages with guests will appear here</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {bookings
                  .filter(b => b.booking_status !== "cancelled")
                  .map((booking) => (
                    <Card key={booking.id} className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition"
                      onClick={() => setSelectedBookingForChat(booking)}>
                      <CardContent className="p-4">
                        <h4 className="text-white font-bold mb-1">{booking.experience_title}</h4>
                        <p className="text-gray-400 text-sm mb-2">
                          {new Date(booking.booking_date).toLocaleDateString()}
                        </p>
                        <Badge className={
                          booking.booking_status === "confirmed"
                            ? "bg-green-500/20 text-green-400"
                            : booking.booking_status === "pending"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-blue-500/20 text-blue-400"
                        }>
                          {booking.booking_status}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Chat Modal */}
        {selectedBookingForChat && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90"
            onClick={() => setSelectedBookingForChat(null)}
          >
            <div
              className="w-full max-w-2xl bg-gray-900 rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                onClick={() => setSelectedBookingForChat(null)}
                className="mb-4"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <PropertyMessaging
                booking={selectedBookingForChat}
                currentUser={currentUser}
                isHost={true}
              />
            </div>
          </div>
        )}

        {/* Review Modal */}
        {selectedBookingForReview && (
          <PropertyReviewModal
            booking={selectedBookingForReview}
            onClose={() => setSelectedBookingForReview(null)}
            isHost={true}
          />
        )}

        {/* Edit Property Modal */}
        {editingProperty && (
          <PropertyEditModal
            property={editingProperty}
            onClose={() => setEditingProperty(null)}
          />
        )}

        {/* Add Property Modal */}
        {showAddModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90"
            onClick={() => setShowAddModal(false)}
          >
            <div
              className="w-full max-w-4xl bg-gray-900 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-3xl font-bold text-white mb-6">Add New Property</h2>

              <div className="space-y-4">
                <Input
                  placeholder="Property Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <Select
                    value={form.property_type}
                    onValueChange={(v) => setForm({ ...form, property_type: v })}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="condo">Condo</SelectItem>
                      <SelectItem value="villa">Villa</SelectItem>
                      <SelectItem value="penthouse">Penthouse</SelectItem>
                      <SelectItem value="hotel">Hotel</SelectItem>
                      <SelectItem value="short_term_rental">Short-Term Rental</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={form.listing_type}
                    onValueChange={(v) => setForm({ ...form, listing_type: v })}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="for_rent">For Rent</SelectItem>
                      <SelectItem value="for_sale">For Sale</SelectItem>
                      <SelectItem value="short_term">Short-Term (Coming Soon)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Textarea
                  placeholder="Property Description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="bg-white/10 border-white/20 text-white h-24"
                />

                <div className="grid md:grid-cols-3 gap-4">
                  {form.listing_type === "short_term" && (
                    <Input
                      type="number"
                      placeholder="Price per Night"
                      value={form.price_per_night}
                      onChange={(e) => setForm({ ...form, price_per_night: Number(e.target.value) })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  )}
                  {form.listing_type === "for_rent" && (
                    <Input
                      type="number"
                      placeholder="Price per Month"
                      value={form.price_per_month}
                      onChange={(e) => setForm({ ...form, price_per_month: Number(e.target.value) })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  )}
                  {form.listing_type === "for_sale" && (
                    <Input
                      type="number"
                      placeholder="Sale Price"
                      value={form.sale_price}
                      onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  )}
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <Input
                    type="number"
                    placeholder="Bedrooms"
                    value={form.bedrooms}
                    onChange={(e) => setForm({ ...form, bedrooms: Number(e.target.value) })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <Input
                    type="number"
                    placeholder="Bathrooms"
                    value={form.bathrooms}
                    onChange={(e) => setForm({ ...form, bathrooms: Number(e.target.value) })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <Input
                    type="number"
                    placeholder="Square Feet"
                    value={form.square_feet}
                    onChange={(e) => setForm({ ...form, square_feet: Number(e.target.value) })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <Input
                  placeholder="Location (City, State)"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />

                <Input
                  placeholder="Full Address (Optional)"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Amenities</label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add amenity (e.g., Pool, WiFi)"
                      value={newAmenity}
                      onChange={(e) => setNewAmenity(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addAmenity()}
                      className="bg-white/10 border-white/20 text-white flex-1"
                    />
                    <Button onClick={addAmenity} variant="outline">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.amenities?.map((amenity, idx) => (
                      <Badge key={idx} className="bg-emerald-500/20 text-emerald-400">
                        {amenity}
                        <button
                          onClick={() =>
                            setForm({
                              ...form,
                              amenities: form.amenities.filter((_, i) => i !== idx),
                            })
                          }
                          className="ml-2"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Main Image</label>
                  {form.main_image && (
                    <img
                      src={form.main_image}
                      alt="main"
                      className="w-full h-48 object-cover rounded-lg mb-2"
                    />
                  )}
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("main-image-upload").click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Main Image
                  </Button>
                  <input
                    id="main-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files[0], "main")}
                    className="hidden"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createPropertyMutation.mutate(form)}
                    disabled={!form.title || !form.location || createPropertyMutation.isPending}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    List Property
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}