import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Download, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function BusinessReportGenerator({ currentUser }) {
  const [reportPeriod, setReportPeriod] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);

  const { data: allBookings = [] } = useQuery({
    queryKey: ['provider-report-bookings', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const bookings = await base44.entities.ServiceBooking.filter({
        provider_email: currentUser.email
      });
      const carRentals = await base44.entities.CarRental.filter({
        provider_email: currentUser.email
      });
      const propertyBookings = await base44.entities.Booking.filter({
        host_email: currentUser.email
      });
      return [...bookings, ...carRentals, ...propertyBookings];
    },
    enabled: !!currentUser
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['provider-payments', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.Payment.filter({
        recipient_email: currentUser.email
      });
    },
    enabled: !!currentUser
  });

  const generateReport = async () => {
    setGenerating(true);
    try {
      // Filter data based on selected period
      const startDate = reportPeriod === "month"
        ? new Date(selectedYear, selectedMonth, 1)
        : new Date(selectedYear, 0, 1);
      
      const endDate = reportPeriod === "month"
        ? new Date(selectedYear, selectedMonth + 1, 0)
        : new Date(selectedYear, 11, 31);

      const periodBookings = allBookings.filter(b => {
        const bookingDate = new Date(b.booking_date || b.start_date || b.created_date);
        return bookingDate >= startDate && bookingDate <= endDate;
      });

      const periodPayments = payments.filter(p => {
        const paymentDate = new Date(p.created_date);
        return paymentDate >= startDate && paymentDate <= endDate;
      });

      // Calculate metrics
      const totalRevenue = periodPayments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (p.amount_usd || 0), 0);

      const completedBookings = periodBookings.filter(b => b.status === 'completed');
      const cancelledBookings = periodBookings.filter(b => b.status === 'cancelled');
      const refunds = periodPayments.filter(p => p.memo?.includes('Refund')).reduce((sum, p) => sum + (p.amount_usd || 0), 0);

      const taxableIncome = totalRevenue - refunds;
      const platformFees = periodPayments.reduce((sum, p) => sum + (p.platform_fee || 0), 0);
      const netIncome = taxableIncome - platformFees;

      // Generate report HTML
      const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #8B5CF6; }
    h2 { color: #374151; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #8B5CF6; color: white; }
    .summary { background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .highlight { font-size: 24px; font-weight: bold; color: #8B5CF6; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>Business Performance Report</h1>
  <p><strong>Provider:</strong> ${currentUser.full_name || currentUser.email}</p>
  <p><strong>Period:</strong> ${reportPeriod === 'month' ? `${new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })} ${selectedYear}` : `Year ${selectedYear}`}</p>
  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>

  <div class="summary">
    <h2>Executive Summary</h2>
    <p>Total Bookings: <span class="highlight">${periodBookings.length}</span></p>
    <p>Completed Bookings: <span class="highlight">${completedBookings.length}</span></p>
    <p>Gross Revenue: <span class="highlight">$${totalRevenue.toFixed(2)}</span></p>
    <p>Net Income: <span class="highlight">$${netIncome.toFixed(2)}</span></p>
  </div>

  <h2>Revenue Breakdown</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Amount</th>
    </tr>
    <tr>
      <td>Gross Revenue</td>
      <td>$${totalRevenue.toFixed(2)}</td>
    </tr>
    <tr>
      <td>Refunds</td>
      <td>-$${refunds.toFixed(2)}</td>
    </tr>
    <tr>
      <td>Platform Fees</td>
      <td>-$${platformFees.toFixed(2)}</td>
    </tr>
    <tr style="background-color: #f3f4f6;">
      <td><strong>Net Income</strong></td>
      <td><strong>$${netIncome.toFixed(2)}</strong></td>
    </tr>
  </table>

  <h2>Booking Statistics</h2>
  <table>
    <tr>
      <th>Status</th>
      <th>Count</th>
      <th>Percentage</th>
    </tr>
    <tr>
      <td>Completed</td>
      <td>${completedBookings.length}</td>
      <td>${periodBookings.length > 0 ? ((completedBookings.length / periodBookings.length) * 100).toFixed(1) : 0}%</td>
    </tr>
    <tr>
      <td>Cancelled</td>
      <td>${cancelledBookings.length}</td>
      <td>${periodBookings.length > 0 ? ((cancelledBookings.length / periodBookings.length) * 100).toFixed(1) : 0}%</td>
    </tr>
    <tr>
      <td>Other</td>
      <td>${periodBookings.length - completedBookings.length - cancelledBookings.length}</td>
      <td>${periodBookings.length > 0 ? (((periodBookings.length - completedBookings.length - cancelledBookings.length) / periodBookings.length) * 100).toFixed(1) : 0}%</td>
    </tr>
  </table>

  <h2>Tax Information</h2>
  <div class="summary">
    <p><strong>Taxable Income:</strong> $${taxableIncome.toFixed(2)}</p>
    <p><strong>Business Expenses (Platform Fees):</strong> $${platformFees.toFixed(2)}</p>
    <p><strong>Net Taxable Income:</strong> $${netIncome.toFixed(2)}</p>
    <p style="font-size: 12px; color: #666; margin-top: 10px;">
      * This report is for informational purposes only. Please consult with a tax professional for accurate tax filing.
    </p>
  </div>

  <div class="footer">
    <p>Report generated by SoFlo Platform on ${new Date().toLocaleDateString()}</p>
    <p>This is an automated report. For questions, please contact support.</p>
  </div>
</body>
</html>
      `;

      // Create blob and download
      const blob = new Blob([reportHTML], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `business-report-${reportPeriod}-${selectedYear}-${reportPeriod === 'month' ? selectedMonth + 1 : ''}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success('Report generated successfully!');
    } catch (error) {
      toast.error('Failed to generate report: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Generate Business Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-400 text-sm">
          Generate detailed business performance reports for tax purposes, financial analysis, and business planning.
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Report Period</label>
            <Select value={reportPeriod} onValueChange={setReportPeriod}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Monthly Report</SelectItem>
                <SelectItem value="quarter">Quarterly Report</SelectItem>
                <SelectItem value="year">Annual Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reportPeriod === "month" && (
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Month</label>
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, idx) => (
                    <SelectItem key={idx} value={String(idx)}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Year</label>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-2">Report Includes:</h4>
          <ul className="text-blue-300 text-sm space-y-1">
            <li>✓ Revenue breakdown and net income</li>
            <li>✓ Booking statistics and completion rates</li>
            <li>✓ Tax information and deductible expenses</li>
            <li>✓ Platform fees and refunds tracking</li>
            <li>✓ Professional HTML format for records</li>
          </ul>
        </div>

        <Button
          onClick={generateReport}
          disabled={generating}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Generate & Download Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}