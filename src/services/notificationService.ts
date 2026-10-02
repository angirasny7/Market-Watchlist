import { apiClient } from './apiClient';

export type NotificationType = 'ALERT_TRIGGERED' | 'MARKET_SUMMARY' | 'CORPORATE_ACTION';

export interface NotificationItem {
  id: string;
  userId: string;
  alertId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  stockSymbol: string | null;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

export const notificationService = {
  async getNotifications(limit = 20): Promise<NotificationListResponse> {
    const res = await apiClient.get<NotificationListResponse>(`/notifications?limit=${limit}`);
    return res.data || { notifications: [], unreadCount: 0 };
  },

  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get<{ unreadCount: number }>('/notifications/unread-count');
    return res.data?.unreadCount || 0;
  },

  async markAsRead(id: string): Promise<boolean> {
    const res = await apiClient.patch<{ id: string; isRead: boolean }>(`/notifications/${id}/read`);
    return Boolean(res.data?.isRead);
  },

  async markAllAsRead(): Promise<boolean> {
    const res = await apiClient.patch<{ success: boolean; count: number }>('/notifications/read-all');
    return Boolean(res.data?.success);
  },
};
