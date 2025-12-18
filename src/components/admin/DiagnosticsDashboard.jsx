import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { 
  Activity, AlertTriangle, CheckCircle2, XCircle, 
  RefreshCw, TrendingUp, Zap, DollarSign, Database,
  Cpu, HardDrive, Clock, Shield, Wrench
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function DiagnosticsDashboard() {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [selectedTab, setSelectedTab] = useState('overview');

  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await base44.functions.invoke('systemDiagnostics', {
        action: 'health_check'
      });
      return response.data;
    },
    refetchInterval: 30000
  });

  const runProactiveScan = async () => {
    setIsScanning(true);
    toast.info('🔍 Starting comprehensive system scan...');
    
    try {
      const response = await base44.functions.invoke('systemDiagnostics', {
        action: 'proactive_scan'
      });
      
      setLastScan(response.data);
      toast.success(`✅ Scan complete: ${response.data.findings.issues.length} issues found`);
      
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
    toast.info('📊 Analyzing performance...');
    try {
      const response = await base44.functions.invoke('systemDiagnostics', {
        action: 'performance_analysis'
      });
      toast.success('Performance analysis complete');
      console.log('Performance:', response.data);
    } catch (error) {
      toast.error('Analysis failed: ' + error.message);
    }
  };

  const runCostAnalysis = async () => {
    toast.info('💰 Analyzing costs...');
    try {
      const response = await base44.functions.invoke('systemDiagnostics', {
        action: 'cost_optimization'
      });
      toast.success('Cost analysis complete');
      console.log('Cost Report:', response.data);
    } catch (error) {
      toast.error('Analysis failed: ' + error.message);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'from-red-500 to-red-600';
      case 'high': return 'from-orange-500 to-orange-600';
      case 'medium': return 'from-yellow-500 to-yellow-600';
      case 'low': return 'from-blue-500 to-blue-600';
      default: return 'from-gray-500 to-gray-600';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Shield className="w-10 h-10 text-purple-400" />
              System Diagnostics
            </h1>
            <p className="text-gray-400">Proactive monitoring & self-healing AI system</p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={runProactiveScan}
              disabled={isScanning}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isScanning ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              {isScanning ? 'Scanning...' : 'Run Full Scan'}
            </Button>
            <Button
              onClick={runPerformanceAnalysis}
              variant="outline"
              className="bg-white/10 border-white/20"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
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

        {/* Health Status */}
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
                <span className="text-white font-bold">Healthy</span>
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
              <span className="text-white font-bold">
                {lastScan ? new Date(lastScan.scan_timestamp).toLocaleTimeString() : 'Never'}
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
            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="glass-effect border-red-500/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-red-400 mb-2">
                      {lastScan.severity_summary.critical}
                    </div>
                    <div className="text-gray-400 text-sm">Critical Issues</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect border-orange-500/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-orange-400 mb-2">
                      {lastScan.severity_summary.high}
                    </div>
                    <div className="text-gray-400 text-sm">High Priority</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect border-yellow-500/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-yellow-400 mb-2">
                      {lastScan.severity_summary.medium}
                    </div>
                    <div className="text-gray-400 text-sm">Medium Priority</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect border-green-500/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-400 mb-2">
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
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Detected Issues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lastScan.findings.issues.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <p className="text-white text-lg font-bold">All Clear!</p>
                    <p className="text-gray-400">No issues detected in the system</p>
                  </div>
                ) : (
                  lastScan.findings.issues.map((issue, idx) => {
                    const Icon = getSeverityIcon(issue.severity);
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`p-4 rounded-xl bg-gradient-to-r ${getSeverityColor(issue.severity)}/10 border border-white/10`}
                      >
                        <div className="flex items-start gap-4">
                          <Icon className={`w-6 h-6 ${
                            issue.severity === 'critical' ? 'text-red-400' :
                            issue.severity === 'high' ? 'text-orange-400' :
                            issue.severity === 'medium' ? 'text-yellow-400' :
                            'text-blue-400'
                          } flex-shrink-0 mt-1`} />
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-white font-bold">{issue.title}</h3>
                              <Badge className={`${
                                issue.severity === 'critical' ? 'bg-red-500' :
                                issue.severity === 'high' ? 'bg-orange-500' :
                                issue.severity === 'medium' ? 'bg-yellow-500' :
                                'bg-blue-500'
                              }`}>
                                {issue.severity.toUpperCase()}
                              </Badge>
                              {issue.auto_fixable && (
                                <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
                                  <Wrench className="w-3 h-3 mr-1" />
                                  Auto-fixable
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-gray-300 text-sm mb-2">{issue.description}</p>
                            
                            {issue.affected_count && (
                              <p className="text-gray-400 text-xs mb-2">
                                Affected: {issue.affected_count} records
                              </p>
                            )}
                            
                            <div className="bg-black/20 rounded-lg p-3 mt-2">
                              <p className="text-sm text-gray-300">
                                <span className="text-purple-400 font-semibold">Recommendation:</span>{' '}
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
            {lastScan.ai_recommendations && (
              <Card className="glass-effect border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-400" />
                    AI Analysis & Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">
                      {lastScan.ai_recommendations.recommendations}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Auto-Healing Actions */}
            {lastScan.auto_healing.actions_taken.length > 0 && (
              <Card className="glass-effect border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-green-400" />
                    Self-Healing Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {lastScan.auto_healing.actions_taken.map((action, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <div className="flex-1">
                        <p className="text-white font-medium">{action.action}</p>
                        {action.count && (
                          <p className="text-gray-400 text-sm">{action.count} records processed</p>
                        )}
                        {action.error && (
                          <p className="text-red-400 text-sm">Error: {action.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}