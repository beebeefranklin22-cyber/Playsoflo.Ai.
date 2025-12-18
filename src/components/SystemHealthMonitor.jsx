import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Activity, CheckCircle, AlertCircle, XCircle } from "lucide-react";

export default function SystemHealthMonitor() {
  const [health, setHealth] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkUserRole();
    runHealthCheck();
    const interval = setInterval(runHealthCheck, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  const checkUserRole = async () => {
    try {
      const user = await base44.auth.me();
      setIsAdmin(user?.role === 'admin');
    } catch {}
  };

  const runHealthCheck = async () => {
    try {
      const result = await base44.functions.invoke('healthCheck', {});
      setHealth(result.data);
    } catch (error) {
      console.error('Health check failed:', error);
      setHealth({ status: 'critical', error: error.message });
    }
  };

  if (!isAdmin || !health) return null;

  const statusColors = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    critical: 'bg-red-500'
  };

  const StatusIcon = health.status === 'healthy' ? CheckCircle : 
                     health.status === 'degraded' ? AlertCircle : XCircle;

  return (
    <div className="fixed bottom-24 left-4 z-50 bg-gray-900/95 backdrop-blur-xl rounded-xl p-3 border border-white/20 shadow-2xl">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${statusColors[health.status]} animate-pulse`} />
        <StatusIcon className="w-4 h-4 text-white" />
        <span className="text-white text-xs font-bold">
          {health.status.toUpperCase()} • {health.responseTime}ms
        </span>
      </div>
    </div>
  );
}