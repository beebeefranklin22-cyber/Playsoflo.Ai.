import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, CreditCard, History, Heart, Settings, Star, 
  Volume2, Wind, Music, MessageCircle, Droplets, MapPin,
  Calendar, DollarSign, Phone, Mail, Award
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function PassengerProfile() {
  const [currentUser, setCurrentUser] = useState(null);
  const [preferences, setPreferences] = useState({
    quiet_ride: false,
    ac_preference: "medium",
    music_genre: "none",
    conversation: "minimal",
    no_perfume: false
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      if (user.ride_preferences) {
        setPreferences(user.ride_preferences);
      }
    });
  }, []);

  // Fetch ride history
  const { data: rideHistory = [] } = useQuery({
    queryKey: ['passenger-rides', currentUser?.email],
    queryFn: async () => {
      const rides = await base44.entities.RideRequest.filter({
        created_by: currentUser.email
      });
      return rides.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!currentUser
  });

  // Fetch favorite drivers info
  const { data: favoriteDrivers = [] } = useQuery({
    queryKey: ['favorite-drivers', currentUser?.favorite_drivers],
    queryFn: async () => {
      if (!currentUser?.favorite_drivers?.length) return [];
      const drivers = await base44.entities.User.list();
      return drivers.filter(d => currentUser.favorite_drivers.includes(d.email));
    },
    enabled: !!currentUser?.favorite_drivers
  });

  // Update preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPrefs) => {
      await base44.auth.updateMe({
        ride_preferences: newPrefs
      });
    },
    onSuccess: () => {
      toast.success('✅ Preferences updated');
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    }
  });

  const handleSavePreferences = () => {
    updatePreferencesMutation.mutate(preferences);
  };

  const removeFavoriteDriver = async (driverEmail) => {
    const updated = currentUser.favorite_drivers.filter(d => d !== driverEmail);
    await base44.auth.updateMe({ favorite_drivers: updated });
    setCurrentUser({ ...currentUser, favorite_drivers: updated });
    queryClient.invalidateQueries({ queryKey: ['favorite-drivers'] });
    toast.success('Driver removed from favorites');
  };

  const stats = {
    totalRides: rideHistory.length,
    completedRides: rideHistory.filter(r => r.status === 'completed').length,
    totalSpent: rideHistory
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + (r.fare_breakdown?.total_fare || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{currentUser?.full_name}</h1>
              <p className="text-gray-400">{currentUser?.email}</p>
              {currentUser?.passenger_rating && (
                <div className="flex items-center gap-2 mt-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-white font-semibold">{currentUser.passenger_rating.toFixed(1)}</span>
                  <span className="text-gray-400 text-sm">({currentUser.passenger_total_ratings} ratings)</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-purple-400">{stats.totalRides}</div>
                <div className="text-gray-400 text-sm">Total Rides</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-green-400">{stats.completedRides}</div>
                <div className="text-gray-400 text-sm">Completed</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-blue-400">${stats.totalSpent.toFixed(2)}</div>
                <div className="text-gray-400 text-sm">Total Spent</div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="preferences" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="preferences" className="data-[state=active]:bg-purple-600">
              <Settings className="w-4 h-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-purple-600">
              <History className="w-4 h-4 mr-2" />
              Ride History
            </TabsTrigger>
            <TabsTrigger value="favorites" className="data-[state=active]:bg-purple-600">
              <Heart className="w-4 h-4 mr-2" />
              Favorite Drivers
            </TabsTrigger>
            <TabsTrigger value="payment" className="data-[state=active]:bg-purple-600">
              <CreditCard className="w-4 h-4 mr-2" />
              Payment Methods
            </TabsTrigger>
          </TabsList>

          {/* Ride Preferences */}
          <TabsContent value="preferences">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Ride Preferences</CardTitle>
                <p className="text-gray-400 text-sm">Set your comfort preferences for rides</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-blue-400" />
                    <div>
                      <Label className="text-white font-semibold">Quiet Ride</Label>
                      <p className="text-gray-400 text-xs">Minimal conversation preferred</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.quiet_ride}
                    onCheckedChange={(checked) => setPreferences({...preferences, quiet_ride: checked})}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Droplets className="w-5 h-5 text-pink-400" />
                    <div>
                      <Label className="text-white font-semibold">No Strong Scents</Label>
                      <p className="text-gray-400 text-xs">Sensitive to perfumes</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.no_perfume}
                    onCheckedChange={(checked) => setPreferences({...preferences, no_perfume: checked})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    <Wind className="w-4 h-4 text-cyan-400" />
                    Air Conditioning
                  </Label>
                  <select
                    value={preferences.ac_preference}
                    onChange={(e) => setPreferences({...preferences, ac_preference: e.target.value})}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
                  >
                    <option value="off">Off</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    <Music className="w-4 h-4 text-green-400" />
                    Music Preference
                  </Label>
                  <select
                    value={preferences.music_genre}
                    onChange={(e) => setPreferences({...preferences, music_genre: e.target.value})}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
                  >
                    <option value="none">No Music</option>
                    <option value="pop">Pop</option>
                    <option value="rock">Rock</option>
                    <option value="hip-hop">Hip-Hop</option>
                    <option value="jazz">Jazz</option>
                    <option value="classical">Classical</option>
                    <option value="electronic">Electronic</option>
                    <option value="country">Country</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-purple-400" />
                    Conversation Level
                  </Label>
                  <select
                    value={preferences.conversation}
                    onChange={(e) => setPreferences({...preferences, conversation: e.target.value})}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
                  >
                    <option value="none">Prefer Silence</option>
                    <option value="minimal">Minimal Chat</option>
                    <option value="friendly">Friendly Conversation</option>
                  </select>
                </div>

                <Button
                  onClick={handleSavePreferences}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                  disabled={updatePreferencesMutation.isPending}
                >
                  {updatePreferencesMutation.isPending ? 'Saving...' : 'Save Preferences'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ride History */}
          <TabsContent value="history">
            <div className="space-y-4">
              {rideHistory.map((ride) => (
                <motion.div
                  key={ride.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={
                              ride.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                              ride.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                              'bg-blue-500/20 text-blue-400'
                            }>
                              {ride.status}
                            </Badge>
                            <span className="text-gray-400 text-sm">
                              {new Date(ride.created_date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2 text-white">
                              <MapPin className="w-4 h-4 text-green-400" />
                              {ride.pickup_address}
                            </div>
                            <div className="flex items-center gap-2 text-white">
                              <MapPin className="w-4 h-4 text-red-400" />
                              {ride.dropoff_address}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-400">
                            ${ride.fare_breakdown?.total_fare?.toFixed(2) || '0.00'}
                          </div>
                          {ride.driver_email && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 text-xs"
                              onClick={() => window.location.href = `/messages?user=${ride.driver_email}`}
                            >
                              <Mail className="w-3 h-3 mr-1" />
                              Contact Driver
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {rideHistory.length === 0 && (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-12 text-center">
                    <History className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Rides Yet</h3>
                    <p className="text-gray-400">Your ride history will appear here</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Favorite Drivers */}
          <TabsContent value="favorites">
            <div className="space-y-4">
              {favoriteDrivers.map((driver) => (
                <Card key={driver.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {driver.full_name?.[0] || 'D'}
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">{driver.full_name}</h3>
                          {driver.driver_rating && (
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              <span className="text-yellow-400 font-semibold">{driver.driver_rating.toFixed(1)}</span>
                              <span className="text-gray-400 text-xs">({driver.driver_total_ratings} rides)</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = `/messages?user=${driver.email}`}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-400 hover:text-red-500"
                          onClick={() => removeFavoriteDriver(driver.email)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {favoriteDrivers.length === 0 && (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-12 text-center">
                    <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Favorite Drivers</h3>
                    <p className="text-gray-400">Favorite drivers after great rides to easily request them again</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Payment Methods */}
          <TabsContent value="payment">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-6 h-6 text-green-400" />
                        <div>
                          <div className="text-white font-semibold">PlaySoFlo Wallet</div>
                          <div className="text-gray-400 text-sm">Primary payment method</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">${currentUser?.usd_balance?.toFixed(2) || '0.00'}</div>
                        <div className="text-gray-400 text-xs">Available Balance</div>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => window.location.href = '/wallet'}>
                    Manage Wallet & Add Money
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}