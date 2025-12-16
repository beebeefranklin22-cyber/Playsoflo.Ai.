import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function StripeConnectOnboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [accountStatus, setAccountStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  
  // Form state
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      checkAccountStatus();
    }
  }, [currentUser]);

  useEffect(() => {
    // Check for success parameter from onboarding return
    const success = searchParams.get('success');
    if (success === 'true') {
      toast.success('Onboarding completed! Refreshing status...');
      checkAccountStatus();
    }
  }, [searchParams]);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      setEmail(user.email);
    } catch (error) {
      toast.error('Please log in first');
      navigate('/');
    }
  };

  const checkAccountStatus = async () => {
    try {
      setLoading(true);
      const { data } = await base44.functions.invoke('getConnectedAccountStatus');
      setAccountStatus(data);
    } catch (error) {
      console.error('Error checking account status:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async () => {
    if (!email || !businessName) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setCreating(true);
      const { data } = await base44.functions.invoke('createConnectedAccount', {
        email,
        businessName
      });

      if (data.success) {
        toast.success('Connected account created!');
        // Reload user to get updated stripe_connect_account_id
        await loadUser();
        await checkAccountStatus();
      } else {
        toast.error(data.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  const startOnboarding = async () => {
    try {
      setOnboarding(true);
      const { data } = await base44.functions.invoke('createAccountLink');

      if (data.success) {
        // Redirect to Stripe onboarding
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to create onboarding link');
        setOnboarding(false);
      }
    } catch (error) {
      console.error('Error starting onboarding:', error);
      toast.error(error.message || 'Failed to start onboarding');
      setOnboarding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Stripe Connect Onboarding</h1>
            <p className="text-gray-400">Set up your account to receive payments</p>
          </div>
        </div>

        {/* No Account - Create New */}
        {!accountStatus?.hasAccount && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">Create Connected Account</h2>
              <p className="text-gray-400 mb-6">
                Connect your Stripe account to start selling products and receiving payments.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="text-white text-sm font-medium mb-2 block">
                    Business Name
                  </label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="My Business Inc."
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>

              <Button
                onClick={createAccount}
                disabled={creating}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Connected Account'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Account Exists - Show Status */}
        {accountStatus?.hasAccount && (
          <>
            {/* Status Overview */}
            <Card className="bg-white/5 border-white/10 mb-6">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">Account Status</h2>
                    <p className="text-gray-400 text-sm">Account ID: {accountStatus.accountId}</p>
                  </div>
                  {accountStatus.isFullyOnboarded ? (
                    <Badge className="bg-green-500/20 text-green-400">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-500/20 text-yellow-400">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Incomplete
                    </Badge>
                  )}
                </div>

                {/* Capabilities */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-1">Details Submitted</p>
                    <div className="flex items-center gap-2">
                      {accountStatus.onboarding.details_submitted ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <span className="text-white font-semibold">Yes</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-yellow-400" />
                          <span className="text-white font-semibold">No</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-1">Charges Enabled</p>
                    <div className="flex items-center gap-2">
                      {accountStatus.capabilities.charges_enabled ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <span className="text-white font-semibold">Yes</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-red-400" />
                          <span className="text-white font-semibold">No</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-1">Payouts Enabled</p>
                    <div className="flex items-center gap-2">
                      {accountStatus.capabilities.payouts_enabled ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <span className="text-white font-semibold">Yes</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-red-400" />
                          <span className="text-white font-semibold">No</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Requirements */}
                {accountStatus.onboarding.currently_due?.length > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                    <p className="text-yellow-300 font-semibold mb-2">
                      Action Required
                    </p>
                    <p className="text-yellow-200 text-sm">
                      {accountStatus.onboarding.currently_due.length} item(s) need to be completed
                    </p>
                  </div>
                )}

                {/* Onboarding Button */}
                {!accountStatus.isFullyOnboarded && (
                  <Button
                    onClick={startOnboarding}
                    disabled={onboarding}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {onboarding ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Redirecting to Stripe...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Continue Onboarding
                      </>
                    )}
                  </Button>
                )}

                {accountStatus.isFullyOnboarded && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <p className="text-green-300 font-semibold mb-2">
                      ✓ Onboarding Complete
                    </p>
                    <p className="text-green-200 text-sm mb-4">
                      Your account is ready to receive payments. You can now create products.
                    </p>
                    <Button
                      onClick={() => navigate('/StripeConnectProducts')}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Create Your First Product
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Account Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email</span>
                    <span className="text-white">{accountStatus.info.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Country</span>
                    <span className="text-white">{accountStatus.info.country}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Currency</span>
                    <span className="text-white">{accountStatus.info.default_currency?.toUpperCase()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}