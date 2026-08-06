import prisma from '@/database/client';
import { logger } from '@/config/logger';
import { ConflictError, NotFoundError } from '@/middleware/errors';
import { generateSlug } from '@/utils';

export class CommunityService {
  /**
   * Create a new community
   */
  async createCommunity(data: {
    creatorId: string;
    name: string;
    slug: string;
    description?: string;
    visibility?: string;
    joinPolicy?: string;
    moderationMode?: string;
    approvalRequired?: boolean;
    rules?: string[];
    guidelines?: string;
  }): Promise<any> {
    const normalizedSlug = generateSlug(data.slug);

    // Check if slug already exists
    const existing = await prisma.community.findUnique({
      where: { slug: normalizedSlug },
    });

    if (existing) {
      throw new ConflictError('Community slug already exists');
    }

    const community = await prisma.community.create({
      data: {
        creatorId: data.creatorId,
        name: data.name,
        slug: normalizedSlug,
        description: data.description,
        visibility: data.visibility || 'public',
        joinPolicy: data.joinPolicy || 'open',
        moderationMode: data.moderationMode || 'standard',
        requiresApproval: data.approvalRequired ?? false,
        rules: data.rules || [],
        guidelines: data.guidelines,
      },
    });

    // Add creator as member
    await prisma.communityMember.create({
      data: {
        communityId: community.id,
        userId: data.creatorId,
        role: 'member',
      },
    });

    logger.info({ communityId: community.id, creatorId: data.creatorId }, 'Community created');
    return community;
  }

  /**
   * Get community by ID or slug
   */
  async getCommunity(idOrSlug: string): Promise<any> {
    return prisma.community.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        _count: {
          select: { members: true, posts: true },
        },
      },
    });
  }

  /**
   * Join community
   */
  async joinCommunity(communityId: string, userId: string): Promise<any> {
    const community = await this.getCommunity(communityId);
    if (!community) {
      throw new NotFoundError('Community');
    }

    // Check if already a member
    const existing = await prisma.communityMember.findUnique({
      where: {
        communityId_userId: { communityId, userId },
      },
    });

    if (existing) {
      throw new ConflictError('Already a member of this community');
    }

    const member = await prisma.communityMember.create({
      data: {
        communityId,
        userId,
        role: 'member',
      },
    });

    logger.info({ communityId, userId }, 'User joined community');
    return member;
  }

  /**
   * Leave community
   */
  async leaveCommunity(communityId: string, userId: string): Promise<void> {
    const deleted = await prisma.communityMember.deleteMany({
      where: { communityId, userId },
    });

    if (deleted.count === 0) {
      throw new NotFoundError('Community membership');
    }

    logger.info({ communityId, userId }, 'User left community');
  }

  /**
   * Get community members
   */
  async getMembers(
    communityId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<any[]> {
    return prisma.communityMember.findMany({
      where: { communityId },
      take: limit,
      skip: offset,
      include: {
        user: {
          include: { profile: true },
        },
      },
    });
  }

  /**
   * List public communities
   */
  async listCommunities(limit: number = 20, offset: number = 0): Promise<any[]> {
    return prisma.community.findMany({
      where: { visibility: 'public', archivedAt: null },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });
  }

  async blockUserInCommunity(communityId: string, userId: string, blockedByUserId: string, reason?: string): Promise<void> {
    await prisma.communityBlock.upsert({
      where: { communityId_userId: { communityId, userId } },
      update: { reason, blockedByUserId },
      create: { communityId, userId, blockedByUserId, reason },
    });
  }

  async muteUserInCommunity(communityId: string, userId: string, mutedByUserId: string, reason?: string): Promise<void> {
    await prisma.communityMute.upsert({
      where: { communityId_userId: { communityId, userId } },
      update: { reason, mutedByUserId },
      create: { communityId, userId, mutedByUserId, reason },
    });
  }

  async blockUserOnPost(postId: string, userId: string, blockedByUserId: string, reason?: string): Promise<void> {
    await prisma.postBlock.upsert({
      where: { postId_userId: { postId, userId } },
      update: { reason, blockedByUserId },
      create: { postId, userId, blockedByUserId, reason },
    });
  }

  async muteUserOnPost(postId: string, userId: string, mutedByUserId: string, reason?: string): Promise<void> {
    await prisma.postMute.upsert({
      where: { postId_userId: { postId, userId } },
      update: { reason, mutedByUserId },
      create: { postId, userId, mutedByUserId, reason },
    });
  }
}

export const communityService = new CommunityService();
