import React, { useState } from "react";
import { DuffelAncillaries } from "@duffel/components";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

// Wraps Duffel's own prebuilt ancillaries UI (seat maps, baggage,
// cancel-for-any-reason) rather than building a custom equivalent --
// Duffel maintains this against their live inventory format, which is
// exactly what a seat map needs to stay correct. offer/seat_maps come
// from api/_handlers/flights.js's get_offer_details action (the current,
// non-deprecated way to use this component -- offer_id/client_key are
// deprecated). Nothing here is trusted for pricing: the server
// independently re-validates every selected service against Duffel's
// live offer before charging anyone (see handleBook in flights.js).
export default function FlightAncillaries({ offer, seatMaps, passengers, onContinue }) {
  const [payload, setPayload] = useState(null);
  const [displayTotal, setDisplayTotal] = useState(null);

  const handlePayloadReady = (data, metadata) => {
    setPayload(data);
    const ancillaryTotal = [
      ...(metadata.baggage_services || []),
      ...(metadata.seat_services || []),
      ...(metadata.cancel_for_any_reason_services || []),
    ].reduce((sum, s) => sum + Number(s.serviceInformation?.total_amount || 0), 0);
    setDisplayTotal(Number(metadata.offer_total_amount) + ancillaryTotal);
  };

  const handleContinue = () => {
    onContinue(payload?.services || []);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-blue-300 text-sm">
          Pick a seat, add checked bags, or add cancellation protection -- all optional. You can skip this and continue with just your flight.
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden p-1">
        <DuffelAncillaries
          offer={offer}
          seat_maps={seatMaps}
          services={["bags", "seats", "cancel_for_any_reason"]}
          passengers={passengers}
          onPayloadReady={handlePayloadReady}
          styles={{
            accentColor: "#9333ea",
            buttonCornerRadius: "9999px",
          }}
        />
      </div>

      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4">
        <div>
          <p className="text-gray-400 text-sm">Running total (flight + add-ons)</p>
          <p className="text-2xl font-bold text-green-400">
            ${(displayTotal ?? Number(offer.total_amount)).toFixed(2)}
          </p>
        </div>
        <Button onClick={handleContinue} className="bg-purple-600 hover:bg-purple-700 py-6 px-8 text-lg">
          Continue
        </Button>
      </div>
    </div>
  );
}
