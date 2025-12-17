import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Search, Star, DollarSign, Car, Ban, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      return await base44.asServiceRole.entities.User.list('-created_date', 500);
    }
  });

  const toggleDriverStatusMutation = useMutation({
    mutationFn: async ({ userId, newStatus }) => {
      await base44.asServiceRole.entities.User.update(userId, {
        driver_is_online: newStatus
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      toast.success('Driver status updated');
    }
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'drivers' && user.driver_total_ratings > 0) ||
                         (filterType === 'passengers' && !user.driver_total_ratings);
    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalUsers: users.length,
    drivers: users.filter(u => u.driver_total_ratings > 0).length,
    passengers: users.filter(u => !u.driver_total_ratings || u.driver_total_ratings === 0).length,
    onlineDrivers: users.filter(u => u.driver_is_online).length
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-purple-400">{stats.totalUsers}</div>
            <div className="text-gray-400 text-sm">Total Users</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{stats.drivers}</div>
            <div className="text-gray-400 text-sm">Drivers</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{stats.passengers}</div>
            <div className="text-gray-400 text-sm">Passengers</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-orange-400">{stats.onlineDrivers}</div>
            <div className="text-gray-400 text-sm">Online Now</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="pl-10 bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setFilterType('all')}
                variant={filterType === 'all' ? 'default' : 'outline'}
                className={filterType === 'all' ? 'bg-purple-600' : ''}
              >
                All
              </Button>
              <Button
                onClick={() => setFilterType('drivers')}
                variant={filterType === 'drivers' ? 'default' : 'outline'}
                className={filterType === 'drivers' ? 'bg-blue-600' : ''}
              >
                <Car className="w-4 h-4 mr-2" />
                Drivers
              </Button>
              <Button
                onClick={() => setFilterType('passengers')}
                variant={filterType === 'passengers' ? 'default' : 'outline'}
                className={filterType === 'passengers' ? 'bg-green-600' : ''}
              >
                <User className="w-4 h-4 mr-2" />
                Passengers
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User List */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {user.full_name?.[0] || 'U'}
                  </div>
                  <div>
                    <div className="text-white font-semibold">{user.full_name}</div>
                    <div className="text-gray-400 text-sm">{user.email}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {user.driver_is_online && (
                        <Badge className="bg-green-500 text-white text-xs">Online</Badge>
                      )}
                      {user.driver_total_ratings > 0 && (
                        <Badge className="bg-blue-500 text-white text-xs">Driver</Badge>
                      )}
                      {user.role === 'admin' && (
                        <Badge className="bg-purple-500 text-white text-xs">Admin</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    {user.driver_rating && (
                      <div className="flex items-center gap-1 text-yellow-400 mb-1">
                        <Star className="w-4 h-4 fill-yellow-400" />
                        <span className="font-semibold">{user.driver_rating.toFixed(1)}</span>
                        <span className="text-gray-400 text-xs">({user.driver_total_ratings})</span>
                      </div>
                    )}
                    <div className="text-green-400 font-bold">
                      ${(user.usd_balance || 0).toFixed(2)}
                    </div>
                  </div>
                  {user.driver_total_ratings > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleDriverStatusMutation.mutate({
                        userId: user.id,
                        newStatus: !user.driver_is_online
                      })}
                      disabled={toggleDriverStatusMutation.isPending}
                    >
                      {user.driver_is_online ? (
                        <>
                          <Ban className="w-4 h-4 mr-1" />
                          Set Offline
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Set Online
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}