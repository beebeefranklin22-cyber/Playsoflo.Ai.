import React, { useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plane, ArrowRight, Loader2, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { searchFlights } from "@/functions/searchFlights";
import { bookFlight } from "@/functions/bookFlight";

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

export default function FlightBooking() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [step, setStep] = useState("search"); // search | results | passengers | confirmed
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [passengers, setPassengers] = useState([emptyPassenger()]);
  const [booking, setBooking] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

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

  const handleBook = async () => {
    if (passengers.some((p) => !p.given_name || !p.family_name || !p.born_on)) {
      toast.error("Please fill in every passenger's name and date of birth");
      return;
    }
    setBooking(true);
    const { data } = await bookFlight({
      offer_id: selectedOffer.id,
      passengers,
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
                    <Input
                      placeholder="Origin airport (e.g. MIA)"
                      value={form.origin}
                      onChange={(e) => setForm({ ...form, origin: e.target.value.toUpperCase() })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <Input
                      placeholder="Destination airport (e.g. JFK)"
                      value={form.destination}
                      onChange={(e) => setForm({ ...form, destination: e.target.value.toUpperCase() })}
                      className="bg-white/10 border-white/20 text-white"
                    />
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
              <Button variant="outline" onClick={() => setStep("search")} className="border-white/20 text-white">
                <ArrowLeft className="w-4 h-4 mr-2" /> New Search
              </Button>
              {offers.length === 0 && (
                <p className="text-gray-400 text-center py-12">No flights found for that route/date. Try different dates.</p>
              )}
              {offers.map((offer) => (
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

                {currentUser && Number(currentUser.usd_balance || 0) < Number(selectedOffer.total_amount) && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-yellow-300 text-sm">
                    Insufficient wallet balance. You have ${Number(currentUser.usd_balance || 0).toFixed(2)}, need ${Number(selectedOffer.total_amount).toFixed(2)}.
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("results")} className="border-white/20 text-white">
                    Back
                  </Button>
                  <Button
                    onClick={handleBook}
                    disabled={booking}
                    className="flex-1 bg-green-600 hover:bg-green-700 py-6 text-lg"
                  >
                    {booking ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                    Confirm & Pay ${Number(selectedOffer.total_amount).toFixed(2)}
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
