import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, TrendingUp, Users, FileText, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import AdminDisputeResolution from "../components/wallet/AdminDisputeResolution";

export default function AdminPanel() {
  const [showDisputes, setShowDisputes] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => await base44.auth.me()
  });

  const { data: disputes = [] } = useQuery({
    queryKey: ['admin-disputes-count'],
    queryFn: async () => {
      return await base44.entities.P2PEscrow.filter({ status: 'disputed' });
    },
    enabled: currentUser?.role === 'admin',
    refetchInterval: 10000
  });

  const { data: highRiskAlerts = [] } = useQuery({
    queryKey: ['admin-fraud-alerts'],
    queryFn: async () => {
      return await base44.entities.Notification.filter({
        recipient_email: currentUser.email,
        type: 'alert',
        title: { $regex: 'Fraud Alert' },
        read: false
      });
    },
    enabled: currentUser?.role === 'admin',
    refetchInterval: 10000
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white">Access denied - Admin only</p>
      </div>
    );
  }

  if (showDisputes) {
    return <AdminDisputeResolution currentUser={currentUser} onClose={() => setShowDisputes(false)} />;
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 flex items-center gap-3">
          <Shield className="w-10 h-10 text-purple-400" />
          Admin Control Panel
        </h1>

        {/* Alert Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setShowDisputes(true)}
            className="cursor-pointer"
          >
            <Card className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/30 hover:border-red-500/50 transition">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                  {disputes.length > 0 && (
                    <Badge className="bg-red-500 text-white">{disputes.length}</Badge>
                  )}
                </div>
                <h3 className="text-white font-bold text-2xl mb-1">{disputes.length}</h3>
                <p className="text-red-300 text-sm">Active Disputes</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border-orange-500/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Sparkles className="w-8 h-8 text-orange-400" />
                  {highRiskAlerts.length > 0 && (
                    <Badge className="bg-orange-500 text-white">{highRiskAlerts.length}</Badge>
                  )}
                </div>
                <h3 className="text-white font-bold text-2xl mb-1">{highRiskAlerts.length}</h3>
                <p className="text-orange-300 text-sm">Fraud Alerts</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-white font-bold text-2xl mb-1">Platform</h3>
                <p className="text-purple-300 text-sm">Health: Good</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <h3 className="text-white font-bold text-xl mb-4">Quick Actions</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Button
                onClick={() => setShowDisputes(true)}
                className="bg-red-600 hover:bg-red-700 h-16"
              >
                <Shield className="w-5 h-5 mr-2" />
                Manage Disputes ({disputes.length})
              </Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700 h-16"
              >
                <Users className="w-5 h-5 mr-2" />
                User Management
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 h-16"
              >
                <FileText className="w-5 h-5 mr-2" />
                Platform Reports
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 h-16"
              >
                <TrendingUp className="w-5 h-5 mr-2" />
                Analytics Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Fraud Alerts */}
        {highRiskAlerts.length > 0 && (
          <Card className="bg-orange-500/10 border-orange-500/30 mt-6">
            <CardContent className="p-6">
              <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-400" />
                Recent Fraud Alerts
              </h3>
              <div className="space-y-3">
                {highRiskAlerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="bg-white/5 rounded-lg p-4">
                    <p className="text-white font-semibold mb-1">{alert.title}</p>
                    <p className="text-gray-400 text-sm">{alert.message}</p>
                    <p className="text-gray-500 text-xs mt-2">
                      {new Date(alert.created_date).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}