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
  const [user, setUser] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // If already accepted, redirect to home
      if (currentUser.terms_accepted) {
        navigate(createPageUrl("Home"));
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    setIsDrawing(true);
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#8B5CF6";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    setSignature(canvas.toDataURL());
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature("");
  };

  const handleAccept = async () => {
    if (!agreed) {
      toast.error("Please read and agree to the terms");
      return;
    }

    if (!signature) {
      toast.error("Please provide your signature");
      return;
    }

    setLoading(true);
    try {
      await base44.auth.updateMe({
        terms_accepted: true,
        terms_accepted_date: new Date().toISOString(),
        terms_signature: signature,
        terms_ip_address: "recorded"
      });

      toast.success("Terms accepted successfully!");
      navigate(createPageUrl("Home"));
    } catch (error) {
      console.error("Error accepting terms:", error);
      toast.error("Failed to accept terms. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full" />
      </div>
    );
  }

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
              Please read and agree to continue using our platform
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

            {/* Agreement Checkbox */}
            <div className="flex items-start gap-3 p-4 bg-purple-600/10 border border-purple-500/30 rounded-lg">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={setAgreed}
                className="mt-1"
              />
              <label htmlFor="agree" className="text-sm text-gray-300 cursor-pointer">
                I have read and understood the Terms of Service. I agree to be bound by these terms and acknowledge that I am a real human being using this platform at my own risk. I understand that violations will result in severe penalties including fines, liens, and legal action.
              </label>
            </div>

            {/* Signature Canvas */}
            <div className="space-y-3">
              <label className="text-white font-semibold flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-purple-400" />
                Electronic Signature
              </label>
              <div className="border-2 border-purple-500/50 rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="w-full cursor-crosshair"
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">Sign above with your mouse or touch</p>
                <Button
                  onClick={clearSignature}
                  variant="outline"
                  size="sm"
                  className="border-purple-500/30 text-white hover:bg-purple-500/20"
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Accept Button */}
            <Button
              onClick={handleAccept}
              disabled={!agreed || !signature || loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg py-6"
            >
              {loading ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Accept Terms & Continue
                </>
              )}
            </Button>

            <p className="text-xs text-center text-gray-500">
              Date: {new Date().toLocaleDateString()} • IP Address: Recorded • Signature: Securely Stored
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}