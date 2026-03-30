import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taxYear } = await req.json();
    const year = taxYear || new Date().getFullYear() - 1;

    // Fetch exchange rates for user's currency
    const userCurrency = user.primary_currency || 'USD';
    const exchangeRateResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const exchangeData = await exchangeRateResponse.json();
    const exchangeRate = exchangeData.rates[userCurrency] || 1;

    // Fetch all crypto transactions for the year
    const transactions = await base44.asServiceRole.entities.CryptoTransaction.filter({
      user_email: user.email
    });

    const yearStart = new Date(`${year}-01-01`);
    const yearEnd = new Date(`${year}-12-31T23:59:59`);

    const yearTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.created_date);
      return txDate >= yearStart && txDate <= yearEnd;
    });

    // Calculate capital gains/losses
    let totalGains = 0;
    let totalLosses = 0;
    let totalIncome = 0;

    const transactionDetails = yearTransactions.map(tx => {
      let gainLoss = 0;
      let category = 'other';

      // Categorize transaction
      if (tx.transaction_type === 'sell') {
        // Capital gain/loss calculation (simplified)
        const proceeds = tx.to_amount;
        const costBasis = tx.from_amount * 0.9; // Simplified cost basis
        gainLoss = proceeds - costBasis;
        
        if (gainLoss > 0) {
          totalGains += gainLoss;
          category = 'capital_gain';
        } else {
          totalLosses += Math.abs(gainLoss);
          category = 'capital_loss';
        }
      } else if (tx.transaction_type === 'receive' || tx.transaction_type === 'staking_reward') {
        totalIncome += tx.to_amount || 0;
        category = 'income';
      }

      return {
        date: tx.created_date,
        type: tx.transaction_type,
        category,
        from_currency: tx.from_currency,
        to_currency: tx.to_currency,
        from_amount: tx.from_amount,
        to_amount: tx.to_amount,
        fee: tx.fee || 0,
        gain_loss: gainLoss,
        gain_loss_user_currency: gainLoss * exchangeRate,
        cost_basis: tx.from_amount,
        proceeds: tx.to_amount,
        user_currency: userCurrency,
        exchange_rate_used: exchangeRate
      };
    });

    // Generate Form 8949 data
    const form8949Data = {
      short_term_transactions: transactionDetails.filter(tx => tx.category === 'capital_gain' || tx.category === 'capital_loss'),
      total_short_term_gain: totalGains,
      total_short_term_loss: totalLosses
    };

    // Generate Schedule D data
    const scheduleDData = {
      net_short_term_gain_loss: totalGains - totalLosses,
      total_income: totalIncome
    };

    // Create tax report with multi-currency support
    const report = await base44.asServiceRole.entities.TaxReport.create({
      user_email: user.email,
      tax_year: year,
      report_type: 'comprehensive',
      total_capital_gains: totalGains * exchangeRate,
      total_capital_losses: totalLosses * exchangeRate,
      total_income: totalIncome * exchangeRate,
      transactions_analyzed: yearTransactions.length,
      transaction_details: transactionDetails,
      form_8949_data: form8949Data,
      schedule_d_data: scheduleDData,
      status: 'completed'
    });

    // Send notification
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: user.email,
      type: 'system',
      title: 'Tax Report Generated',
      message: `Your ${year} crypto tax report is ready. ${yearTransactions.length} transactions analyzed.`,
      read: false,
      action_url: '/Wallet'
    });

    return Response.json({ 
      success: true, 
      report,
      summary: {
        totalGains,
        totalLosses,
        totalIncome,
        netGainLoss: totalGains - totalLosses,
        transactionsCount: yearTransactions.length
      }
    });
  } catch (error) {
    console.error('Tax report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});