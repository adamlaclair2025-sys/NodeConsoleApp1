import prisma from '@/database/client';
import { logger } from '@/config/logger';
import { Notification } from '@prisma/client';

export type NotificationType =
  | 'comment_reply'
  | 'reaction'
  | 'mention'
  | 'message'
  | 'community_update'
  | 'resource_alert'
  | 'crisis_check_in'
  | 'friendship_request'
  | 'workshop_reminder';

export class NotificationService {
  /**
   * Create a notification
   */
  async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string;
  }): Promise<Notification> {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        isRead: false,
      },
    });

    logger.info(
      { notificationId: notification.id, userId: data.userId, type: data.type },
      'Notification created',
    );

    return notification;
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false,
  ): Promise<{ notifications: Notification[]; unreadCount: number }> {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { notifications, unreadCount };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new Error('Unauthorized');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    logger.info({ userId }, 'All notifications marked as read');
    return result.count;
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new Error('Unauthorized');
    }

    await prisma.notification.delete({ where: { id: notificationId } });
    logger.info({ notificationId }, 'Notification deleted');
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Create bulk notifications (for broadcasts)
   */
  async createBulkNotifications(data: {
    userIds: string[];
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string;
  }): Promise<number> {
    const notifications = data.userIds.map(userId => ({
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl,
      isRead: false,
      createdAt: new Date(),
    }));

    const result = await prisma.notification.createMany({
      data: notifications,
    });

    logger.info(
      { count: result.count, type: data.type },
      'Bulk notifications created',
    );

    return result.count;
  }

  /**
   * Notify on comment
   */
  async notifyOnComment(postAuthorId: string, commenterName: string, postId: string): Promise<void> {
    if (postAuthorId) {
      await this.createNotification({
        userId: postAuthorId,
        type: 'comment_reply',
        title: 'New comment on your post',
        message: `${commenterName} commented on your post`,
        actionUrl: `/posts/${postId}`,
      });
    }
  }

  /**
   * Notify on reaction
   */
  async notifyOnReaction(
    postAuthorId: string,
    reacterName: string,
    reactionType: string,
    postId: string,
  ): Promise<void> {
    if (postAuthorId) {
      await this.createNotification({
        userId: postAuthorId,
        type: 'reaction',
        title: 'New reaction to your post',
        message: `${reacterName} reacted with "${reactionType}" to your post`,
        actionUrl: `/posts/${postId}`,
      });
    }
  }

  /**
   * Notify crisis check-in
   */
  async notifyCrisisCheckIn(userId: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'crisis_check_in',
      title: 'We\'re thinking of you',
      message: 'Would you like to talk to someone or access resources?',
      actionUrl: '/crisis/resources',
    });
  }

  /**
   * Notify workshop reminder
   */
  async notifyWorkshopReminder(userId: string, workshopTitle: string, workshopId: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'workshop_reminder',
      title: 'Workshop reminder',
      message: `Don't forget: ${workshopTitle} is ready for you`,
      actionUrl: `/workshops/${workshopId}`,
    });
  }
}

export const notificationService = new NotificationService();
