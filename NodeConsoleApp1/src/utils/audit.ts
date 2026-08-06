/**
 * Audit logging utility
 * Tracks all important actions for compliance and debugging
 */

import prisma from '@/database/client';
import { logger } from '@/config/logger';

export interface AuditLogData {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAction(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        changes: data.changes,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    logger.error({ error, data }, 'Failed to create audit log');
  }
}

export async function getAuditLog(
  filters: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  },
  limit: number = 100,
): Promise<any[]> {
  const where: any = {};

  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.resource) where.resource = filters.resource;

  if (filters.startDate || filters.endDate) {
    where.timestamp = {};
    if (filters.startDate) where.timestamp.gte = filters.startDate;
    if (filters.endDate) where.timestamp.lte = filters.endDate;
  }

  return prisma.auditLog.findMany({
    where,
    take: Math.min(limit, 1000),
    orderBy: { timestamp: 'desc' },
  });
}
