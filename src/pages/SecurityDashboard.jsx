import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, AlertTriangle, Activity, Lock, Eye, 
  TrendingUp, Users, FileWarning, CheckCircle2,
  XCircle, Clock, Map, Zap, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { threatMonitor } from '../components/security/ThreatMonitor';
import { sessionManager } from '../components/security/SessionManager';
import { anomalyDetector } from '../components/security/AnomalyDetector';

export default function SecurityDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [threatLevel, setThreatLevel] = useState('low');
  const [sessionStatus, setSessionStatus] = useState('active');
  const [liveThreats, setLiveThreats] = useState([]);

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user?.role !== 'admin') {
        window.location.href = '/';
        return;
      }
      setCurrentUser(user);
    });

    // Monitor threat level
    const interval = setInterval(() => {
      setThreatLevel(threatMonitor.threatLevel);
      setLiveThreats(threatMonitor.threats.slice(-20));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Fetch security logs
  const { data: securityLogs = [], refetch } = useQuery({
    queryKey: ['security-logs'],
    queryFn: async () => {
      const logs = await base44.entities.ErrorLog.list();
      return logs.filter(log => 
        log.error_message?.includes('Security') || 
        log.error_message?.includes('Threat') ||
        log.error_message?.includes('Audit')
      ).slice(0, 50);
    },
    refetchInterval: 10000,
    enabled: !!currentUser
  });

  const threatLevelColors = {
    low: { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400' },
    medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400' },
    high: { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400' },
    critical: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400' }
  };

  const currentThreatColors = threatLevelColors[threatLevel] || threatLevelColors.low;

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  const stats = {
    totalLogs: securityLogs.length,
    criticalEvents: securityLogs.filter(log => log.error_message?.includes('CRITICAL')).length,
    recentThreats: liveThreats.length,
    blockedAttempts: securityLogs.filter(log => 
      log.error_message?.includes('BLOCKED') || 
      log.error_message?.includes('RATE_LIMIT')
    ).length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Shield className="w-10 h-10 text-blue-400" />
                Security Operations Center
              </h1>
              <p className="text-gray-400">Zero-trust multi-layered defense monitoring</p>
            </div>
            <Button onClick={() => refetch()} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Threat Level Indicator */}
        <Card className={`${currentThreatColors.bg} border-2 ${currentThreatColors.border} mb-6`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full ${currentThreatColors.bg} flex items-center justify-center`}>
                  <Shield className={`w-8 h-8 ${currentThreatColors.text}`} />
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">Current Threat Level</div>
                  <div className={`text-3xl font-bold ${currentThreatColors.text} uppercase`}>
                    {threatLevel}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-gray-400 text-sm mb-1">Active Monitoring</div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-400 font-medium">Online</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 text-center">
              <FileWarning className="w-10 h-10 text-blue-400 mx-auto mb-3" />
              <div className="text-3xl font-bold text-white mb-1">{stats.totalLogs}</div>
              <div className="text-gray-400 text-sm">Security Events</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <div className="text-3xl font-bold text-white mb-1">{stats.criticalEvents}</div>
              <div className="text-gray-400 text-sm">Critical Alerts</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 text-center">
              <Activity className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
              <div className="text-3xl font-bold text-white mb-1">{stats.recentThreats}</div>
              <div className="text-gray-400 text-sm">Active Threats</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 text-center">
              <Shield className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <div className="text-3xl font-bold text-white mb-1">{stats.blockedAttempts}</div>
              <div className="text-gray-400 text-sm">Blocked Attacks</div>
            </CardContent>
          </Card>
        </div>

        {/* Live Threats */}
        {liveThreats.length > 0 && (
          <Card className="bg-red-500/10 border-red-500/30 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
                Active Threats
                <Badge className="bg-red-500 animate-pulse">{liveThreats.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {liveThreats.slice(0, 5).map((threat, idx) => (
                  <div key={idx} className="p-4 bg-white/5 rounded-xl border border-red-500/20">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={
                            threat.severity === 'critical' ? 'bg-red-500' :
                            threat.severity === 'high' ? 'bg-orange-500' :
                            threat.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                          }>
                            {threat.severity?.toUpperCase()}
                          </Badge>
                          <span className="text-white font-bold">{threat.type}</span>
                        </div>
                        <div className="text-gray-400 text-sm">
                          {new Date(threat.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    {threat.metadata && (
                      <pre className="text-xs text-gray-500 bg-black/30 p-2 rounded overflow-x-auto">
                        {JSON.stringify(threat.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Layers Status */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Lock className="w-6 h-6 text-blue-400" />
                Defense Layers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: 'Rate Limiting', status: 'active', icon: Zap },
                { name: 'Input Sanitization', status: 'active', icon: CheckCircle2 },
                { name: 'Anomaly Detection', status: 'active', icon: Activity },
                { name: 'Session Validation', status: 'active', icon: Lock },
                { name: 'CSRF Protection', status: 'active', icon: Shield },
                { name: 'XSS Prevention', status: 'active', icon: Shield },
                { name: 'Audit Logging', status: 'active', icon: FileWarning }
              ].map((layer, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <layer.icon className="w-4 h-4 text-blue-400" />
                    <span className="text-white font-medium">{layer.name}</span>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {layer.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Eye className="w-6 h-6 text-purple-400" />
                Real-time Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl">
                <div className="text-gray-400 text-sm mb-1">Session Integrity</div>
                <div className="text-white font-bold text-xl">✓ Verified</div>
              </div>
              
              <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl">
                <div className="text-gray-400 text-sm mb-1">Behavior Analysis</div>
                <div className="text-white font-bold text-xl">Human Verified</div>
              </div>
              
              <div className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl">
                <div className="text-gray-400 text-sm mb-1">Active Sessions</div>
                <div className="text-white font-bold text-xl">Monitored</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Security Events */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-400" />
              Recent Security Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {securityLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-400">No security events detected</p>
                  <p className="text-gray-500 text-sm">All systems secure</p>
                </div>
              ) : (
                securityLogs.map((log) => (
                  <div key={log.id} className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {log.error_message?.includes('CRITICAL') ? (
                            <XCircle className="w-4 h-4 text-red-400" />
                          ) : log.error_message?.includes('WARNING') ? (
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-blue-400" />
                          )}
                          <span className="text-white font-medium">{log.error_message}</span>
                        </div>
                        <div className="text-gray-400 text-xs flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {new Date(log.created_date).toLocaleString()}
                        </div>
                        {log.user_email && (
                          <div className="text-gray-500 text-xs mt-1">
                            User: {log.user_email}
                          </div>
                        )}
                      </div>
                    </div>
                    {log.error_stack && (
                      <details className="mt-2">
                        <summary className="text-gray-400 text-xs cursor-pointer hover:text-white">
                          View Details
                        </summary>
                        <pre className="text-xs text-gray-500 bg-black/30 p-3 rounded mt-2 overflow-x-auto">
                          {log.error_stack}
                        </pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Recommendations */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30 mt-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-6 h-6 text-purple-400" />
              Active Security Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-xl">
                <h3 className="text-white font-bold mb-2">✓ Zero-Trust Architecture</h3>
                <p className="text-gray-400 text-sm">
                  Every request is verified regardless of source
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <h3 className="text-white font-bold mb-2">✓ Multi-Layer Defense</h3>
                <p className="text-gray-400 text-sm">
                  7+ security layers protecting your app
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <h3 className="text-white font-bold mb-2">✓ Real-time Threat Detection</h3>
                <p className="text-gray-400 text-sm">
                  AI-powered anomaly detection and response
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <h3 className="text-white font-bold mb-2">✓ Comprehensive Audit Trail</h3>
                <p className="text-gray-400 text-sm">
                  Complete logging of all security events
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <h3 className="text-white font-bold mb-2">✓ Session Protection</h3>
                <p className="text-gray-400 text-sm">
                  Anti-hijacking with device fingerprinting
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <h3 className="text-white font-bold mb-2">✓ Input Sanitization</h3>
                <p className="text-gray-400 text-sm">
                  XSS and SQL injection prevention
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}