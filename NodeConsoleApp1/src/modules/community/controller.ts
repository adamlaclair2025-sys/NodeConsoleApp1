import { Request, Response } from 'express';
import { communityService } from './service';
import { createCommunitySchema, communitySafetySchema } from './schemas';
import { logger } from '@/config/logger';

export class CommunityController {
  /**
   * POST /communities
   */
  async createCommunity(req: Request, res: Response): Promise<void> {
    try {
      const input = createCommunitySchema.parse(req.body);
      const community = await communityService.createCommunity({
        ...input,
        creatorId: req.auth!.userId,
      });

      res.status(201).json({
        success: true,
        data: community,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * GET /communities/:id
   */
  async getCommunity(req: Request, res: Response): Promise<void> {
    const community = await communityService.getCommunity(req.params.id);

    if (!community) {
      res.status(404).json({ error: 'Community not found' });
      return;
    }

    res.json({
      success: true,
      data: community,
    });
  }

  /**
   * GET /communities
   */
  async listCommunities(req: Request, res: Response): Promise<void> {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const communities = await communityService.listCommunities(limit, offset);

    res.json({
      success: true,
      data: communities,
      pagination: { limit, offset },
    });
  }

  /**
   * POST /communities/:id/join
   */
  async joinCommunity(req: Request, res: Response): Promise<void> {
    const member = await communityService.joinCommunity(req.params.id, req.auth!.userId);

    logger.info({ communityId: req.params.id, userId: req.auth!.userId }, 'User joined community');

    res.status(201).json({
      success: true,
      data: member,
    });
  }

  /**
   * DELETE /communities/:id/leave
   */
  async leaveCommunity(req: Request, res: Response): Promise<void> {
    await communityService.leaveCommunity(req.params.id, req.auth!.userId);

    res.status(204).send();
  }

  /**
   * GET /communities/:id/members
   */
  async getMembers(req: Request, res: Response): Promise<void> {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const members = await communityService.getMembers(req.params.id, limit, offset);

    res.json({
      success: true,
      data: members,
      pagination: { limit, offset },
    });
  }

  async blockCommunityUser(req: Request, res: Response): Promise<void> {
    const input = communitySafetySchema.parse(req.body);
    await communityService.blockUserInCommunity(req.params.id, input.userId, req.auth!.userId, input.reason);
    res.status(201).json({ success: true, data: { blocked: true } });
  }

  async muteCommunityUser(req: Request, res: Response): Promise<void> {
    const input = communitySafetySchema.parse(req.body);
    await communityService.muteUserInCommunity(req.params.id, input.userId, req.auth!.userId, input.reason);
    res.status(201).json({ success: true, data: { muted: true } });
  }

  async blockPostUser(req: Request, res: Response): Promise<void> {
    const input = communitySafetySchema.parse(req.body);
    await communityService.blockUserOnPost(req.params.postId, input.userId, req.auth!.userId, input.reason);
    res.status(201).json({ success: true, data: { blocked: true } });
  }

  async mutePostUser(req: Request, res: Response): Promise<void> {
    const input = communitySafetySchema.parse(req.body);
    await communityService.muteUserOnPost(req.params.postId, input.userId, req.auth!.userId, input.reason);
    res.status(201).json({ success: true, data: { muted: true } });
  }
}

export const communityController = new CommunityController();
