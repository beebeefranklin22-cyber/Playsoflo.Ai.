import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSignature, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-slate-900/80 border-purple-500/30 backdrop-blur-xl">
          <CardHeader className="text-center border-b border-purple-500/20">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-purple-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-white">
              PlaysoFlo Terms of Service
            </CardTitle>
            <p className="text-gray-400 mt-2">
              By using PlaysoFlo, you automatically agree to these terms
            </p>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Terms Content */}
            <ScrollArea className="h-96 w-full border border-purple-500/30 rounded-lg p-6 bg-slate-950/50">
              <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
                <section>
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    Important Notice
                  </h3>
                  <p className="mb-4">
                    By using PlaysoFlo and any of its properties, assets, or associated services, you acknowledge and agree to the following terms and conditions. Please read carefully before proceeding.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-purple-400 mb-2">1. Limitation of Liability</h3>
                  <p>
                    PlaysoFlo and any of its properties, assets, or liabilities ARE NOT LIABLE for incurring any losses, damages, or legal actions stemming from negligence or other matters related thereto. Users and providers are using this platform at their own risk.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-purple-400 mb-2">2. User Eligibility</h3>
                  <p>
                    By using this service, you confirm that you are a knowledgeable, fully capable, able-bodied human being. You are NOT a robot, part of a click farm, or using any automated technology to access this platform. Any use of bots, scripts, or automated systems is strictly prohibited and will result in immediate account termination and potential legal action.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-purple-400 mb-2">3. Prohibited Activities</h3>
                  <p className="mb-2">The following activities are strictly prohibited and will result in severe consequences:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Fraudulent Activity:</strong> Any form of fraud, scams, or deceptive practices</li>
                    <li><strong>Human Trafficking:</strong> Any activity related to human trafficking or exploitation</li>
                    <li><strong>Hate Groups:</strong> Promotion of hate speech, discrimination, or hate groups</li>
                    <li><strong>Stalking & Harassment:</strong> Stalking, harassment, or threatening behavior</li>
                    <li><strong>Data Selling:</strong> Selling user data to third parties without explicit consent</li>
                    <li><strong>Automated Access:</strong> Use of bots, scrapers, or automated tools</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-purple-400 mb-2">4. Investigations & Penalties</h3>
                  <p>
                    Anyone accused of violating these terms will be thoroughly investigated. Those found guilty will face:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li>Immediate account suspension or permanent ban</li>
                    <li>Financial fines and penalties</li>
                    <li>Liens potentially imposed on assets</li>
                    <li>Severe legal consequences including criminal prosecution</li>
                    <li>Cooperation with law enforcement agencies</li>
                    <li>Civil liability for damages caused</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-purple-400 mb-2">5. Privacy & Data Protection</h3>
                  <p>
                    We take your privacy seriously. Your data will never be sold to third parties without your explicit consent. However, we may share data with law enforcement when legally required or to investigate violations of these terms.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-purple-400 mb-2">6. Permissions & Access</h3>
                  <p>
                    By using this platform, you may be asked to grant certain permissions (location, camera, contacts, microphone, notifications, etc.). These permissions are used solely to provide platform functionality and enhance your experience. You can manage these permissions in your settings at any time.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-purple-400 mb-2">7. User Responsibility</h3>
                  <p>
                    You are solely responsible for:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li>Maintaining the security of your account credentials</li>
                    <li>All activities conducted under your account</li>
                    <li>Compliance with all applicable laws and regulations</li>
                    <li>Accuracy of information you provide</li>
                    <li>Your interactions with other users and providers</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-purple-400 mb-2">8. Modifications to Terms</h3>
                  <p>
                    PlaysoFlo reserves the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the modified terms. Major changes will be communicated via email or platform notifications.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-purple-400 mb-2">9. Dispute Resolution</h3>
                  <p>
                    Any disputes arising from use of this platform shall be resolved through binding arbitration in accordance with the laws of the jurisdiction where PlaysoFlo is registered. You waive your right to participate in class action lawsuits.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-purple-400 mb-2">10. Termination</h3>
                  <p>
                    PlaysoFlo reserves the right to terminate or suspend your account at any time, with or without notice, for violation of these terms or for any other reason deemed necessary to protect the platform, its users, or its interests.
                  </p>
                </section>

                <section className="pt-4 border-t border-purple-500/30">
                  <p className="text-white font-semibold">
                    By signing below, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
                  </p>
                </section>
              </div>
            </ScrollArea>

            {/* Automatic Agreement Notice */}
            <div className="p-4 bg-green-600/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Automatically Agreed</span>
              </div>
              <p className="text-sm text-gray-300">
                By using PlaysoFlo and any of its services, you automatically agree to these Terms of Service. Your continued use of the platform constitutes acceptance of these terms.
              </p>
            </div>

            {/* Back Button */}
            <Button
              onClick={() => navigate(createPageUrl("Profile"))}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg py-6"
            >
              Back to Settings
            </Button>

            <p className="text-xs text-center text-gray-500">
              Last Updated: {new Date().toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}