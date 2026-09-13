import { callSecureApi } from '@/lib/apiClient';

export async function deleteUserAccount({ confirm } = {}) {
  try {
    const data = await callSecureApi('/api/account', { confirm });
    return { data };
  } catch (error) {
    return { data: { success: false, error: error.message } };
  }
}
