import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, FileText, Download, Calendar, TrendingUp, TrendingDown, DollarSign, Brain, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export default function TaxReportingModal({ currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [categorizingTx, setCategorizingTx] = useState(false);

  const { data: reports = [] } = useQuery({
    queryKey: ['tax-reports', currentUser.email],
    queryFn: async () => {
      return await base44.entities.TaxReport.filter({
        user_email: currentUser.email
      });
    }
  });

  const generateReportMutation = useMutation({
    mutationFn: async (year) => {
      const { data } = await base44.functions.invoke('generateTaxReport', { taxYear: year });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tax-reports']);
      toast.success('✅ Tax report generated successfully!');
      setGeneratingReport(false);
    },
    onError: (err) => {
      toast.error('Failed to generate report: ' + err.message);
      setGeneratingReport(false);
    }
  });

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    generateReportMutation.mutate(selectedYear);
  };

  const handleCategorizeTx = async (reportId) => {
    setCategorizingTx(true);
    try {
      const report = reports.find(r => r.id === reportId);
      const { data } = await base44.functions.invoke('categorizeCryptoTransactions', {
        transactions: report.transaction_details
      });
      
      toast.success(`✓ ${data.categorized_transactions.length} transactions categorized by AI`);
      
      // Update report with categorized transactions
      await base44.entities.TaxReport.update(reportId, {
        transaction_details: data.categorized_transactions
      });
      
      queryClient.invalidateQueries(['tax-reports']);
    } catch (err) {
      toast.error('AI categorization failed');
    } finally {
      setCategorizingTx(false);
    }
  };

  const exportCSV = (report) => {
    const headers = ['Date', 'Type', 'Category', 'From Currency', 'To Currency', 'Amount', 'Gain/Loss'];
    const rows = report.transaction_details.map(tx => [
      new Date(tx.date).toLocaleDateString(),
      tx.type,
      tx.category,
      tx.from_currency,
      tx.to_currency,
      tx.to_amount,
      tx.gain_loss?.toFixed(2) || '0'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-report-${report.tax_year}.csv`;
    a.click();
    toast.success('CSV exported successfully');
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-6xl bg-gray-900 rounded-3xl overflow-hidden my-8"
        >
          <div className="bg-gradient-to-r from-green-600 to-blue-600 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                  <FileText className="w-8 h-8" />
                  Crypto Tax Reports
                </h2>
                <p className="text-green-100 text-sm mt-1">
                  Automated tax reporting with AI-powered categorization
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Generate New Report */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">Generate Tax Report</h3>
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="text-white text-sm font-medium mb-2 block">Tax Year</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                    >
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    onClick={handleGenerateReport}
                    disabled={generatingReport}
                    className="bg-green-600 hover:bg-green-700 h-12"
                  >
                    {generatingReport ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Existing Reports */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Your Tax Reports</h3>
              {reports.length === 0 ? (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-12 text-center">
                    <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No tax reports generated yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {reports.sort((a, b) => b.tax_year - a.tax_year).map((report) => (
                    <Card key={report.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-white font-bold text-2xl">{report.tax_year}</h4>
                              <Badge className={
                                report.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                report.status === 'generating' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-red-500/20 text-red-400'
                              }>
                                {report.status}
                              </Badge>
                            </div>
                            <p className="text-gray-400 text-sm">
                              {report.transactions_analyzed} transactions analyzed
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="bg-white/5 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="w-4 h-4 text-green-400" />
                              <p className="text-gray-400 text-xs">Capital Gains</p>
                            </div>
                            <p className="text-green-400 font-bold text-xl">
                              ${report.total_capital_gains?.toFixed(2) || '0.00'}
                            </p>
                          </div>

                          <div className="bg-white/5 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingDown className="w-4 h-4 text-red-400" />
                              <p className="text-gray-400 text-xs">Capital Losses</p>
                            </div>
                            <p className="text-red-400 font-bold text-xl">
                              ${report.total_capital_losses?.toFixed(2) || '0.00'}
                            </p>
                          </div>

                          <div className="bg-white/5 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <DollarSign className="w-4 h-4 text-blue-400" />
                              <p className="text-gray-400 text-xs">Crypto Income</p>
                            </div>
                            <p className="text-blue-400 font-bold text-xl">
                              ${report.total_income?.toFixed(2) || '0.00'}
                            </p>
                          </div>

                          <div className="bg-white/5 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-purple-400" />
                              <p className="text-gray-400 text-xs">Net Gain/Loss</p>
                            </div>
                            <p className={`font-bold text-xl ${
                              (report.total_capital_gains - report.total_capital_losses) >= 0 
                                ? 'text-green-400' 
                                : 'text-red-400'
                            }`}>
                              ${((report.total_capital_gains || 0) - (report.total_capital_losses || 0)).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <Button
                            onClick={() => exportCSV(report)}
                            variant="outline"
                            className="border-white/20"
                            size="sm"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export CSV
                          </Button>
                          <Button
                            onClick={() => handleCategorizeTx(report.id)}
                            disabled={categorizingTx}
                            variant="outline"
                            className="border-purple-500/30 text-purple-400"
                            size="sm"
                          >
                            {categorizingTx ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Brain className="w-4 h-4 mr-2" />
                            )}
                            AI Categorize
                          </Button>
                          <Badge className="bg-blue-500/10 text-blue-400 px-3 py-1">
                            Form 8949 Ready
                          </Badge>
                          <Badge className="bg-green-500/10 text-green-400 px-3 py-1">
                            Schedule D Ready
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Tax Info */}
            <Card className="bg-blue-500/10 border border-blue-500/30">
              <CardContent className="p-4">
                <p className="text-blue-300 text-sm">
                  <strong>💡 Tax Tip:</strong> Reports are automatically formatted for IRS Form 8949 and Schedule D. 
                  Consult a tax professional for specific advice.
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}