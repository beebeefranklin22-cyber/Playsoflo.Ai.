import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Wrench, TrendingUp, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function MaintenanceAlert({ predictions, onScheduleMaintenance }) {
  const [expanded, setExpanded] = useState(false);

  if (!predictions || !predictions.immediate_needs || predictions.immediate_needs.length === 0) {
    return null;
  }

  const highPriority = predictions.immediate_needs.filter(n => n.priority === 'high');
  const totalCost = predictions.total_estimated_cost || 0;

  return (
    <Card className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-orange-400" />
          AI Maintenance Alert
          {highPriority.length > 0 && (
            <Badge className="bg-red-500 text-white ml-2">
              {highPriority.length} Urgent
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-gray-400 text-sm">Vehicle Health Score</p>
              <p className="text-white text-2xl font-bold">{predictions.overall_vehicle_health || 'Good'}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Est. Total Cost</p>
              <p className="text-orange-400 text-2xl font-bold">${totalCost.toFixed(0)}</p>
            </div>
          </div>
        </div>

        {/* Immediate Needs */}
        <div>
          <h4 className="text-white font-semibold mb-3">Immediate Needs</h4>
          <div className="space-y-2">
            {predictions.immediate_needs.slice(0, expanded ? undefined : 3).map((need, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`p-3 rounded-lg border ${
                  need.priority === 'high' 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Wrench className="w-4 h-4 text-orange-400" />
                      <span className="text-white font-medium">{need.item}</span>
                      <Badge className={
                        need.priority === 'high' ? 'bg-red-500/30 text-red-300' :
                        need.priority === 'medium' ? 'bg-yellow-500/30 text-yellow-300' :
                        'bg-blue-500/30 text-blue-300'
                      }>
                        {need.priority}
                      </Badge>
                    </div>
                    <p className="text-gray-400 text-xs">Due in {need.due_in_miles} miles</p>
                    {need.impact_if_deferred && (
                      <p className="text-orange-300 text-xs mt-1">⚠️ {need.impact_if_deferred}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">${need.estimated_cost}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {predictions.immediate_needs.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="w-full mt-2 text-gray-400 hover:text-white"
            >
              {expanded ? 'Show Less' : `Show ${predictions.immediate_needs.length - 3} More`}
            </Button>
          )}
        </div>

        {/* Recommendations */}
        {predictions.recommendations && predictions.recommendations.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              AI Recommendations
            </h4>
            <ul className="space-y-1">
              {predictions.recommendations.map((rec, idx) => (
                <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {onScheduleMaintenance && (
          <Button
            onClick={onScheduleMaintenance}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            Schedule Maintenance
          </Button>
        )}
      </CardContent>
    </Card>
  );
}