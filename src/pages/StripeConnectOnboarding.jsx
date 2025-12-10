import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function StripeConnectOnboarding() {
  const [currentUser, setCurrentUser] = useState(null);
  const [email, setEmail] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accountStatus, setAccountStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      setEmail(user.email);
      
      // Check URL params for success/refresh
      const params = new URLSearchParams(window.location.search);
      if (params.get('success')) {
        toast.success('Onboarding completed! Checking account status...');
        // Get account ID from localStorage or state management
        const savedAccountId = localStorage.getItem('stripe_account_id');
        if (savedAccountId) {
          setAccountId(savedAccountId);
          checkAccountStatus(savedAccountId);
        }
      }
      if (params.get('refresh')) {
        toast.info('Onboarding link expired. Please generate a new one.');
      }
    });
  }, []);

  const createAccount = async () => {
    if (!email) {
      toast.error('Email is required');
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('createConnectedAccount', {
        email,
        country: 'US'
      });

      setAccountId(response.account_id);
      localStorage.setItem('stripe_account_id', response.account_id);
      toast.success('Connected account created!');
      
      // Automatically check status
      await checkAccountStatus(response.account_id);
    } catch (error) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const startOnboarding = async () => {
    if (!accountId) {
      toast.error('Please create an account first');
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('createAccountLink', {
        account_id: accountId,
        refresh_url: window.location.href + '?refresh=true',
        return_url: window.location.href + '?success=true'
      });

      // Redirect to Stripe onboarding
      window.location.href = response.url;
    } catch (error) {
      toast.error(error.message || 'Failed to create onboarding link');
      setLoading(false);
    }
  };

  const checkAccountStatus = async (id = accountId) => {
    if (!id) return;

    setStatusLoading(true);
    try {
      const response = await base44.functions.invoke('getConnectedAccountStatus', {
        account_id: id
      });

      setAccountStatus(response);
    } catch (error) {
      toast.error('Failed to fetch account status');
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Stripe Connect Onboarding</h1>
        <p className="text-gray-400 mb-8">Set up your account to receive payments</p>

        {/* Step 1: Create Account */}
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              {accountId ? <CheckCircle className="w-5 h-5 text-green-400" /> : '1.'}
              Create Connected Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!accountId ? (
              <>
                <Input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
                <Button
                  onClick={createAccount}
                  disabled={loading || !email}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Account
                </Button>
              </>
            ) : (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-green-400 font-medium mb-2">✓ Account Created</p>
                <p className="text-gray-300 text-sm">Account ID: <code className="text-purple-400">{accountId}</code></p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Complete Onboarding */}
        {accountId && (
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                {accountStatus?.can_accept_payments ? <CheckCircle className="w-5 h-5 text-green-400" /> : '2.'}
                Complete Onboarding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {accountStatus?.can_accept_payments ? (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-green-400 font-medium mb-2">✓ Onboarding Complete</p>
                  <p className="text-gray-300 text-sm">You can now accept payments!</p>
                </div>
              ) : (
                <>
                  <p className="text-gray-300">Complete your Stripe onboarding to start accepting payments.</p>
                  <Button
                    onClick={startOnboarding}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                    Start Onboarding
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Account Status */}
        {accountId && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Account Status</CardTitle>
                <Button
                  onClick={() => checkAccountStatus()}
                  disabled={statusLoading}
                  variant="outline"
                  size="sm"
                  className="bg-white/5 border-white/20"
                >
                  {statusLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {statusLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-2" />
                  <p className="text-gray-400">Loading status...</p>
                </div>
              ) : accountStatus ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        {accountStatus.charges_enabled ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-400" />
                        )}
                        <span className="text-white font-medium">Charges</span>
                      </div>
                      <Badge className={accountStatus.charges_enabled ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"}>
                        {accountStatus.charges_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>

                    <div className="p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        {accountStatus.payouts_enabled ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-400" />
                        )}
                        <span className="text-white font-medium">Payouts</span>
                      </div>
                      <Badge className={accountStatus.payouts_enabled ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"}>
                        {accountStatus.payouts_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>

                  {accountStatus.requirements?.currently_due?.length > 0 && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-yellow-400 font-medium mb-2">⚠ Action Required</p>
                      <ul className="text-gray-300 text-sm space-y-1">
                        {accountStatus.requirements.currently_due.map((req, idx) => (
                          <li key={idx}>• {req.replace(/_/g, ' ')}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">Click refresh to check status</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}