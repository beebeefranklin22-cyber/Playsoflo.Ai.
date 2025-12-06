import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function StripeSetup() {
  const [copied, setCopied] = useState(null);
  const [appUrl, setAppUrl] = useState("");

  useEffect(() => {
    setAppUrl(window.location.origin);
  }, []);

  const webhookUrls = [
    {
      name: "Stripe Connect Webhook",
      url: `${appUrl}/functions/stripeConnectWebhook`,
      description: "For marketplace payments (Connect)",
      events: ["account.updated", "checkout.session.completed", "payment_intent.succeeded", "transfer.created"],
      type: "connect"
    },
    {
      name: "Standard Stripe Webhook", 
      url: `${appUrl}/functions/stripeWebhook`,
      description: "For regular payments & subscriptions",
      events: ["payment_intent.succeeded", "payment_intent.payment_failed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"],
      type: "standard"
    }
  ];

  const functionUrls = [
    {
      name: "Create Connected Account",
      url: `${appUrl}/functions/createConnectedAccount`,
      description: "Creates seller/provider accounts"
    },
    {
      name: "Create Account Link",
      url: `${appUrl}/functions/createAccountLink`,
      description: "Generates onboarding links"
    },
    {
      name: "Get Account Status",
      url: `${appUrl}/functions/getAccountStatus`,
      description: "Checks account verification status"
    },
    {
      name: "Create Connect Checkout",
      url: `${appUrl}/functions/createConnectCheckout`,
      description: "Creates checkout with platform fees"
    }
  ];

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Stripe Connect Setup</h1>
        <p className="text-gray-400 mb-6">Configure your marketplace payment system</p>

        {/* Setup Instructions */}
        <Card className="glass-effect border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              Webhook Setup Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-300">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <p className="text-yellow-400 text-sm font-medium mb-2">⚠️ Important: Add BOTH Webhooks</p>
              <p className="text-gray-300 text-sm">
                You need to create TWO separate webhook endpoints in Stripe - one for Connect payments and one for standard payments.
              </p>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-medium text-white">Open Stripe Dashboard</p>
                <a 
                  href="https://dashboard.stripe.com/webhooks" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:underline flex items-center gap-1 text-sm mt-1"
                >
                  Go to Stripe Webhooks <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-medium text-white">Add First Webhook (Connect)</p>
                <p className="text-sm">Click "Add endpoint" → Copy the Connect webhook URL below → Select listed events → Click "Add endpoint"</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-medium text-white">Add Second Webhook (Standard)</p>
                <p className="text-sm">Repeat process for the Standard webhook URL with its events</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold flex-shrink-0">
                4
              </div>
              <div>
                <p className="font-medium text-white">Copy Signing Secret</p>
                <p className="text-sm">Click on your webhook → Reveal signing secret → Copy it (starts with whsec_)</p>
                <p className="text-xs text-yellow-400 mt-1">💡 Both webhooks share the same signing secret</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold flex-shrink-0">
                5
              </div>
              <div>
                <p className="font-medium text-white">Add Secret to Base44</p>
                <p className="text-sm">Dashboard → Settings → Environment Variables → Add STRIPE_WEBHOOK_SECRET (paste the whsec_ value)</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold flex-shrink-0">
                6
              </div>
              <div>
                <p className="font-medium text-white">Test Your Setup</p>
                <p className="text-sm">Use the "Send Test Webhook" button in Stripe to verify connectivity</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Endpoints */}
        <h2 className="text-2xl font-bold text-white mb-4">Webhook Endpoints</h2>
        <div className="space-y-4 mb-8">
          {webhookUrls.map((webhook, idx) => (
            <Card key={idx} className="glass-effect border-white/10">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-white font-semibold">{webhook.name}</h3>
                      <Badge className={webhook.type === 'connect' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}>
                        {webhook.type}
                      </Badge>
                    </div>
                    <p className="text-gray-400 text-sm mb-3">{webhook.description}</p>
                    
                    <div className="bg-black/30 rounded-lg p-3 mb-2">
                      <code className="text-purple-400 text-sm break-all">{webhook.url}</code>
                    </div>
                  </div>

                  <Button
                    onClick={() => copyToClipboard(webhook.url, `webhook-${idx}`)}
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/10 hover:bg-white/10 flex-shrink-0"
                  >
                    {copied === `webhook-${idx}` ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-blue-400 text-xs font-medium mb-2">Events to select in Stripe:</p>
                  <div className="flex flex-wrap gap-1">
                    {webhook.events.map((event, i) => (
                      <code key={i} className="text-blue-300 text-xs bg-blue-500/10 px-2 py-1 rounded">
                        {event}
                      </code>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="text-2xl font-bold text-white mb-4">Function Endpoints</h2>

        {/* Function URLs */}
        <div className="space-y-4">
          {functionUrls.map((func, idx) => (
            <Card key={idx} className="glass-effect border-white/10">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1">{func.name}</h3>
                    <p className="text-gray-400 text-sm mb-3">{func.description}</p>
                    
                    <div className="bg-black/30 rounded-lg p-3 mb-2">
                      <code className="text-purple-400 text-sm break-all">{func.url}</code>
                    </div>

                    {func.events && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 mt-2">
                        <p className="text-blue-400 text-xs font-medium mb-1">Events to select:</p>
                        <code className="text-blue-300 text-xs">{func.events}</code>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => copyToClipboard(func.url, idx)}
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/10 hover:bg-white/10 flex-shrink-0"
                  >
                    {copied === idx ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Verification Checklist */}
        <Card className="glass-effect border-white/10 mt-6">
          <CardHeader>
            <CardTitle className="text-white">Setup Verification Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
              <div className="w-5 h-5 rounded border-2 border-gray-400 mt-0.5"></div>
              <div>
                <p className="text-white font-medium">STRIPE_SECRET_KEY is set</p>
                <p className="text-gray-400 text-sm">Check Dashboard → Settings → Environment Variables</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
              <div className="w-5 h-5 rounded border-2 border-gray-400 mt-0.5"></div>
              <div>
                <p className="text-white font-medium">STRIPE_WEBHOOK_SECRET is set</p>
                <p className="text-gray-400 text-sm">Add the whsec_ signing secret from Stripe</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
              <div className="w-5 h-5 rounded border-2 border-gray-400 mt-0.5"></div>
              <div>
                <p className="text-white font-medium">Connect webhook added to Stripe</p>
                <p className="text-gray-400 text-sm">/functions/stripeConnectWebhook with correct events</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
              <div className="w-5 h-5 rounded border-2 border-gray-400 mt-0.5"></div>
              <div>
                <p className="text-white font-medium">Standard webhook added to Stripe</p>
                <p className="text-gray-400 text-sm">/functions/stripeWebhook with correct events</p>
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mt-4">
              <p className="text-green-400 font-medium mb-2">✅ Testing Webhooks</p>
              <p className="text-gray-300 text-sm mb-3">
                In Stripe Dashboard → Webhooks → Click your webhook → "Send test webhook" to verify it works
              </p>
              <a
                href="https://dashboard.stripe.com/test/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm"
              >
                Open Stripe Webhooks Dashboard <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}