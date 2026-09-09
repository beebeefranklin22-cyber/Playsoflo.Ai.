import { callSecureApi } from '@/lib/apiClient';

export async function analyzeFinancials({ analysis_type, time_period } = {}) {
  try {
    const data = await callSecureApi('/api/ai-assist', { action: 'financial_analysis', analysis_type, time_period });
    return { data };
  } catch (error) {
    return { data: { error: error.message } };
  }
}
