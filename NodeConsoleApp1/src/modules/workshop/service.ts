import prisma from '@/database/client';
import { logger } from '@/config/logger';
import { Workshop, LearningProgress } from '@prisma/client';
import { NotFoundError } from '@/middleware/errors';

export class WorkshopService {
  /**
   * Get published workshop
   */
  async getWorkshop(idOrSlug: string): Promise<Workshop | null> {
    return prisma.workshop.findFirst({
      where: {
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug }
        ],
        isPublished: true,
      },
    });
  }

  /**
   * List published workshops
   */
  async listWorkshops(
    filters?: {
      difficulty?: string;
      category?: string;
    },
    limit: number = 20,
    offset: number = 0,
  ): Promise<Workshop[]> {
    const where: any = { isPublished: true };

    if (filters?.difficulty) {
      where.difficulty = filters.difficulty;
    }

    if (filters?.category) {
      where.category = {
        hasSome: [filters.category],
      };
    }

    return prisma.workshop.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Start workshop
   */
  async startWorkshop(workshopId: string, userId: string): Promise<LearningProgress> {
    const workshop = await this.getWorkshop(workshopId);
    if (!workshop) {
      throw new NotFoundError('Workshop');
    }

    // Check if already started
    const existing = await prisma.learningProgress.findUnique({
      where: {
        userId_workshopId: { userId, workshopId: workshop.id },
      },
    });

    if (existing) {
      return existing;
    }

    const progress = await prisma.learningProgress.create({
      data: {
        userId,
        workshopId: workshop.id,
        status: 'in_progress',
      },
    });

    logger.info({ workshopId: workshop.id, userId }, 'Workshop started');
    return progress;
  }

  /**
   * Update progress
   */
  async updateProgress(
    workshopId: string,
    userId: string,
    progressPercent: number,
  ): Promise<LearningProgress> {
    const progress = await prisma.learningProgress.findUnique({
      where: {
        userId_workshopId: { userId, workshopId },
      },
    });

    if (!progress) {
      throw new NotFoundError('Learning progress');
    }

    const isCompleted = progressPercent >= 100;

    const updated = await prisma.learningProgress.update({
      where: {
        userId_workshopId: { userId, workshopId },
      },
      data: {
        progressPercent,
        status: isCompleted ? 'completed' : 'in_progress',
        completedAt: isCompleted ? new Date() : null,
      },
    });

    logger.info(
      { workshopId, userId, progressPercent },
      'Workshop progress updated',
    );

    return updated;
  }

  /**
   * Get user's progress
   */
  async getUserProgress(userId: string, limit: number = 20, offset: number = 0) {
    return prisma.learningProgress.findMany({
      where: { userId },
      take: limit,
      skip: offset,
      include: {
        workshop: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}

export const workshopService = new WorkshopService();
