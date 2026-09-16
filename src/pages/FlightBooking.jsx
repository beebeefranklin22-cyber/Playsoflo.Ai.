import React, { useState, useMemo } from "react";
import PageWrapper from "@/components/PageWrapper";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plane, ArrowRight, Loader2, AlertCircle, CheckCircle, ArrowLeft, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { searchFlights } from "@/functions/searchFlights";
import { getFlightOfferDetails } from "@/functions/getFlightOfferDetails";
import { bookFlight } from "@/functions/bookFlight";
import FlightAncillaries from "@/components/travel/FlightAncillaries";
import AirportSearchInput from "@/components/travel/AirportSearchInput";

const PLATFORM_FEE_RATE = 0.012;
const emptyPassenger = () => ({ title: "mr", given_name: "", family_name: "", gender: "m", born_on: "" });

function formatDuration(iso) {
  if (!iso) return "";
  const match = iso.match(/PT(\d+H)?(\d+M)?/);
  if (!match) return iso;
  const hours = match[1] ? match[1].replace("H", "h ") : "";
  const minutes = match[2] ? match[2].replace("M", "m") : "";
  return `${hours}${minutes}`.trim();
}

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function maxStops(offer) {
  return Math.max(0, ...offer.slices.map((s) => s.segments.length - 1));
}

export default function FlightBooking() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  // search | results | passengers | loading_ancillaries | ancillaries | review | confirmed
  const [step, setStep] = useState("search");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [offerDetails, setOfferDetails] = useState(null); // { offer, seat_maps }
  const [passengers, setPassengers] = useState([emptyPassenger()]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [booking, setBooking] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  const [sortBy, setSortBy] = useState("price");
  const [nonstopOnly, setNonstopOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");
  const [airlineFilter, setAirlineFilter] = useState("all");

  const [form, setForm] = useState({
    origin: "",
    destination: "",
    departure_date: "",
    return_date: "",
    adult_count: 1,
    cabin_class: "economy",
  });

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  const airlines = useMemo(
    () => [...new Set(offers.map((o) => o.slices[0]?.segments[0]?.airline).filter(Boolean))],
    [offers]
  );

  const visibleOffers = useMemo(() => {
    let list = [...offers];
    if (nonstopOnly) list = list.filter((o) => maxStops(o) === 0);
    if (maxPrice) list = list.filter((o) => Number(o.total_amount) <= Number(maxPrice));
    if (airlineFilter !== "all") list = list.filter((o) => o.slices[0]?.segments[0]?.airline === airlineFilter);
    if (sortBy === "price") list.sort((a, b) => Number(a.total_amount) - Number(b.total_amount));
    if (sortBy === "duration") {
      list.sort((a, b) => {
        const totalMinutes = (o) => o.slices.reduce((sum, s) => sum + (s.duration ? parseDurationMinutes(s.duration) : 0), 0);
        return totalMinutes(a) - totalMinutes(b);
      });
    }
    return list;
  }, [offers, nonstopOnly, maxPrice, airlineFilter, sortBy]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!form.origin || !form.destination || !form.departure_date) {
      toast.error("Origin, destination, and departure date are required");
      return;
    }
    setSearching(true);
    setSearchError(null);
    const { data } = await searchFlights(form);
    setSearching(false);
    if (!data.success) {
      setSearchError(data.error);
      return;
    }
    setOffers(data.offers);
    setNonstopOnly(false);
    setMaxPrice("");
    setAirlineFilter("all");
    setSortBy("price");
    setPassengers(Array.from({ length: form.adult_count }, emptyPassenger));
    setStep("results");
  };

  const selectOffer = (offer) => {
    setSelectedOffer(offer);
    setStep("passengers");
  };

  const updatePassenger = (index, field, value) => {
    setPassengers((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const goToAncillaries = async () => {
    if (passengers.some((p) => !p.given_name || !p.family_name || !p.born_on)) {
      toast.error("Please fill in every passenger's name and date of birth");
      return;
    }
    setStep("loading_ancillaries");
    const { data } = await getFlightOfferDetails({ offer_id: selectedOffer.id });
    if (!data.success) {
      toast.error(data.error || "Could not load add-on options -- please search again");
      setStep("results");
      return;
    }
    setOfferDetails(data);
    setStep("ancillaries");
  };

  const handleAncillariesContinue = (services) => {
    setSelectedServices(services || []);
    setStep("review");
  };

  const priceBreakdown = useMemo(() => {
    if (!offerDetails) return null;
    const flight = Number(offerDetails.offer.total_amount);
    const available = [
      ...(offerDetails.offer.available_services || []),
      ...flattenSeatServicesClient(offerDetails.seat_maps || []),
    ];
    const addOns = selectedServices.reduce((sum, sel) => {
      const match = available.find((s) => s.id === sel.id);
      return sum + (match ? Number(match.total_amount) * (sel.quantity || 1) : 0);
    }, 0);
    const subtotal = flight + addOns;
    const fee = Math.round(subtotal * PLATFORM_FEE_RATE * 100) / 100;
    return { flight, addOns, subtotal, fee, total: Math.round((subtotal + fee) * 100) / 100 };
  }, [offerDetails, selectedServices]);

  const handleBook = async () => {
    setBooking(true);
    const { data } = await bookFlight({
      offer_id: selectedOffer.id,
      passengers,
      services: selectedServices,
      contact_email: currentUser?.email,
    });
    setBooking(false);
    if (!data.success) {
      toast.error(data.error || "Booking failed");
      return;
    }
    setConfirmation(data);
    setStep("confirmed");
  };

  if (step === "confirmed" && confirmation) {
    return (
      <PageWrapper>
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950">
          <Card className="bg-white/5 border-white/10 max-w-md w-full">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Flight Booked!</h2>
              <p className="text-gray-400 mb-4">
                Confirmation number: <span className="text-white font-mono">{confirmation.booking_reference || confirmation.order_id}</span>
              </p>
              <div className="bg-white/5 rounded-lg p-4 text-left text-sm space-y-1 mb-4">
                <div className="flex justify-between text-gray-400"><span>Charged to wallet</span><span className="text-white">${Number(confirmation.total_amount).toFixed(2)}</span></div>
              </div>
              <p className="text-gray-500 text-sm mb-6">A confirmation has been sent to {currentUser?.email}.</p>
              <Button onClick={() => navigate("/Travel")} className="w-full bg-purple-600 hover:bg-purple-700">
                Back to Travel
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate("/Travel")} className="p-2 hover:bg-white/10 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <Plane className="w-7 h-7 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Book Flights</h1>
          </div>

          {step === "search" && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Search Flights</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm mb-1 block">From</label>
                      <AirportSearchInput
                        placeholder="City or airport (e.g. Miami)"
                        iconColor="text-green-400"
                        onSelect={(place) => setForm({ ...form, origin: place?.iata_code || "" })}
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-1 block">To</label>
                      <AirportSearchInput
                        placeholder="City or airport (e.g. New York)"
                        iconColor="text-red-400"
                        onSelect={(place) => setForm({ ...form, destination: place?.iata_code || "" })}
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm mb-1 block">Departure</label>
                      <Input
                        type="date"
                        value={form.departure_date}
                        onChange={(e) => setForm({ ...form, departure_date: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-1 block">Return (optional)</label>
                      <Input
                        type="date"
                        value={form.return_date}
                        onChange={(e) => setForm({ ...form, return_date: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm mb-1 block">Passengers</label>
                      <Input
                        type="number"
                        min={1}
                        max={9}
                        value={form.adult_count}
                        onChange={(e) => setForm({ ...form, adult_count: parseInt(e.target.value, 10) || 1 })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-1 block">Cabin Class</label>
                      <Select value={form.cabin_class} onValueChange={(v) => setForm({ ...form, cabin_class: v })}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="economy">Economy</SelectItem>
                          <SelectItem value="premium_economy">Premium Economy</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="first">First</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {searchError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-red-300 text-sm">{searchError}</p>
                    </div>
                  )}

                  <Button type="submit" disabled={searching} className="w-full bg-purple-600 hover:bg-purple-700 py-6 text-lg">
                    {searching ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plane className="w-5 h-5 mr-2" />}
                    Search Flights
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {step === "results" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setStep("search")} className="border-white/20 text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" /> New Search
                </Button>
              </div>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3 text-white font-semibold">
                    <SlidersHorizontal className="w-4 h-4 text-purple-400" /> Sort & Filter
                  </div>
                  <div className="grid md:grid-cols-4 gap-3">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price">Sort: Price (low to high)</SelectItem>
                        <SelectItem value="duration">Sort: Duration (shortest)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={airlineFilter} onValueChange={setAirlineFilter}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All airlines</SelectItem>
                        {airlines.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Max price ($)"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <label className="flex items-center gap-2 text-white text-sm bg-white/10 border border-white/20 rounded-md px-3">
                      <input type="checkbox" checked={nonstopOnly} onChange={(e) => setNonstopOnly(e.target.checked)} />
                      Nonstop only
                    </label>
                  </div>
                </CardContent>
              </Card>

              {visibleOffers.length === 0 && (
                <p className="text-gray-400 text-center py-12">No flights match your filters. Try widening your search.</p>
              )}
              {visibleOffers.map((offer) => (
                <Card key={offer.id} className="bg-white/5 border-white/10 hover:border-purple-500/50 transition">
                  <CardContent className="p-5">
                    {offer.slices.map((slice, i) => (
                      <div key={i} className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 text-white">
                          <span className="font-semibold">{slice.origin}</span>
                          <ArrowRight className="w-4 h-4 text-gray-500" />
                          <span className="font-semibold">{slice.destination}</span>
                          <span className="text-gray-400 text-sm">{formatDuration(slice.duration)}</span>
                          {slice.segments.length > 1 && (
                            <span className="text-yellow-400 text-xs">{slice.segments.length - 1} stop(s)</span>
                          )}
                        </div>
                        <span className="text-gray-400 text-sm">
                          {formatTime(slice.segments[0]?.departing_at)} - {formatTime(slice.segments[slice.segments.length - 1]?.arriving_at)}
                        </span>
                      </div>
                    ))}
                    <div className="text-gray-500 text-sm mb-3">
                      {offer.slices[0]?.segments[0]?.airline} &middot; {offer.passenger_count} passenger(s)
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-green-400">${Number(offer.total_amount).toFixed(2)}</span>
                      <Button onClick={() => selectOffer(offer)} className="bg-purple-600 hover:bg-purple-700">
                        Select
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {step === "passengers" && selectedOffer && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>Passenger Details</span>
                  <span className="text-green-400 text-xl">${Number(selectedOffer.total_amount).toFixed(2)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {passengers.map((p, i) => (
                  <div key={i} className="border border-white/10 rounded-xl p-4 space-y-3">
                    <p className="text-white font-semibold">Passenger {i + 1}</p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <Input
                        placeholder="First name"
                        value={p.given_name}
                        onChange={(e) => updatePassenger(i, "given_name", e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                      <Input
                        placeholder="Last name"
                        value={p.family_name}
                        onChange={(e) => updatePassenger(i, "family_name", e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-400 text-sm mb-1 block">Date of birth</label>
                        <Input
                          type="date"
                          value={p.born_on}
                          onChange={(e) => updatePassenger(i, "born_on", e.target.value)}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm mb-1 block">Gender</label>
                        <Select value={p.gender} onValueChange={(v) => updatePassenger(i, "gender", v)}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="m">Male</SelectItem>
                            <SelectItem value="f">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("results")} className="border-white/20 text-white">
                    Back
                  </Button>
                  <Button onClick={goToAncillaries} className="flex-1 bg-purple-600 hover:bg-purple-700 py-6 text-lg">
                    Continue to Seats & Add-ons
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "loading_ancillaries" && (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
              <p className="text-gray-400">Loading seat map and add-ons...</p>
            </div>
          )}

          {step === "ancillaries" && offerDetails && (
            <div className="space-y-4">
              <Button variant="outline" onClick={() => setStep("passengers")} className="border-white/20 text-white">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <FlightAncillaries
                offer={offerDetails.offer}
                seatMaps={offerDetails.seat_maps}
                passengers={passengers.map((p, i) => ({
                  id: offerDetails.offer.passengers[i]?.id,
                  email: currentUser?.email || "",
                  ...p,
                }))}
                onContinue={handleAncillariesContinue}
              />
            </div>
          )}

          {step === "review" && priceBreakdown && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Review & Pay</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-300"><span>Flight</span><span>${priceBreakdown.flight.toFixed(2)}</span></div>
                  {priceBreakdown.addOns > 0 && (
                    <div className="flex justify-between text-gray-300"><span>Seats & add-ons</span><span>${priceBreakdown.addOns.toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between text-gray-400"><span>Service fee</span><span>${priceBreakdown.fee.toFixed(2)}</span></div>
                  <div className="border-t border-white/10 pt-2 flex justify-between text-white font-bold text-lg">
                    <span>Total</span><span className="text-green-400">${priceBreakdown.total.toFixed(2)}</span>
                  </div>
                </div>

                {currentUser && Number(currentUser.usd_balance || 0) < priceBreakdown.total && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-yellow-300 text-sm">
                    Insufficient wallet balance. You have ${Number(currentUser.usd_balance || 0).toFixed(2)}, need ${priceBreakdown.total.toFixed(2)}.
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("ancillaries")} className="border-white/20 text-white">
                    Back
                  </Button>
                  <Button onClick={handleBook} disabled={booking} className="flex-1 bg-green-600 hover:bg-green-700 py-6 text-lg">
                    {booking ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                    Confirm & Pay ${priceBreakdown.total.toFixed(2)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

function parseDurationMinutes(iso) {
  const match = iso.match(/PT(\d+H)?(\d+M)?/);
  if (!match) return 0;
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  return hours * 60 + minutes;
}

// Mirrors the same flattening the server does (api/_handlers/flights.js) --
// used here only to compute a display-only running total; the server is
// always the authority on the actual charge.
function flattenSeatServicesClient(seatMaps) {
  const flat = [];
  for (const map of seatMaps || []) {
    for (const cabin of map.cabins || []) {
      for (const row of cabin.rows || []) {
        for (const section of row.sections || []) {
          for (const element of section.elements || []) {
            for (const service of element.available_services || []) {
              flat.push(service);
            }
          }
        }
      }
    }
  }
  return flat;
}
