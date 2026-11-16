/**
 * Cross Passion International (CPI) — Render Backend API Client
 * Connects the frontend to the live Express ministerial backend on Render
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://cpi-backend-api-70zt.onrender.com';

export const apiClient = {
  /**
   * Check backend server health
   */
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return await res.json();
    } catch (err) {
      console.warn('[CPI Backend API] Health check failed:', err);
      return { status: 'offline', error: (err as Error).message };
    }
  },

  /**
   * Fetch executive church statistics from Render backend
   */
  async getStats() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/stats`);
      return await res.json();
    } catch (err) {
      console.warn('[CPI Backend API] Failed to fetch stats:', err);
      return null;
    }
  },

  /**
   * Send Ministerial SMS Broadcast
   */
  async sendBroadcastSms(payload: {
    message: string;
    targetGroup?: string;
    recipientPhoneNumbers?: string[];
  }) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ministerial/broadcast-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      console.error('[CPI Backend API] Failed to send broadcast SMS:', err);
      throw err;
    }
  },

  /**
   * Fetch financial summary
   */
  async getFinanceSummary() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/finance/summary`);
      return await res.json();
    } catch (err) {
      console.warn('[CPI Backend API] Failed to fetch finance summary:', err);
      return null;
    }
  }
};

export default apiClient;
