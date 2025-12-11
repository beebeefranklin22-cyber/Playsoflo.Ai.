import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Wrench, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

export default function MaintenanceAlert({ cars, rentals }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeMaintenance();
  }, [cars, rentals]);

  const analyzeMaintenance = async () => {
    setLoading(true);
    try {
      const carData = cars.map(car => {
        const carRentals = rentals.filter(r => r.car_model === car.title);
        const totalMiles = carRentals.reduce((sum, r) => sum + (r.actual_distance || 0), 0);
        const totalDays = carRentals.filter(r => r.status === 'completed').length;
        
        return {
          id: car.id,
          title: car.title,
          totalMiles,
          totalRentals: carRentals.length,
          lastRental: carRentals[0]?.end_time,
          totalDays
        };
      });

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a predictive maintenance AI for rental car fleet management.

Analyze these vehicles and predict maintenance needs:
${JSON.stringify(carData)}

For each vehicle that needs attention, provide:
1. Urgency level (critical/high/medium/low)
2. Maintenance type (oil change, tire rotation, inspection, brake check, etc.)
3. Estimated cost
4. Recommended timeline
5. Risk if delayed

Return JSON:
{
  "alerts": [
    {
      "carId": "id",
      "carTitle": "title",
      "urgency": "critical|high|medium|low",
      "maintenanceType": "Oil change",
      "estimatedCost": 75,
      "timeline": "Within 500 miles or 2 weeks",
      "risk": "Engine damage if delayed",
      "reason": "Based on 3000 miles driven"
    }
  ],
  "summary": "Overall fleet health status"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  carId: { type: "string" },
                  carTitle: { type: "string" },
                  urgency: { type: "string" },
                  maintenanceType: { type: "string" },
                  estimatedCost: { type: "number" },
                  timeline: { type: "string" },
                  risk: { type: "string" },
                  reason: { type: "string" }
                }
              }
            },
            summary: { type: "string" }
          }
        }
      });

      setAlerts(analysis);
    } catch (error) {
      console.error("Maintenance analysis error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-orange-900/40 to-red-900/40 border-orange-500/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Wrench className="w-6 h-6 text-orange-400" />
          Predictive Maintenance AI
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Analyzing fleet health...</p>
          </div>
        ) : alerts.alerts?.length > 0 ? (
          <div className="space-y-3">
            {alerts.alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${
                  alert.urgency === 'critical' ? 'bg-red-500/20 border-red-500/50' :
                  alert.urgency === 'high' ? 'bg-orange-500/20 border-orange-500/50' :
                  'bg-yellow-500/10 border-yellow-500/30'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-white font-bold">{alert.carTitle}</h4>
                    <p className="text-gray-400 text-sm">{alert.maintenanceType}</p>
                  </div>
                  <Badge className={
                    alert.urgency === 'critical' ? 'bg-red-500 text-white animate-pulse' :
                    alert.urgency === 'high' ? 'bg-orange-500 text-white' :
                    'bg-yellow-500/30 text-yellow-300'
                  }>
                    {alert.urgency}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300">⏰ {alert.timeline}</p>
                  <p className="text-gray-300">💰 Est. cost: ${alert.estimatedCost}</p>
                  <p className="text-gray-400 text-xs">⚠️ {alert.risk}</p>
                  <p className="text-gray-500 text-xs italic">{alert.reason}</p>
                </div>
              </div>
            ))}
            <div className="bg-white/5 rounded-lg p-3 text-sm text-gray-300">
              <AlertTriangle className="w-4 h-4 inline mr-2 text-orange-400" />
              {alerts.summary}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">All vehicles in good condition!</p>
            <p className="text-gray-400 text-sm">No immediate maintenance needed</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}