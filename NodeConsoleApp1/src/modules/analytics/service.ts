import prisma from '@/database/client';
import { logger } from '@/config/logger';

export class AnalyticsService {
  /**
   * Get user engagement metrics
   */
  async getUserEngagement(startDate?: Date, endDate?: Date) {
    const queries = {
      totalUsers: prisma.user.count({ where: { status: 'active' } }),
      newUsersToday: prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      totalPosts: prisma.post.count({ where: { status: 'published' } }),
      totalComments: prisma.comment.count({ where: { status: 'published' } }),
      totalReactions: prisma.reaction.count(),
      totalCommunities: prisma.community.count(),
      avgPostsPerUser: prisma.post.groupBy({
        by: ['authorId'],
        _count: true,
      }),
    };

    const results = await Promise.all(Object.values(queries));

    return {
      totalUsers: results[0],
      newUsersToday: results[1],
      totalPosts: results[2],
      totalComments: results[3],
      totalReactions: results[4],
      totalCommunities: results[5],
      averagePostsPerUser: results[6].length > 0
        ? results[6].reduce((sum, item) => sum + item._count, 0) / results[6].length
        : 0,
    };
  }

  /**
   * Get content metrics
   */
  async getContentMetrics() {
    const [
      postsWithReactions,
      postsWithComments,
      averageReactionsPerPost,
      averageCommentsPerPost,
      mostPopularPosts,
    ] = await Promise.all([
      prisma.post.count({
        where: {
          reactions: { some: {} },
        },
      }),
      prisma.post.count({
        where: {
          comments: { some: {} },
        },
      }),
      prisma.post.findMany({
        select: { id: true, _count: { select: { reactions: true } } },
      }),
      prisma.post.findMany({
        select: { id: true, _count: { select: { comments: true } } },
      }),
      prisma.post.findMany({
        orderBy: { _count: { reactions: 'desc' } },
        take: 10,
        select: {
          id: true,
          content: true,
          _count: { select: { reactions: true, comments: true } },
        },
      }),
    ]);

    const avgReactions = averageReactionsPerPost.length > 0
      ? averageReactionsPerPost.reduce((sum, p) => sum + p._count.reactions, 0) /
        averageReactionsPerPost.length
      : 0;

    const avgComments = averageCommentsPerPost.length > 0
      ? averageCommentsPerPost.reduce((sum, p) => sum + p._count.comments, 0) /
        averageCommentsPerPost.length
      : 0;

    return {
      postsWithReactions,
      postsWithComments,
      averageReactionsPerPost: avgReactions,
      averageCommentsPerPost: avgComments,
      mostPopularPosts,
    };
  }

  /**
   * Get community metrics
   */
  async getCommunityMetrics() {
    const communities = await prisma.community.findMany({
      select: {
        id: true,
        name: true,
        visibility: true,
        _count: {
          select: {
            members: true,
            posts: true,
          },
        },
      },
      orderBy: { _count: { members: 'desc' } },
      take: 50,
    });

    return {
      totalCommunities: communities.length,
      topCommunities: communities,
      averageMembersPerCommunity: communities.length > 0
        ? communities.reduce((sum, c) => sum + c._count.members, 0) / communities.length
        : 0,
    };
  }

  /**
   * Get wellness metrics
   */
  async getWellnessMetrics() {
    const [
      totalJournalEntries,
      journalEntriesThisMonth,
      totalWorkshopsStarted,
      avgWorkshopCompletion,
    ] = await Promise.all([
      prisma.journalEntry.count(),
      prisma.journalEntry.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
          },
        },
      }),
      prisma.learningProgress.count({ where: { status: 'in_progress' } }),
      prisma.learningProgress.findMany({
        select: { progressPercent: true },
      }),
    ]);

    const avgCompletion = totalWorkshopsStarted > 0
      ? avgWorkshopCompletion.reduce((sum, p) => sum + p.progressPercent, 0) /
        avgWorkshopCompletion.length
      : 0;

    return {
      totalJournalEntries,
      journalEntriesThisMonth,
      totalWorkshopsStarted,
      averageWorkshopCompletion: avgCompletion,
    };
  }

  /**
   * Get safety metrics
   */
  async getSafetyMetrics() {
    const [
      totalReports,
      openReports,
      resolvedReports,
      reportsByReason,
    ] = await Promise.all([
      prisma.report.count(),
      prisma.report.count({ where: { status: 'open' } }),
      prisma.report.count({ where: { status: 'resolved' } }),
      prisma.report.groupBy({
        by: ['reason'],
        _count: true,
      }),
    ]);

    return {
      totalReports,
      openReports,
      resolvedReports,
      resolutionRate: totalReports > 0 ? (resolvedReports / totalReports) * 100 : 0,
      reportsByReason: reportsByReason,
    };
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      recentErrors,
      slowRequests,
      activeUsers,
    ] = await Promise.all([
      prisma.errorLog.count({ where: { timestamp: { gte: oneHourAgo } } }),
      prisma.auditLog.count({ where: { timestamp: { gte: oneHourAgo } } }),
      prisma.session.count({ where: { expiresAt: { gt: now } } }),
    ]);

    return {
      recentErrors,
      activeSessions: activeUsers,
      systemStatus: recentErrors < 100 ? 'healthy' : 'degraded',
      timestamp: now,
    };
  }

  /**
   * Get user retention metrics
   */
  async getRetentionMetrics(daysAgo: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    const usersInPeriod = await prisma.user.count({
      where: {
        createdAt: { gte: cutoffDate },
      },
    });

    const activeUsersInPeriod = await prisma.post.groupBy({
      by: ['authorId'],
      where: {
        createdAt: { gte: cutoffDate },
      },
    });

    return {
      newUsersInPeriod: usersInPeriod,
      activeNewUsers: activeUsersInPeriod.length,
      retentionRate: usersInPeriod > 0
        ? (activeUsersInPeriod.length / usersInPeriod) * 100
        : 0,
    };
  }

  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics() {
    const [
      engagement,
      content,
      communities,
      wellness,
      safety,
      health,
      retention,
    ] = await Promise.all([
      this.getUserEngagement(),
      this.getContentMetrics(),
      this.getCommunityMetrics(),
      this.getWellnessMetrics(),
      this.getSafetyMetrics(),
      this.getSystemHealth(),
      this.getRetentionMetrics(),
    ]);

    return {
      engagement,
      content,
      communities,
      wellness,
      safety,
      health,
      retention,
      generatedAt: new Date(),
    };
  }
}

export const analyticsService = new AnalyticsService();
