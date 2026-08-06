import prisma from '@/database/client';
import { logger } from '@/config/logger';
import { JournalEntry } from '@prisma/client';
import { NotFoundError } from '@/middleware/errors';

export class JournalService {
  /**
   * Create journal entry
   */
  async createEntry(data: {
    userId: string;
    content: string;
    moodTags?: string[];
  }): Promise<JournalEntry> {
    const entry = await prisma.journalEntry.create({
      data: {
        userId: data.userId,
        content: data.content,
        moodTags: data.moodTags || [],
        isPrivate: true,
      },
    });

    logger.info({ entryId: entry.id, userId: data.userId }, 'Journal entry created');
    return entry;
  }

  /**
   * Get user's journal entries
   */
  async getUserEntries(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<JournalEntry[]> {
    return prisma.journalEntry.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single entry (with authorization check in controller)
   */
  async getEntry(id: string): Promise<JournalEntry | null> {
    return prisma.journalEntry.findUnique({
      where: { id },
    });
  }

  /**
   * Update journal entry
   */
  async updateEntry(
    id: string,
    userId: string,
    data: { content?: string; moodTags?: string[] },
  ): Promise<JournalEntry> {
    const entry = await this.getEntry(id);

    if (!entry) {
      throw new NotFoundError('Journal entry');
    }

    if (entry.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const updated = await prisma.journalEntry.update({
      where: { id },
      data: {
        content: data.content || entry.content,
        moodTags: data.moodTags || entry.moodTags,
      },
    });

    logger.info({ entryId: id }, 'Journal entry updated');
    return updated;
  }

  /**
   * Delete journal entry
   */
  async deleteEntry(id: string, userId: string): Promise<void> {
    const entry = await this.getEntry(id);

    if (!entry) {
      throw new NotFoundError('Journal entry');
    }

    if (entry.userId !== userId) {
      throw new Error('Unauthorized');
    }

    await prisma.journalEntry.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    logger.info({ entryId: id }, 'Journal entry deleted');
  }

  /**
   * Get mood statistics
   */
  async getMoodStats(
    userId: string,
    days: number = 30,
  ): Promise<Record<string, number>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const entries = await prisma.journalEntry.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
        deletedAt: null,
      },
      select: { moodTags: true },
    });

    const stats: Record<string, number> = {};

    for (const entry of entries) {
      for (const mood of entry.moodTags) {
        stats[mood] = (stats[mood] || 0) + 1;
      }
    }

    return stats;
  }
}

export const journalService = new JournalService();
