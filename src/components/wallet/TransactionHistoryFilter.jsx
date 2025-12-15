import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Download, Calendar, Filter, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function TransactionHistoryFilter({ transactions, onClose }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const transactionTypes = [
    "all", "deposit", "withdrawal", "transfer", "sent", "received", 
    "utility", "escrow", "order"
  ];

  const statusTypes = ["all", "pending", "completed", "failed", "refunded"];

  const filteredTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.created_date);
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;

    const dateMatch = (!fromDate || txDate >= fromDate) && (!toDate || txDate <= toDate);
    const typeMatch = typeFilter === 'all' || tx.reference_type === typeFilter;
    const statusMatch = statusFilter === 'all' || tx.status === statusFilter;

    return dateMatch && typeMatch && statusMatch;
  });

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    const headers = ['Date', 'Type', 'Amount (USD)', 'Amount (SFC)', 'Status', 'Memo'];
    const rows = filteredTransactions.map(tx => [
      new Date(tx.created_date).toLocaleString(),
      tx.reference_type,
      tx.amount_usd?.toFixed(2) || '0.00',
      tx.amount_rri || '0',
      tx.status,
      tx.memo || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('✅ Transaction history exported!');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-gray-900 rounded-3xl overflow-hidden my-8"
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Filter className="w-6 h-6" />
                Filter & Export Transactions
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {filteredTransactions.length} of {transactions.length} transactions
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Date Range */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-white font-semibold mb-2 block flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                From Date
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-white font-semibold mb-2 block flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                To Date
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          {/* Transaction Type Filter */}
          <div>
            <label className="text-white font-semibold mb-3 block">Transaction Type</label>
            <div className="flex flex-wrap gap-2">
              {transactionTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    typeFilter === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-white font-semibold mb-3 block">Status</label>
            <div className="flex flex-wrap gap-2">
              {statusTypes.map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    statusFilter === status
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Filtered Results */}
          <div className="bg-white/5 rounded-xl p-4 max-h-96 overflow-y-auto">
            <h3 className="text-white font-semibold mb-3">
              Filtered Results ({filteredTransactions.length})
            </h3>
            {filteredTransactions.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No transactions match your filters</p>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.slice(0, 20).map(tx => (
                  <div key={tx.id} className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium text-sm">{tx.memo || tx.reference_type}</p>
                        <p className="text-gray-400 text-xs">
                          {new Date(tx.created_date).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">${tx.amount_usd?.toFixed(2)}</p>
                        <p className={`text-xs ${
                          tx.status === 'completed' ? 'text-green-400' :
                          tx.status === 'pending' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {tx.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredTransactions.length > 20 && (
                  <p className="text-gray-400 text-xs text-center mt-2">
                    + {filteredTransactions.length - 20} more transactions
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setTypeFilter("all");
                setStatusFilter("all");
              }}
              variant="outline"
              className="flex-1 border-white/20"
            >
              Clear Filters
            </Button>
            <Button
              onClick={exportToCSV}
              disabled={filteredTransactions.length === 0}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Export to CSV
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}