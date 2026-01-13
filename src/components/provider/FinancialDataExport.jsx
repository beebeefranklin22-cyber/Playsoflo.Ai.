import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileDown, Download, Loader2, DollarSign, Calendar, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export default function FinancialDataExport({ currentUser }) {
  const [exportFormat, setExportFormat] = useState("csv");
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [exporting, setExporting] = useState(false);

  const { data: payments = [] } = useQuery({
    queryKey: ['provider-all-payments', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.Payment.filter({
        recipient_email: currentUser.email
      });
    },
    enabled: !!currentUser
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ['provider-payouts', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.PayoutRequest.filter({
        provider_email: currentUser.email
      });
    },
    enabled: !!currentUser
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['provider-financial-bookings', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const serviceBookings = await base44.entities.ServiceBooking.filter({
        provider_email: currentUser.email
      });
      const carRentals = await base44.entities.CarRental.filter({
        provider_email: currentUser.email
      });
      const propertyBookings = await base44.entities.Booking.filter({
        host_email: currentUser.email
      });
      return [...serviceBookings, ...carRentals, ...propertyBookings];
    },
    enabled: !!currentUser
  });

  const exportToCSV = (data) => {
    const headers = [
      'Date', 'Transaction ID', 'Type', 'Description', 
      'Gross Amount', 'Platform Fee', 'Refunds', 'Net Amount', 
      'Status', 'Customer/Payer', 'Tax Category'
    ];

    const rows = data.map(item => [
      new Date(item.date).toLocaleDateString(),
      item.id,
      item.type,
      item.description,
      item.gross.toFixed(2),
      item.platformFee.toFixed(2),
      item.refund.toFixed(2),
      item.net.toFixed(2),
      item.status,
      item.customer,
      item.taxCategory
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-data-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const exportToTaxReport = (data, summary) => {
    const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #1f2937; border-bottom: 3px solid #8B5CF6; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; background: #f3f4f6; padding: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
    th { background-color: #8B5CF6; color: white; font-weight: bold; }
    tr:nth-child(even) { background-color: #f9fafb; }
    .summary { background-color: #ede9fe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8B5CF6; }
    .highlight { font-size: 20px; font-weight: bold; color: #8B5CF6; }
    .total-row { background-color: #ddd6fe !important; font-weight: bold; }
    .warning { background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #d1d5db; font-size: 12px; color: #6b7280; }
    .header-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
    .info-block { background: #f3f4f6; padding: 10px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Tax & Financial Report - ${new Date().getFullYear()}</h1>
  
  <div class="header-info">
    <div class="info-block">
      <strong>Provider:</strong> ${currentUser.full_name || currentUser.email}<br>
      <strong>Business:</strong> ${currentUser.provider_business_name || 'Individual Provider'}<br>
      <strong>Email:</strong> ${currentUser.email}
    </div>
    <div class="info-block">
      <strong>Report Period:</strong> ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}<br>
      <strong>Generated:</strong> ${new Date().toLocaleString()}<br>
      <strong>Tax Year:</strong> ${new Date(startDate).getFullYear()}
    </div>
  </div>

  <div class="summary">
    <h2 style="margin-top: 0; background: transparent; padding: 0;">Income Summary (Form 1099-K)</h2>
    <table style="background: white;">
      <tr>
        <td style="width: 70%;"><strong>Gross Income (Total Payments Received)</strong></td>
        <td style="text-align: right;"><span class="highlight">$${summary.grossIncome.toFixed(2)}</span></td>
      </tr>
      <tr>
        <td>Less: Refunds & Cancellations</td>
        <td style="text-align: right;">-$${summary.refunds.toFixed(2)}</td>
      </tr>
      <tr>
        <td>Less: Platform/Processing Fees (Business Expense)</td>
        <td style="text-align: right;">-$${summary.platformFees.toFixed(2)}</td>
      </tr>
      <tr class="total-row">
        <td><strong>Net Business Income (Taxable)</strong></td>
        <td style="text-align: right;"><strong>$${summary.netIncome.toFixed(2)}</strong></td>
      </tr>
    </table>
  </div>

  <h2>Detailed Transaction History</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Transaction ID</th>
        <th>Type</th>
        <th>Description</th>
        <th>Gross</th>
        <th>Fees</th>
        <th>Net</th>
        <th>Tax Category</th>
      </tr>
    </thead>
    <tbody>
      ${data.map(item => `
        <tr>
          <td>${new Date(item.date).toLocaleDateString()}</td>
          <td style="font-size: 11px;">${item.id}</td>
          <td>${item.type}</td>
          <td>${item.description}</td>
          <td>$${item.gross.toFixed(2)}</td>
          <td style="color: #dc2626;">-$${item.platformFee.toFixed(2)}</td>
          <td><strong>$${item.net.toFixed(2)}</strong></td>
          <td>${item.taxCategory}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>Tax Deductions & Business Expenses</h2>
  <table>
    <tr>
      <th>Expense Category</th>
      <th>Amount</th>
      <th>Description</th>
    </tr>
    <tr>
      <td>Platform Service Fees</td>
      <td>$${summary.platformFees.toFixed(2)}</td>
      <td>Payment processing and platform usage fees</td>
    </tr>
    <tr>
      <td>Refunds Issued</td>
      <td>$${summary.refunds.toFixed(2)}</td>
      <td>Customer refunds and cancellations</td>
    </tr>
    <tr class="total-row">
      <td><strong>Total Deductible Expenses</strong></td>
      <td><strong>$${(summary.platformFees + summary.refunds).toFixed(2)}</strong></td>
      <td></td>
    </tr>
  </table>

  <h2>Payout History</h2>
  <table>
    <tr>
      <th>Date</th>
      <th>Payout ID</th>
      <th>Amount</th>
      <th>Method</th>
      <th>Status</th>
    </tr>
    ${summary.payouts.map(p => `
      <tr>
        <td>${new Date(p.created_date).toLocaleDateString()}</td>
        <td style="font-size: 11px;">${p.id}</td>
        <td>$${p.amount_usd.toFixed(2)}</td>
        <td>${p.payout_method || 'Stripe'}</td>
        <td>${p.status}</td>
      </tr>
    `).join('')}
    <tr class="total-row">
      <td colspan="2"><strong>Total Payouts</strong></td>
      <td><strong>$${summary.totalPayouts.toFixed(2)}</strong></td>
      <td colspan="2"></td>
    </tr>
  </table>

  <div class="warning">
    <strong>⚠️ Important Tax Information:</strong><br>
    • This report is for informational purposes only and should not be considered tax advice<br>
    • Consult with a qualified tax professional or CPA for accurate tax filing<br>
    • Keep all supporting documentation (receipts, invoices) for at least 7 years<br>
    • Report all income to the IRS, even if you don't receive a 1099 form<br>
    • Platform fees are generally deductible as business expenses (consult your tax advisor)<br>
    • You may be required to pay quarterly estimated taxes if you earn over $1,000 annually
  </div>

  <div class="summary">
    <h3>Quick Reference for Tax Filing</h3>
    <p><strong>Form 1099-NEC/1099-K Reporting:</strong></p>
    <ul>
      <li>Gross Income to Report: <strong>$${summary.grossIncome.toFixed(2)}</strong></li>
      <li>Business Expenses (Deductions): <strong>$${(summary.platformFees + summary.refunds).toFixed(2)}</strong></li>
      <li>Net Self-Employment Income: <strong>$${summary.netIncome.toFixed(2)}</strong></li>
    </ul>
    <p style="margin-top: 15px;"><strong>Schedule C (Form 1040):</strong> Report as self-employment income</p>
  </div>

  <div class="footer">
    <p><strong>Report Details:</strong></p>
    <p>Provider: ${currentUser.email} | Business: ${currentUser.provider_business_name || 'Individual'}</p>
    <p>Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</p>
    <p>Total Transactions: ${data.length} | Generated: ${new Date().toLocaleString()}</p>
    <p style="margin-top: 10px;">For support or questions, please contact: support@sofloplatform.com</p>
  </div>
</body>
</html>
    `;

    const blob = new Blob([reportHTML], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-report-${startDate}-to-${endDate}.html`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Filter data by date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const filteredPayments = payments.filter(p => {
        const date = new Date(p.created_date);
        return date >= start && date <= end;
      });

      const filteredPayouts = payouts.filter(p => {
        const date = new Date(p.created_date);
        return date >= start && date <= end;
      });

      const filteredBookings = bookings.filter(b => {
        const date = new Date(b.booking_date || b.start_date || b.created_date);
        return date >= start && date <= end;
      });

      // Prepare transaction data
      const transactions = filteredPayments.map(payment => {
        const isRefund = payment.memo?.toLowerCase().includes('refund') || payment.status === 'refunded';
        const gross = payment.amount_usd || 0;
        const platformFee = payment.platform_fee || (gross * 0.05); // Assume 5% if not set
        const refund = isRefund ? gross : 0;
        const net = isRefund ? 0 : (gross - platformFee);

        // Tax categorization
        let taxCategory = 'Service Income';
        if (payment.payment_type?.includes('rental') || payment.reference_type?.includes('rental')) {
          taxCategory = 'Rental Income';
        } else if (payment.payment_type === 'tip') {
          taxCategory = 'Tips/Gratuities';
        } else if (isRefund) {
          taxCategory = 'Refund/Adjustment';
        }

        return {
          id: payment.id,
          date: payment.created_date,
          type: isRefund ? 'Refund' : 'Payment Received',
          description: payment.memo || payment.reference_type || 'Service payment',
          gross: gross,
          platformFee: platformFee,
          refund: refund,
          net: net,
          status: payment.status,
          customer: payment.sender_email || payment.payer_email || 'N/A',
          taxCategory: taxCategory
        };
      });

      // Calculate summary
      const summary = {
        grossIncome: transactions.filter(t => !t.type.includes('Refund')).reduce((sum, t) => sum + t.gross, 0),
        platformFees: transactions.reduce((sum, t) => sum + t.platformFee, 0),
        refunds: transactions.filter(t => t.type.includes('Refund')).reduce((sum, t) => sum + t.refund, 0),
        netIncome: transactions.reduce((sum, t) => sum + t.net, 0),
        totalPayouts: filteredPayouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount_usd || 0), 0),
        payouts: filteredPayouts
      };

      if (exportFormat === "csv") {
        exportToCSV(transactions);
      } else {
        exportToTaxReport(transactions, summary);
      }

      toast.success(`Financial data exported successfully!`);
    } catch (error) {
      toast.error('Export failed: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-blue-500/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <FileDown className="w-5 h-5" />
          Export Financial Data for Tax Filing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-blue-300 text-sm">
          Export comprehensive financial records including all earnings, fees, refunds, and payouts for accurate tax reporting (1099-K, Schedule C).
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-2 block">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Format</label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Excel/Spreadsheet)</SelectItem>
                <SelectItem value="tax_report">Tax Report (HTML)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-2">Export Includes:</h4>
          <div className="grid md:grid-cols-2 gap-2 text-indigo-300 text-sm">
            <div>✓ All payment transactions</div>
            <div>✓ Platform fees (deductible)</div>
            <div>✓ Refunds and adjustments</div>
            <div>✓ Payout history</div>
            <div>✓ Tax categorization</div>
            <div>✓ Net income calculations</div>
            <div>✓ 1099-K reference data</div>
            <div>✓ Schedule C information</div>
          </div>
        </div>

        <Button
          onClick={handleExport}
          disabled={exporting || !startDate || !endDate}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-6"
        >
          {exporting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating Export...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              Export {exportFormat === 'csv' ? 'CSV' : 'Tax Report'}
            </>
          )}
        </Button>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <p className="text-yellow-300 text-xs">
            <strong>Tax Compliance Note:</strong> This data export is designed to help you file taxes accurately. 
            Always consult with a qualified tax professional or CPA. Keep this report with your tax records for 7 years.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}