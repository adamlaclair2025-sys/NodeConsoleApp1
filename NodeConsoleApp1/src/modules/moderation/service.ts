import prisma from '@/database/client';
import { logger } from '@/config/logger';
import { Report } from '@prisma/client';
import { NotFoundError } from '@/middleware/errors';

interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
}

export class ModerationService {
  /**
   * Create a report
   */
  async createReport(data: {
    reporterId: string;
    reason: string;
    description?: string;
    postId?: string;
    commentId?: string;
    communityId?: string;
    userId?: string;
    reviewState?: string;
    evidence?: string[];
  }): Promise<Report> {
    // Validate that at least one resource is being reported
    if (!data.postId && !data.commentId && !data.communityId && !data.userId) {
      throw new Error('Must report at least one resource');
    }

    const report = await prisma.report.create({
      data: {
        reporterId: data.reporterId,
        reason: data.reason,
        description: data.description,
        postId: data.postId,
        commentId: data.commentId,
        communityId: data.communityId,
        userId: data.userId,
        status: data.reviewState || 'open',
        priority: this.calculatePriority(data.reason),
        resolution: data.evidence?.join('\n'),
      },
    });

    logger.info(
      {
        reportId: report.id,
        reporterId: data.reporterId,
        reason: data.reason,
      },
      'Report created',
    );

    return report;
  }

  /**
   * Get report by ID
   */
  async getReport(id: string): Promise<Report | null> {
    return prisma.report.findUnique({
      where: { id },
    });
  }

  /**
   * Get open reports for moderation queue
   */
  async getOpenReports(
    limit: number = 20,
    offset: number = 0,
  ): Promise<Report[]> {
    return prisma.report.findMany({
      where: { OR: [{ status: 'open' }, { status: 'acknowledged' }] },
      take: limit,
      skip: offset,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Resolve a report
   */
  async resolveReport(
    id: string,
    resolvedBy: string,
    resolution: string,
    action: string = 'no_action',
    context?: AuditContext,
  ): Promise<Report> {
    const report = await this.getReport(id);

    if (!report) {
      throw new NotFoundError('Report');
    }

    const updated = await prisma.report.update({
      where: { id },
      data: {
        status: 'resolved',
        resolvedBy,
        resolution,
        resolvedAt: new Date(),
      },
    });

    await this.createAuditLog({
      userId: resolvedBy,
      action: 'moderation_report_resolved',
      resource: 'Report',
      resourceId: id,
      changes: { action, resolution },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    logger.info(
      {
        reportId: id,
        resolvedBy,
        action,
      },
      'Report resolved',
    );

    return updated;
  }

  async submitAppeal(reportId: string, userId: string, reason: string, context?: AuditContext): Promise<any> {
    const report = await this.getReport(reportId);
    if (!report) {
      throw new NotFoundError('Report');
    }

    const existingAppeal = await prisma.moderationAppeal.findFirst({
      where: { reportId, userId, status: { in: ['submitted', 'under_review'] } },
    });

    if (existingAppeal) {
      throw new Error('Appeal already exists for this report');
    }

    const appeal = await prisma.moderationAppeal.create({
      data: {
        reportId,
        userId,
        reason,
        status: 'submitted',
      },
    });

    await prisma.report.update({
      where: { id: reportId },
      data: { reviewState: 'reviewed', appealReason: reason },
    });

    await this.createAuditLog({
      userId,
      action: 'moderation_appeal_submitted',
      resource: 'ModerationAppeal',
      resourceId: appeal.id,
      changes: { reportId, reason },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return appeal;
  }

  async reviewAppeal(appealId: string, reviewerId: string, decision: 'approved' | 'rejected', resolution: string, context?: AuditContext): Promise<any> {
    const appeal = await prisma.moderationAppeal.findUnique({ where: { id: appealId } });
    if (!appeal) {
      throw new NotFoundError('Appeal');
    }

    const updated = await prisma.moderationAppeal.update({
      where: { id: appealId },
      data: {
        status: decision === 'approved' ? 'approved' : 'rejected',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        resolution,
      },
    });

    await this.createAuditLog({
      userId: reviewerId,
      action: 'moderation_appeal_reviewed',
      resource: 'ModerationAppeal',
      resourceId: appealId,
      changes: { decision, resolution },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return updated;
  }

  private async createAuditLog(data: {
    userId: string;
    action: string;
    resource: string;
    resourceId: string;
    changes: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        changes: data.changes,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  /**
   * Calculate priority based on reason
   */
  private calculatePriority(reason: string): string {
    const criticalReasons = ['violence', 'self_harm', 'hate_speech'];
    const highReasons = ['harassment'];

    if (criticalReasons.includes(reason)) return 'critical';
    if (highReasons.includes(reason)) return 'high';
    return 'normal';
  }
}

export const moderationService = new ModerationService();
