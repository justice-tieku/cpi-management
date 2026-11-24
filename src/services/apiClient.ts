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
  },

  /**
   * Provision Initial Users (Senior Pastor & Default Shepherds)
   */
  async setupInitialUsers() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/setup-initial-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return await res.json();
    } catch (err) {
      console.error('[CPI Backend API] Failed to setup initial users:', err);
      throw err;
    }
  },

  /**
   * Apply missing database RLS policies (idempotent — safe to call multiple times)
   */
  async applyRlsMigrations() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/apply-rls-migrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return await res.json();
    } catch (err) {
      console.warn('[CPI Backend API] RLS migration call failed (non-critical):', err);
      return { success: false };
    }
  },

  /**
   * Pastor creates a new Cell Shepherd account with custom personal email & password
   */
  async createShepherd(payload: {
    name: string;
    email: string;
    phone?: string;
    cellName: string;
    password?: string;
    isPpitShepherd?: boolean;
  }) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/shepherds/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      console.error('[CPI Backend API] Failed to create shepherd:', err);
      throw err;
    }
  },

  /**
   * Fetch all registered shepherds from backend
   */
  async getShepherds() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/shepherds`);
      return await res.json();
    } catch (err) {
      console.warn('[CPI Backend API] Failed to fetch shepherds:', err);
      return { success: false, shepherds: [] };
    }
  }
};

export default apiClient;
