import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  MapPin, Camera, Users, Mic, Wifi, Search, Bell, 
  Smartphone, RefreshCw, Shield, Info, CheckCircle, XCircle 
} from "lucide-react";
import { toast } from "sonner";

export default function PermissionsSettings() {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({
    location: false,
    camera: false,
    contacts: false,
    microphone: false,
    local_network: false,
    search: false,
    notifications: false,
    cellular_data: false,
    background_refresh: false
  });
  const [systemPermissions, setSystemPermissions] = useState({});

  useEffect(() => {
    fetchUser();
    checkSystemPermissions();
  }, []);

  const fetchUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      if (currentUser.permissions) {
        setPermissions(currentUser.permissions);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const checkSystemPermissions = async () => {
    const status = {};
    
    // Check location
    if ('geolocation' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        status.location = result.state === 'granted';
      } catch (e) {
        status.location = false;
      }
    }

    // Check notifications
    if ('Notification' in window) {
      status.notifications = Notification.permission === 'granted';
    }

    // Check camera/microphone
    if ('mediaDevices' in navigator) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        status.camera = devices.some(d => d.kind === 'videoinput' && d.label);
        status.microphone = devices.some(d => d.kind === 'audioinput' && d.label);
      } catch (e) {
        status.camera = false;
        status.microphone = false;
      }
    }

    setSystemPermissions(status);
  };

  const requestSystemPermission = async (type) => {
    try {
      if (type === 'location' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          () => {
            toast.success("Location permission granted");
            checkSystemPermissions();
          },
          () => toast.error("Location permission denied")
        );
      } else if (type === 'notifications' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          toast.success("Notification permission granted");
          checkSystemPermissions();
        } else {
          toast.error("Notification permission denied");
        }
      } else if (type === 'camera' || type === 'microphone') {
        const constraints = {
          video: type === 'camera',
          audio: type === 'microphone'
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        stream.getTracks().forEach(track => track.stop());
        toast.success(`${type === 'camera' ? 'Camera' : 'Microphone'} permission granted`);
        checkSystemPermissions();
      }
    } catch (error) {
      console.error(`Error requesting ${type} permission:`, error);
      toast.error(`Failed to request ${type} permission`);
    }
  };

  const togglePermission = async (key) => {
    const newPermissions = {
      ...permissions,
      [key]: !permissions[key]
    };

    setPermissions(newPermissions);

    try {
      await base44.auth.updateMe({
        permissions: newPermissions
      });
      toast.success(`${key.replace('_', ' ')} permission ${newPermissions[key] ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error("Error updating permissions:", error);
      toast.error("Failed to update permission");
      setPermissions(permissions); // Revert
    }
  };

  const permissionItems = [
    {
      key: 'location',
      icon: MapPin,
      title: 'Location Services',
      description: 'Allow PlaysoFlo to access your location for nearby services and rides',
      systemCheck: true
    },
    {
      key: 'camera',
      icon: Camera,
      title: 'Camera',
      description: 'Access camera for profile photos, content creation, and AR features',
      systemCheck: true
    },
    {
      key: 'contacts',
      icon: Users,
      title: 'Contacts',
      description: 'Find friends and share content with your contacts',
      systemCheck: false
    },
    {
      key: 'microphone',
      icon: Mic,
      title: 'Microphone',
      description: 'Record audio for voice messages, calls, and video content',
      systemCheck: true
    },
    {
      key: 'local_network',
      icon: Wifi,
      title: 'Local Network',
      description: 'Connect to nearby devices for casting and streaming',
      systemCheck: false
    },
    {
      key: 'search',
      icon: Search,
      title: 'Search Integration',
      description: 'Make PlaysoFlo content searchable in system-wide search',
      systemCheck: false
    },
    {
      key: 'notifications',
      icon: Bell,
      title: 'Notifications',
      description: 'Receive alerts for messages, bookings, rides, and important updates',
      systemCheck: true
    },
    {
      key: 'cellular_data',
      icon: Smartphone,
      title: 'Cellular Data',
      description: 'Use cellular data when WiFi is unavailable',
      systemCheck: false
    },
    {
      key: 'background_refresh',
      icon: RefreshCw,
      title: 'Background App Refresh',
      description: 'Keep content updated when app is in background',
      systemCheck: false
    }
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="bg-slate-900/80 border-purple-500/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-white text-2xl">App Permissions</CardTitle>
              <CardDescription className="text-gray-400">
                Manage what PlaysoFlo can access on your device
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-gray-300">
          <p className="font-semibold text-white mb-1">Privacy First</p>
          <p>Your privacy is important. These permissions are only used to enhance your experience. You can change them anytime.</p>
        </div>
      </div>

      <div className="space-y-3">
        {permissionItems.map((item) => {
          const Icon = item.icon;
          const isEnabled = permissions[item.key];
          const systemGranted = systemPermissions[item.key];

          return (
            <Card key={item.key} className="bg-slate-900/60 border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      isEnabled ? 'bg-purple-600/20' : 'bg-slate-700/50'
                    }`}>
                      <Icon className={`w-6 h-6 ${isEnabled ? 'text-purple-400' : 'text-gray-500'}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold">{item.title}</h3>
                        {item.systemCheck && (
                          systemGranted ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-500" />
                          )
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{item.description}</p>
                      
                      {item.systemCheck && !systemGranted && isEnabled && (
                        <Button
                          onClick={() => requestSystemPermission(item.key)}
                          size="sm"
                          variant="outline"
                          className="mt-3 border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
                        >
                          Grant System Permission
                        </Button>
                      )}
                    </div>
                  </div>

                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => togglePermission(item.key)}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-slate-900/60 border-yellow-500/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div className="text-sm text-gray-300">
              <p className="font-semibold text-white mb-2">Important Security Notice</p>
              <p>Disabling certain permissions may limit functionality. Some features require specific permissions to work properly. Your data is never sold to third parties and is protected according to our Terms of Service.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}