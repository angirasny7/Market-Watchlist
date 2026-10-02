import { apiClient } from './apiClient';

export type AlertType = 'PRICE_ABOVE' | 'PRICE_BELOW' | 'DAY_CHANGE_PCT' | 'ATTENTION_LEVEL';

export interface AlertItem {
  id: string;
  stockSymbol: string;
  alertType: AlertType;
  targetValue: number;
  isActive: boolean;
  triggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
  stock?: {
    symbol: string;
    companyName: string;
    currentPrice: number;
    changePercent: number;
    currency: string;
  } | null;
}

export interface CreateAlertPayload {
  stockSymbol: string;
  alertType: AlertType;
  targetValue: number;
}

export interface UpdateAlertPayload {
  isActive?: boolean;
  targetValue?: number;
}

export const alertService = {
  async getAlerts(): Promise<AlertItem[]> {
    const res = await apiClient.get<AlertItem[]>('/alerts');
    return res.data || [];
  },

  async createAlert(payload: CreateAlertPayload): Promise<AlertItem | null> {
    const res = await apiClient.post<AlertItem>('/alerts', payload);
    return res.data || null;
  },

  async updateAlert(id: string, payload: UpdateAlertPayload): Promise<AlertItem | null> {
    const res = await apiClient.patch<AlertItem>(`/alerts/${id}`, payload);
    return res.data || null;
  },

  async deleteAlert(id: string): Promise<boolean> {
    const res = await apiClient.delete<{ success: boolean }>(`/alerts/${id}`);
    return Boolean(res.data?.success);
  },
};
