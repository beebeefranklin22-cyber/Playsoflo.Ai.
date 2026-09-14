import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

// This dashboard read a TicketAffiliate table that nothing in the codebase
// ever writes a real conversion to (click-tracking exists, but there's no
// Ticketmaster affiliate API/webhook integration to know when a click
// actually turned into a ticket sale off-platform) -- it always showed
// $0.00 across the board, and its "Request Payout" button only created a
// pending Payment record with no real transfer behind it. Real commission
// tracking needs a Ticketmaster affiliate partnership this app isn't
// hooked up to yet, so this is now an honest "coming soon" rather than a
// dashboard that looks live but can never show a real number.
export default function AffiliatePayoutManager({ currentUser }) {
  if (currentUser?.role !== 'admin') {
    return null;
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-10 text-center space-y-3">
        <Clock className="w-10 h-10 text-yellow-400 mx-auto" />
        <h3 className="text-white font-bold text-lg">Ticketmaster Affiliate Payouts — Coming Soon</h3>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Tracking real ticket-sale conversions requires a Ticketmaster affiliate partnership that isn't set up yet. This dashboard will go live once that integration exists.
        </p>
      </CardContent>
    </Card>
  );
}
