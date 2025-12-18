import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Activity, AlertTriangle, CheckCircle2, XCircle, 
  RefreshCw, TrendingUp, Zap, DollarSign, Database,
  Cpu, HardDrive, Clock, Shield, Wrench, ArrowLeft,
  BarChart3, Sparkles, FileText, Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function SystemDiagnostics() {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(user => {
      if (!user || user.role !== 'admin') {
        toast.error('Admin access required');
        navigate(createPageUrl("Home"));
      }
      setCurrentUser(user);
    });
  }, []);

  const { data: healthData, refetch: refetchHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await base44.functions.invoke('systemDiagnostics', {
        action: 'health_check'
      });
      return response.data;
    },
    refetchInterval: 30000,
    enabled: !!currentUser
  });

  const runProactiveScan = async () => {
    setIsScanning(true);
    toast.info('🔍 Running comprehensive system scan...');
    
    try {
      const response = await base44.functions.invoke('systemDiagnostics', {
        action: 'proactive_scan'
      });
      
      setLastScan(response.data);
      
      if (response.data.severity_summary.critical > 0) {
        toast.error(`🚨 ${response.data.severity_summary.critical} critical issues found!`);
      } else {
        toast.success(`✅ Scan complete: ${response.data.findings.issues.length} issues found`);
      }
      
      if (response.data.auto_healing.fixed_count > 0) {
        toast.success(`🔧 Auto-healed ${response.data.auto_healing.fixed_count} issues`);
      }
    } catch (error) {
      toast.error('Scan failed: ' + error.message);
    } finally {
      setIsScanning(false);
    }
  };

  const runPerformanceAnalysis = async () => {
    toast.info('📊 Analyzing system performance...');
    try {
      const response = await base44.functions.invoke('systemDiagnostics', {
        action: 'performance_analysis'
      });
      
      const analysis = response.data;
      console.log('Performance Analysis:', analysis);
      
      const avgTime = analysis.metrics?.avg_query_time_ms;
      if (avgTime) {
        toast.success(`Performance analysis complete - Avg query: ${avgTime.toFixed(0)}ms`);
      }
    } catch (error) {
      toast.error('Analysis failed: ' + error.message);
    }
  };

  const runCostAnalysis = async () => {
    toast.info('💰 Analyzing cost optimizations...');
    try {
      const response = await base44.functions.invoke('systemDiagnostics', {
        action: 'cost_optimization'
      });
      
      const costReport = response.data;
      console.log('Cost Report:', costReport);
      
      if (costReport.total_potential_monthly_savings) {
        toast.success(`Found ${costReport.total_potential_monthly_savings} in potential monthly savings!`);
      }
    } catch (error) {
      toast.error('Analysis failed: ' + error.message);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 border-red-500/50';
      case 'high': return 'bg-orange-500/20 border-orange-500/50';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500/50';
      case 'low': return 'bg-blue-500/20 border-blue-500/50';
      default: return 'bg-gray-500/20 border-gray-500/50';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return XCircle;
      case 'high': return AlertTriangle;
      case 'medium': return Activity;
      case 'low': return CheckCircle2;
      default: return Activity;
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Button
                onClick={() => navigate(createPageUrl("AdminPanel"))}
                variant="outline"
                className="bg-white/10 border-white/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                <Shield className="w-10 h-10 text-purple-400" />
                System Diagnostics
              </h1>
            </div>
            <p className="text-gray-400">AI-powered proactive monitoring & self-healing</p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={runProactiveScan}
              disabled={isScanning}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Full Scan
                </>
              )}
            </Button>
            <Button
              onClick={runPerformanceAnalysis}
              variant="outline"
              className="bg-white/10 border-white/20"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Performance
            </Button>
            <Button
              onClick={runCostAnalysis}
              variant="outline"
              className="bg-white/10 border-white/20"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Cost Analysis
            </Button>
          </div>
        </div>

        {/* Health Status Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="glass-effect border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
                <span className="text-white font-bold">Operational</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                API Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
                <span className="text-white font-bold">
                  {healthData?.status === 'healthy' ? 'Healthy' : 'OK'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
                <span className="text-white font-bold">Optimal</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Last Scan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-white font-bold text-sm">
                {lastScan ? new Date(lastScan.scan_timestamp).toLocaleTimeString() : 'Not run yet'}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Scan Results */}
        {lastScan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="glass-effect border-red-500/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <div className="text-4xl font-bold text-red-400 mb-1">
                      {lastScan.severity_summary.critical}
                    </div>
                    <div className="text-gray-400 text-sm">Critical</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect border-orange-500/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <AlertTriangle className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                    <div className="text-4xl font-bold text-orange-400 mb-1">
                      {lastScan.severity_summary.high}
                    </div>
                    <div className="text-gray-400 text-sm">High</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect border-yellow-500/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Activity className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <div className="text-4xl font-bold text-yellow-400 mb-1">
                      {lastScan.severity_summary.medium}
                    </div>
                    <div className="text-gray-400 text-sm">Medium</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect border-green-500/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Wrench className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <div className="text-4xl font-bold text-green-400 mb-1">
                      {lastScan.auto_healing.fixed_count}
                    </div>
                    <div className="text-gray-400 text-sm">Auto-Healed</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Issues List */}
            <Card className="glass-effect border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-400" />
                  Detected Issues & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lastScan.findings.issues.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-20 h-20 text-green-400 mx-auto mb-4" />
                    <p className="text-white text-2xl font-bold mb-2">All Systems Operational!</p>
                    <p className="text-gray-400">No issues detected. System is running optimally.</p>
                  </div>
                ) : (
                  lastScan.findings.issues.map((issue, idx) => {
                    const Icon = getSeverityIcon(issue.severity);
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`p-5 rounded-xl border ${getSeverityColor(issue.severity)}`}
                      >
                        <div className="flex items-start gap-4">
                          <Icon className={`w-7 h-7 flex-shrink-0 mt-1 ${
                            issue.severity === 'critical' ? 'text-red-400' :
                            issue.severity === 'high' ? 'text-orange-400' :
                            issue.severity === 'medium' ? 'text-yellow-400' :
                            'text-blue-400'
                          }`} />
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-white font-bold text-lg">{issue.title}</h3>
                              <Badge className={`${
                                issue.severity === 'critical' ? 'bg-red-500' :
                                issue.severity === 'high' ? 'bg-orange-500' :
                                issue.severity === 'medium' ? 'bg-yellow-500' :
                                'bg-blue-500'
                              } text-white font-bold`}>
                                {issue.severity.toUpperCase()}
                              </Badge>
                              {issue.auto_fixable && (
                                <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
                                  <Wrench className="w-3 h-3 mr-1" />
                                  Auto-fixable
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-gray-300 mb-3">{issue.description}</p>
                            
                            {issue.affected_count && (
                              <p className="text-gray-400 text-sm mb-3">
                                📊 Affected: <span className="font-bold">{issue.affected_count}</span> records
                              </p>
                            )}
                            
                            {issue.affected_users && (
                              <div className="mb-3">
                                <p className="text-gray-400 text-sm mb-1">Affected Users:</p>
                                <div className="flex flex-wrap gap-2">
                                  {issue.affected_users.slice(0, 5).map(email => (
                                    <Badge key={email} variant="outline" className="text-xs">
                                      {email}
                                    </Badge>
                                  ))}
                                  {issue.affected_users.length > 5 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{issue.affected_users.length - 5} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                              <p className="text-sm text-gray-300">
                                <span className="text-purple-400 font-semibold">💡 Recommendation:</span>{' '}
                                {issue.recommendation}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* AI Analysis */}
            {lastScan.ai_recommendations?.recommendations && (
              <Card className="glass-effect border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    AI Deep Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                      {lastScan.ai_recommendations.recommendations}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Self-Healing Actions */}
            {lastScan.auto_healing.actions_taken.length > 0 && (
              <Card className="glass-effect border-green-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-green-400" />
                    Self-Healing Actions Taken
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lastScan.auto_healing.actions_taken.map((action, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-white font-semibold">{action.action}</p>
                        {action.count && (
                          <p className="text-gray-400 text-sm mt-1">
                            ✅ Processed {action.count} record{action.count > 1 ? 's' : ''}
                          </p>
                        )}
                        {action.user_email && (
                          <p className="text-gray-400 text-sm">User: {action.user_email}</p>
                        )}
                        {action.error && (
                          <p className="text-red-400 text-sm mt-1">❌ {action.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* System Metrics */}
            {lastScan.findings.metrics && (
              <Card className="glass-effect border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    System Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Total Payments</p>
                      <p className="text-white text-2xl font-bold">{lastScan.findings.metrics.total_payments || 0}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Total Users</p>
                      <p className="text-white text-2xl font-bold">{lastScan.findings.metrics.total_users || 0}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Health Score</p>
                      <p className={`text-2xl font-bold ${
                        lastScan.findings.metrics.health_score >= 90 ? 'text-green-400' :
                        lastScan.findings.metrics.health_score >= 70 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {lastScan.findings.metrics.health_score || 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Empty State */}
        {!lastScan && (
          <Card className="glass-effect border-white/10">
            <CardContent className="py-20 text-center">
              <Shield className="w-20 h-20 text-purple-400 mx-auto mb-6 opacity-50" />
              <h3 className="text-2xl font-bold text-white mb-3">No Scan Results Yet</h3>
              <p className="text-gray-400 mb-6">Run a full system scan to analyze health, detect issues, and get AI recommendations</p>
              <Button
                onClick={runProactiveScan}
                disabled={isScanning}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Zap className="w-5 h-5 mr-2" />
                Run First Scan
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}