import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function EarningsChart({ data }) {
  // Mock data if none provided
  const chartData = data || [
    { day: "Mon", earnings: 145 },
    { day: "Tue", earnings: 180 },
    { day: "Wed", earnings: 95 },
    { day: "Thu", earnings: 210 },
    { day: "Fri", earnings: 285 },
    { day: "Sat", earnings: 340 },
    { day: "Sun", earnings: 220 }
  ];

  const total = chartData.reduce((sum, d) => sum + d.earnings, 0);
  const avg = (total / chartData.length).toFixed(2);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Weekly Earnings Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-gray-400 text-sm">Total This Week</div>
            <div className="text-white text-2xl font-bold">${total.toFixed(2)}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-gray-400 text-sm">Daily Average</div>
            <div className="text-white text-2xl font-bold">${avg}</div>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
            <XAxis dataKey="day" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#fff"
              }}
              formatter={(value) => [`$${value}`, "Earnings"]}
            />
            <Bar dataKey="earnings" fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}