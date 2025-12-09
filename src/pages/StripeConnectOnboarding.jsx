import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, ExternalLink, Loader2 } from "lucide-react";

/**
 * STRIPE CONNECT ONBOARDING PAGE
 * 
 * This page allows providers/sellers to:
 * 1. Create a Stripe Connected Account
 * 2. Complete onboarding via Account Links
 * 3. View their account status
 */

export default function StripeConnectOnboarding() {
  const [user, setUser] = useState(null);
  const [accountStatus, setAccountStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUserAndStatus();
  }, []);

  const loadUserAndStatus = async () => {
    try {
      setLoading(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // If user has a connected account, fetch its status
      if (currentUser.stripe_account_id) {
        await fetchAccountStatus(currentUser.stripe_account_id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountStatus = async (accountId) => {
    try {
      const { data } = await base44.functions.invoke('getAccountStatus', {
        account_id: accountId
      });
      setAccountStatus(data);
    } catch (error) {
      console.error('Error fetching account status:', error);
    }
  };

  const createConnectedAccount = async () => {
    try {
      setActionLoading(true);
      const { data } = await base44.functions.invoke('createConnectedAccount', {
        country: 'US',
        email: user.email,
        business_type: 'individual',
      });

      alert('✅ Connected account created! Now complete onboarding.');
      await loadUserAndStatus();
    } catch (error) {
      console.error('Error creating account:', error);
      alert('❌ Failed to create account: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const startOnboarding = async () => {
    try {
      setActionLoading(true);
      const { data } = await base44.functions.invoke('createAccountLink', {
        account_id: user.stripe_account_id
      });

      // Redirect to Stripe's hosted onboarding
      window.location.href = data.url;
    } catch (error) {
      console.error('Error creating account link:', error);
      alert('❌ Failed to create onboarding link: ' + error.message);
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Stripe Connect Onboarding</h1>

        {/* No Connected Account Yet */}
        {!user?.stripe_account_id && (
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Get Started with Stripe Connect</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">
                Create a connected account to start accepting payments on the platform.
              </p>
              <Button
                onClick={createConnectedAccount}
                disabled={actionLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Connected Account'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Account Exists - Show Status */}
        {user?.stripe_account_id && (
          <>
            {/* Account Status Card */}
            <Card className="bg-white/5 border-white/10 mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Account Status</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchAccountStatus(user.stripe_account_id)}
                  >
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {accountStatus ? (
                  <div className="space-y-4">
                    {/* Status Message */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <p className="text-blue-300 font-semibold">{accountStatus.status}</p>
                      <p className="text-gray-400 text-sm mt-1">{accountStatus.next_action}</p>
                    </div>

                    {/* Capabilities Grid */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {accountStatus.charges_enabled ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400" />
                          )}
                          <span className="text-white font-semibold">Charges</span>
                        </div>
                        <p className="text-gray-400 text-sm">
                          {accountStatus.charges_enabled ? 'Enabled' : 'Not enabled'}
                        </p>
                      </div>

                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {accountStatus.payouts_enabled ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400" />
                          )}
                          <span className="text-white font-semibold">Payouts</span>
                        </div>
                        <p className="text-gray-400 text-sm">
                          {accountStatus.payouts_enabled ? 'Enabled' : 'Not enabled'}
                        </p>
                      </div>

                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {accountStatus.details_submitted ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400" />
                          )}
                          <span className="text-white font-semibold">Onboarding</span>
                        </div>
                        <p className="text-gray-400 text-sm">
                          {accountStatus.details_submitted ? 'Complete' : 'Incomplete'}
                        </p>
                      </div>
                    </div>

                    {/* Requirements */}
                    {(accountStatus.requirements?.currently_due?.length > 0 ||
                      accountStatus.requirements?.past_due?.length > 0) && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-5 h-5 text-yellow-400" />
                          <span className="text-white font-semibold">Action Required</span>
                        </div>
                        {accountStatus.requirements.past_due?.length > 0 && (
                          <p className="text-red-400 text-sm mb-2">
                            Past due: {accountStatus.requirements.past_due.join(', ')}
                          </p>
                        )}
                        {accountStatus.requirements.currently_due?.length > 0 && (
                          <p className="text-yellow-400 text-sm">
                            Currently due: {accountStatus.requirements.currently_due.join(', ')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Account Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Account ID</p>
                        <p className="text-white font-mono">{accountStatus.account_id}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Email</p>
                        <p className="text-white">{accountStatus.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Country</p>
                        <p className="text-white">{accountStatus.country?.toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Currency</p>
                        <p className="text-white">{accountStatus.default_currency?.toUpperCase()}</p>
                      </div>
                    </div>

                    {/* Action Button */}
                    {!accountStatus.charges_enabled && (
                      <Button
                        onClick={startOnboarding}
                        disabled={actionLoading}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        {actionLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Complete Onboarding
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400">Loading account status...</p>
                )}
              </CardContent>
            </Card>

            {/* Success State */}
            {accountStatus?.charges_enabled && (
              <Card className="bg-green-500/10 border-green-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                    <div>
                      <h3 className="text-white font-bold text-lg">You're all set!</h3>
                      <p className="text-gray-300">
                        Your account is ready to accept payments. Create products to get started.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}