import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Info, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Escrow() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck className="w-10 h-10 text-green-400" />
          <div>
            <h1 className="text-4xl font-bold text-white">Escrow Protection</h1>
            <p className="text-gray-300">AI-powered secure transactions</p>
          </div>
        </div>

        <Card className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/30 mb-8">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <Lock className="w-8 h-8 text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-white font-bold text-2xl mb-3">Automated Escrow Protection</h2>
                <p className="text-gray-300 mb-4">
                  Our AI-powered system automatically manages escrow for all high-value transactions. 
                  Funds are held securely and released when both parties confirm service completion.
                </p>
                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-white/5 rounded-xl p-4">
                    <CheckCircle2 className="w-6 h-6 text-green-400 mb-2" />
                    <h3 className="text-white font-semibold mb-1">Auto-Detection</h3>
                    <p className="text-gray-400 text-sm">
                      High-value transactions automatically trigger escrow protection
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <CheckCircle2 className="w-6 h-6 text-blue-400 mb-2" />
                    <h3 className="text-white font-semibold mb-1">Smart Release</h3>
                    <p className="text-gray-400 text-sm">
                      Funds released when service conditions are verified by AI
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <CheckCircle2 className="w-6 h-6 text-purple-400 mb-2" />
                    <h3 className="text-white font-semibold mb-1">Dispute Resolution</h3>
                    <p className="text-gray-400 text-sm">
                      AI mediates disputes with fair, data-driven settlements
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white text-xl flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-400" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Book a Service</h3>
                  <p className="text-gray-400 text-sm">
                    When you book high-value services (cars, property, luxury goods), escrow is automatically enabled
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Payment Held Securely</h3>
                  <p className="text-gray-400 text-sm">
                    Your payment is held in escrow until the service is completed to your satisfaction
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">AI Verification</h3>
                  <p className="text-gray-400 text-sm">
                    Our AI verifies completion through photos, signatures, and confirmation from both parties
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Automatic Release</h3>
                  <p className="text-gray-400 text-sm">
                    Once verified, funds are automatically released to the provider. If there's a dispute, AI mediates fairly
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Protected Transaction Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white font-medium">🚗 Car Rentals</p>
                <p className="text-gray-400 text-sm">Exotic vehicles, security deposits</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white font-medium">🏠 Property Bookings</p>
                <p className="text-gray-400 text-sm">Vacation homes, luxury stays</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white font-medium">💼 High-Value Services</p>
                <p className="text-gray-400 text-sm">Professional services over $500</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white font-medium">🎨 Luxury Goods</p>
                <p className="text-gray-400 text-sm">Art, jewelry, collectibles</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex gap-4">
          <Button
            onClick={() => navigate(createPageUrl("Marketplace"))}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 py-6 text-lg"
          >
            Browse Protected Services
          </Button>
          <Button
            onClick={() => navigate(createPageUrl("MyBookings"))}
            variant="outline"
            className="flex-1 py-6 text-lg bg-white/5"
          >
            View My Bookings
          </Button>
        </div>
      </div>
    </div>
  );
}