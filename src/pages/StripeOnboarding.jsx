import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, AlertCircle, Loader2, 
  CreditCard, Building, Shield, DollarSign,
  ExternalLink, RefreshCw, Clock
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function StripeOnboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [accountStatus, setAccountStatus] = useState(null);
  const [verificationError, setVerificationError] = useState(null);

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      if (user.stripe_account_id) {
        checkAccountStatus(user.stripe_account_id);
      }
    }).catch(() => {});
  }, []);

  const checkAccountStatus = async (accountId) => {
    try {
      const response = await base44.functions.invoke('getAccountStatus', {
        account_id: accountId
      });
      setAccountStatus(response.data);
      
      // Determine current step based on status
      if (response.data.charges_enabled && response.data.payouts_enabled) {
        setCurrentStep(4); // Complete
      } else if (response.data.details_submitted) {
        setCurrentStep(3); // Verification pending
      } else {
        setCurrentStep(2); // Need to complete onboarding
      }

      // Check for verification errors
      if (response.data.requirements?.errors?.length > 0) {
        setVerificationError(response.data.requirements.errors[0].reason);
      }
    } catch (error) {
      console.error("Error checking account status:", error);
    }
  };

  // Create connected account mutation
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('createConnectedAccount', {
        email: currentUser.email,
        business_type: 'individual',
        country: 'US'
      });
      return response.data;
    },
    onSuccess: async (data) => {
      await base44.auth.updateMe({ stripe_account_id: data.account_id });
      const updated = await base44.auth.me();
      setCurrentUser(updated);
      toast.success('Stripe account created!');
      setCurrentStep(2);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create account');
    }
  });

  // Create account link mutation
  const createLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('createAccountLink', {
        account_id: currentUser.stripe_account_id,
        refresh_url: window.location.href,
        return_url: window.location.href
      });
      return response.data;
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create onboarding link');
    }
  });

  const handleStartOnboarding = () => {
    if (!currentUser.stripe_account_id) {
      createAccountMutation.mutate();
    } else {
      createLinkMutation.mutate();
    }
  };

  const handleRefreshStatus = () => {
    if (currentUser?.stripe_account_id) {
      checkAccountStatus(currentUser.stripe_account_id);
      toast.success('Status refreshed');
    }
  };

  const steps = [
    {
      number: 1,
      title: "Get Started",
      description: "Create your Stripe Connect account",
      icon: CreditCard,
      status: currentStep > 1 ? "complete" : currentStep === 1 ? "active" : "pending"
    },
    {
      number: 2,
      title: "Complete Onboarding",
      description: "Provide business details and banking information",
      icon: Building,
      status: currentStep > 2 ? "complete" : currentStep === 2 ? "active" : "pending"
    },
    {
      number: 3,
      title: "Verification",
      description: "Stripe verifies your information",
      icon: Shield,
      status: currentStep > 3 ? "complete" : currentStep === 3 ? "active" : "pending"
    },
    {
      number: 4,
      title: "Start Receiving Payouts",
      description: "You're all set!",
      icon: DollarSign,
      status: currentStep >= 4 ? "complete" : "pending"
    }
  ];

  return (
    <div className="min-h-screen p-6 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Stripe Account Setup</h1>
          <p className="text-gray-400">Connect your Stripe account to receive payouts</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isComplete = step.status === "complete";
              const isActive = step.status === "active";
              
              return (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${
                        isComplete
                          ? "bg-green-500/20 border-2 border-green-500"
                          : isActive
                          ? "bg-purple-500/20 border-2 border-purple-500"
                          : "bg-white/5 border-2 border-white/10"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      ) : (
                        <Icon className={`w-6 h-6 ${isActive ? "text-purple-400" : "text-gray-500"}`} />
                      )}
                    </motion.div>
                    <p className={`text-sm font-medium text-center ${
                      isActive ? "text-white" : "text-gray-500"
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${
                      isComplete ? "bg-green-500" : "bg-white/10"
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Verification Error Alert */}
        {verificationError && (
          <Card className="glass-effect border-red-500/30 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-red-400 font-semibold mb-2">Verification Issue</p>
                  <p className="text-gray-300 text-sm mb-3">{verificationError}</p>
                  <Button
                    onClick={() => createLinkMutation.mutate()}
                    disabled={createLinkMutation.isPending}
                    className="bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-400"
                  >
                    {createLinkMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-2" />
                    )}
                    Resolve Issue
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Get Started */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass-effect border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-purple-400" />
                  Create Your Stripe Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300">
                  To receive payouts, you'll need to connect a Stripe account. This allows you to:
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-medium">Secure Payments</p>
                      <p className="text-gray-400 text-sm">Industry-leading security and compliance</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-medium">Fast Payouts</p>
                      <p className="text-gray-400 text-sm">Receive funds in 2-3 business days</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-medium">Dashboard & Analytics</p>
                      <p className="text-gray-400 text-sm">Track earnings and transactions</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-400 text-sm">
                    💡 <strong>What you'll need:</strong> Government-issued ID, bank account details, 
                    and basic business information. The process takes about 5-10 minutes.
                  </p>
                </div>

                <Button
                  onClick={handleStartOnboarding}
                  disabled={createAccountMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700 py-6 text-lg"
                >
                  {createAccountMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Create Stripe Account
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Complete Onboarding */}
        {currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass-effect border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Building className="w-6 h-6 text-purple-400" />
                  Complete Your Stripe Onboarding
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300">
                  Your Stripe account has been created! Now complete the onboarding process to start receiving payments.
                </p>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-yellow-400 text-sm font-medium mb-2">⚠️ What Happens Next</p>
                  <ul className="text-gray-300 text-sm space-y-1 ml-5 list-disc">
                    <li>You'll be redirected to Stripe's secure onboarding</li>
                    <li>Provide your business and personal information</li>
                    <li>Add your bank account for payouts</li>
                    <li>Verify your identity with a government ID</li>
                  </ul>
                </div>

                {accountStatus && !accountStatus.details_submitted && (
                  <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                    <div className="flex-1">
                      <p className="text-white font-medium">Action Required</p>
                      <p className="text-gray-400 text-sm">Complete your Stripe account setup to receive payouts</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => createLinkMutation.mutate()}
                    disabled={createLinkMutation.isPending}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 py-6"
                  >
                    {createLinkMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-5 h-5 mr-2" />
                        Continue to Stripe
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleRefreshStatus}
                    variant="outline"
                    className="bg-white/5 border-white/10 hover:bg-white/10"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Verification Pending */}
        {currentStep === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass-effect border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-6 h-6 text-blue-400" />
                  Verification in Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-6">
                  <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Verifying Your Account</h3>
                  <p className="text-gray-400">
                    Stripe is reviewing your information. This typically takes a few minutes to a few hours.
                  </p>
                </div>

                {accountStatus && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-300">Charges Enabled</span>
                      {accountStatus.charges_enabled ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-300">Payouts Enabled</span>
                      {accountStatus.payouts_enabled ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-400" />
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-400 text-sm">
                    💡 <strong>What to expect:</strong> You'll receive an email from Stripe once verification 
                    is complete. Check back here to see your status update.
                  </p>
                </div>

                <Button
                  onClick={handleRefreshStatus}
                  variant="outline"
                  className="w-full bg-white/5 border-white/10 hover:bg-white/10"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Refresh Status
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Complete */}
        {currentStep === 4 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass-effect border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  All Set!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-6">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Your Account is Ready!</h3>
                  <p className="text-gray-400 mb-6">
                    You can now start receiving payments and managing your payouts.
                  </p>

                  {accountStatus && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                        <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                        <p className="text-white font-semibold">Charges Enabled</p>
                        <p className="text-gray-400 text-xs">Accept payments</p>
                      </div>
                      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                        <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                        <p className="text-white font-semibold">Payouts Enabled</p>
                        <p className="text-gray-400 text-xs">Withdraw funds</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => navigate(createPageUrl("Payouts"))}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <DollarSign className="w-5 h-5 mr-2" />
                    Go to Payouts
                  </Button>
                  
                  <Button
                    onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
                    variant="outline"
                    className="w-full bg-white/5 border-white/10 hover:bg-white/10"
                  >
                    <ExternalLink className="w-5 h-5 mr-2" />
                    Open Stripe Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Help Section */}
        <Card className="glass-effect border-white/10 mt-6">
          <CardContent className="pt-6">
            <h3 className="text-white font-semibold mb-3">Need Help?</h3>
            <div className="space-y-2 text-sm">
              <a
                href="https://support.stripe.com/topics/connect"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition text-gray-300"
              >
                <span>Stripe Connect Documentation</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href="https://support.stripe.com/questions/common-questions-about-identity-verification"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition text-gray-300"
              >
                <span>Identity Verification FAQ</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}