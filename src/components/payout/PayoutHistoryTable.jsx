import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Clock, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PayoutHistoryTable({ payouts }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800"
  };

  const statusIcons = {
    pending: Clock,
    processing: TrendingUp,
    completed: CheckCircle,
    failed: XCircle,
    cancelled: XCircle
  };

  const filteredPayouts = payouts
    .filter(p => {
      const matchesSearch = !searchQuery || 
        p.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.method_type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "recent") return new Date(b.requested_date) - new Date(a.requested_date);
      if (sortBy === "amount") return (b.amount || 0) - (a.amount || 0);
      return 0;
    });

  const exportToCSV = () => {
    const headers = ['Date', 'Amount', 'Method', 'Status', 'Transaction ID'];
    const rows = filteredPayouts.map(p => [
      new Date(p.requested_date).toLocaleDateString(),
      `$${p.amount?.toFixed(2) || '0.00'}`,
      p.method_type,
      p.status,
      p.transaction_id || 'N/A'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payout-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Payout History</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={filteredPayouts.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by transaction ID or method..."
              className="pl-10 bg-white/10 border-white/20 text-white"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="amount">Highest Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {filteredPayouts.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No payouts found</h3>
            <p className="text-gray-400">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-gray-400 font-medium pb-3">Date</th>
                  <th className="text-left text-gray-400 font-medium pb-3">Amount</th>
                  <th className="text-left text-gray-400 font-medium pb-3">Method</th>
                  <th className="text-left text-gray-400 font-medium pb-3">Status</th>
                  <th className="text-left text-gray-400 font-medium pb-3">Breakdown</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayouts.map(payout => {
                  const StatusIcon = statusIcons[payout.status];
                  return (
                    <tr key={payout.id} className="border-b border-white/5">
                      <td className="py-4">
                        <div className="text-white text-sm">
                          {new Date(payout.requested_date).toLocaleDateString()}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {new Date(payout.requested_date).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="text-white font-semibold">
                          ${payout.amount?.toFixed(2) || '0.00'}
                        </div>
                        {payout.net_amount && (
                          <div className="text-gray-400 text-xs">
                            Net: ${payout.net_amount.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="text-white text-sm capitalize">
                          {payout.method_type.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="py-4">
                        <Badge className={statusColors[payout.status]}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {payout.status}
                        </Badge>
                      </td>
                      <td className="py-4">
                        {payout.revenue_breakdown && (
                          <div className="text-xs text-gray-400 space-y-1">
                            {payout.revenue_breakdown.tips > 0 && (
                              <div>Tips: ${payout.revenue_breakdown.tips.toFixed(2)}</div>
                            )}
                            {payout.revenue_breakdown.subscriptions > 0 && (
                              <div>Subs: ${payout.revenue_breakdown.subscriptions.toFixed(2)}</div>
                            )}
                            {payout.revenue_breakdown.ppv > 0 && (
                              <div>PPV: ${payout.revenue_breakdown.ppv.toFixed(2)}</div>
                            )}
                            {payout.revenue_breakdown.products > 0 && (
                              <div>Products: ${payout.revenue_breakdown.products.toFixed(2)}</div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}