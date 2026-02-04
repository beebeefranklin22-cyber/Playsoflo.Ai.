import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Download, Smartphone, Tablet, Info } from "lucide-react";
import { toast } from "sonner";

export default function AppStorePrep() {
  const [activeDevice, setActiveDevice] = useState("iphone");

  // Required screenshot sizes for App Store
  const screenshotRequirements = {
    iphone: {
      name: "iPhone 6.7\" (iPhone 14 Pro Max)",
      size: "1290 x 2796",
      required: true,
      description: "Main display for App Store"
    },
    iphone_small: {
      name: "iPhone 5.5\" (iPhone 8 Plus)",
      size: "1242 x 2208",
      required: false,
      description: "Optional for older devices"
    },
    ipad: {
      name: "iPad Pro 12.9\" (6th gen)",
      size: "2048 x 2732",
      required: true,
      description: "Required for iPad support"
    }
  };

  // App Store readiness checklist
  const checklist = [
    {
      category: "Technical Requirements",
      items: [
        { 
          text: "App works without crashes",
          status: "warning",
          action: "Test all features thoroughly",
          critical: true
        },
        {
          text: "All features accessible without login (or provide test account)",
          status: "warning",
          action: "Create demo account: demo@playsoflow.com",
          critical: true
        },
        {
          text: "Privacy Policy URL",
          status: "error",
          action: "Add privacy policy page to your website",
          critical: true,
          fix: "Create page explaining data collection (user info, location, payments)"
        },
        {
          text: "Age Rating declared",
          status: "warning",
          action: "Rate as 17+ due to user-generated content & real money transactions",
          critical: true
        },
        {
          text: "Payment compliance",
          status: "warning",
          action: "Ensure all in-app purchases use Apple's system OR qualify for exemption",
          critical: true,
          note: "Digital content (tips, tickets) MUST use Apple Pay. Physical goods/services OK with Stripe."
        }
      ]
    },
    {
      category: "Content & Features",
      items: [
        {
          text: "Content moderation for livestreams",
          status: "warning",
          action: "Add reporting system & content guidelines",
          critical: true
        },
        {
          text: "Ride-hailing compliance",
          status: "info",
          action: "Verify insurance & local regulations",
          critical: false,
          note: "May need business licenses for ride services"
        },
        {
          text: "Real money gambling/betting removed or licensed",
          status: "error",
          action: "Remove betting features OR obtain proper licensing",
          critical: true
        },
        {
          text: "Copyright compliance for music/video",
          status: "warning",
          action: "Ensure all content is licensed or user-uploaded only",
          critical: true
        }
      ]
    },
    {
      category: "App Metadata",
      items: [
        {
          text: "App Name (30 chars max)",
          status: "success",
          action: "PlaySoFlo - Works!",
          critical: true
        },
        {
          text: "Subtitle (30 chars)",
          status: "info",
          action: "Suggest: 'Live, Connect, Explore SoFlo'",
          critical: false
        },
        {
          text: "Keywords (100 chars)",
          status: "info",
          action: "livestream,social,rides,marketplace,music,entertainment",
          critical: false
        },
        {
          text: "App Description (4000 chars)",
          status: "info",
          action: "Highlight main features: livestreaming, marketplace, rides, music",
          critical: true
        }
      ]
    }
  ];

  const captureScreenshot = (deviceType) => {
    toast.info("📸 To capture screenshots:");
    
    const instructions = deviceType === "ipad" 
      ? "1. Open app on iPad\n2. Press Power + Volume Up\n3. Screenshots saved to Photos"
      : "1. Open app on iPhone\n2. Press Side Button + Volume Up\n3. Screenshots saved to Photos";
    
    setTimeout(() => {
      toast(instructions, { duration: 8000 });
    }, 500);
  };

  // Suggested screenshots to take
  const screenshotIdeas = [
    { page: "Home Feed", description: "Show personalized content feed" },
    { page: "Livestream", description: "Active livestream with chat" },
    { page: "Marketplace", description: "Services/products browsing" },
    { page: "Ride Hailing", description: "Map with ride selection" },
    { page: "Music Player", description: "Music discovery interface" },
    { page: "Profile", description: "User profile with content" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6 pb-24">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">📱 App Store Prep Center</h1>
          <p className="text-gray-300">Get your app ready for Apple review</p>
        </div>

        {/* Critical Alerts */}
        <Card className="bg-red-500/10 border-red-500/50">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Critical Issues to Fix Before Submission
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-red-500/20 rounded-lg p-4 border border-red-500/30">
              <p className="text-white font-semibold mb-2">⚠️ Privacy Policy REQUIRED</p>
              <p className="text-gray-300 text-sm mb-3">
                Apple rejects apps without privacy policies. Must explain data collection.
              </p>
              <Button size="sm" className="bg-red-600 hover:bg-red-700">
                Create Privacy Policy Page
              </Button>
            </div>

            <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-500/30">
              <p className="text-white font-semibold mb-2">💰 Payment System Issue</p>
              <p className="text-gray-300 text-sm">
                Digital goods (livestream tips, tickets) MUST use Apple In-App Purchase.
                Physical goods (rides, marketplace) can use Stripe.
              </p>
            </div>

            <div className="bg-orange-500/20 rounded-lg p-4 border border-orange-500/30">
              <p className="text-white font-semibold mb-2">🎰 Betting/Gambling Features</p>
              <p className="text-gray-300 text-sm">
                Remove betting features OR obtain proper gambling licenses + age verification.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Screenshot Generator */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-purple-400" />
              Screenshot Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30 mb-4">
              <p className="text-blue-300 text-sm flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>You need 3-10 screenshots per device size. Show your app's best features!</span>
              </p>
            </div>

            {/* Device selector */}
            <div className="flex gap-2 mb-4">
              {Object.entries(screenshotRequirements).map(([key, device]) => (
                <Button
                  key={key}
                  onClick={() => setActiveDevice(key)}
                  variant={activeDevice === key ? "default" : "outline"}
                  className={activeDevice === key ? "bg-purple-600" : "bg-white/5 border-white/20"}
                >
                  {key === "ipad" ? <Tablet className="w-4 h-4 mr-2" /> : <Smartphone className="w-4 h-4 mr-2" />}
                  {device.name.split("(")[0]}
                </Button>
              ))}
            </div>

            {/* Selected device info */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
              <h3 className="text-white font-semibold">{screenshotRequirements[activeDevice].name}</h3>
              <p className="text-gray-400 text-sm">{screenshotRequirements[activeDevice].description}</p>
              <div className="flex items-center gap-4">
                <Badge className="bg-purple-500/20 text-purple-300">
                  Size: {screenshotRequirements[activeDevice].size}
                </Badge>
                <Badge className={screenshotRequirements[activeDevice].required ? "bg-red-500/20 text-red-300" : "bg-gray-500/20 text-gray-300"}>
                  {screenshotRequirements[activeDevice].required ? "Required" : "Optional"}
                </Badge>
              </div>
            </div>

            {/* Screenshot ideas */}
            <div className="space-y-2">
              <h4 className="text-white font-semibold">Suggested Screenshots to Take:</h4>
              <div className="grid gap-2">
                {screenshotIdeas.map((idea, idx) => (
                  <div key={idx} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{idx + 1}. {idea.page}</p>
                      <p className="text-gray-400 text-sm">{idea.description}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => captureScreenshot(activeDevice)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
              <p className="text-yellow-300 text-sm">
                <strong>Pro Tip:</strong> Use real content, not placeholder text. Show actual users, messages, and features working.
                No offensive/inappropriate content in screenshots!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Readiness Checklist */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">App Store Readiness Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            {checklist.map((section, idx) => (
              <div key={idx} className="mb-6">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  {section.category}
                </h3>
                <div className="space-y-2">
                  {section.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-start gap-3">
                        {item.status === "success" && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />}
                        {item.status === "error" && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
                        {item.status === "warning" && <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />}
                        {item.status === "info" && <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />}
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white font-medium">{item.text}</p>
                            {item.critical && (
                              <Badge className="bg-red-500/20 text-red-300 text-xs">
                                Critical
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm mb-2">{item.action}</p>
                          {item.note && (
                            <p className="text-yellow-300 text-xs bg-yellow-500/10 rounded px-2 py-1">
                              ℹ️ {item.note}
                            </p>
                          )}
                          {item.fix && (
                            <p className="text-blue-300 text-xs bg-blue-500/10 rounded px-2 py-1 mt-1">
                              💡 Fix: {item.fix}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-gradient-to-r from-purple-600 to-pink-600">
          <CardContent className="p-6">
            <h3 className="text-white font-bold text-xl mb-4">Ready to Submit?</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <Button 
                className="bg-white text-purple-600 hover:bg-gray-100"
                onClick={() => toast.info("Visit pwabuilder.com to generate iOS package")}
              >
                Generate iOS Package
              </Button>
              <Button 
                className="bg-white text-purple-600 hover:bg-gray-100"
                onClick={() => window.open("https://appstoreconnect.apple.com", "_blank")}
              >
                Open App Store Connect
              </Button>
              <Button 
                className="bg-white text-purple-600 hover:bg-gray-100"
                onClick={() => toast.info("Cost: $99/year for Apple Developer Program")}
              >
                Developer Account Info
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resources */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Helpful Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a 
              href="https://developer.apple.com/app-store/review/guidelines/" 
              target="_blank"
              className="block bg-white/5 hover:bg-white/10 rounded-lg p-3 text-purple-400"
            >
              📖 App Store Review Guidelines
            </a>
            <a 
              href="https://www.pwabuilder.com" 
              target="_blank"
              className="block bg-white/5 hover:bg-white/10 rounded-lg p-3 text-purple-400"
            >
              🔧 PWA Builder (Generate iOS Package)
            </a>
            <a 
              href="https://appstoreconnect.apple.com" 
              target="_blank"
              className="block bg-white/5 hover:bg-white/10 rounded-lg p-3 text-purple-400"
            >
              🍎 App Store Connect
            </a>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}