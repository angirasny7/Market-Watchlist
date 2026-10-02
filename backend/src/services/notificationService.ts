import { prisma } from '../config/prisma.js';

export class NotificationService {
  async listNotifications(userId: string, limit = 20) {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      include: {
        alert: {
          select: {
            stockSymbol: true,
            alertType: true,
            targetValue: true,
          },
        },
      },
      orderBy: [
        { isRead: 'asc' },
        { createdAt: 'desc' },
      ],
      take: Math.min(Math.max(1, limit), 50),
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        alertId: n.alertId,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
        stockSymbol: n.alert?.stockSymbol || null,
      })),
      unreadCount,
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) {
      const error: any = new Error('Notification not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return {
      id: updated.id,
      isRead: updated.isRead,
    };
  }

  async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { success: true, count: result.count };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
}

export const notificationService = new NotificationService();
