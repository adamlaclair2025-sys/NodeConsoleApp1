import { Request, Response } from 'express';
import { reactionService, REACTION_TYPES, ReactionType } from './service';

export class ReactionController {
  /**
   * POST /posts/:postId/reactions or /comments/:commentId/reactions
   */
  async addReaction(req: Request, res: Response): Promise<void> {
    const { reactionType } = req.body;
    const { postId, commentId } = req.params;

    if (!Object.keys(REACTION_TYPES).includes(reactionType)) {
      res.status(400).json({
        error: `Invalid reaction type. Valid types: ${Object.keys(REACTION_TYPES).join(', ')}`,
      });
      return;
    }

    const result = await reactionService.addReaction({
      userId: req.auth!.userId,
      postId: postId || undefined,
      commentId: commentId || undefined,
      reactionType: reactionType as ReactionType,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  }

  /**
   * GET /posts/:postId/reactions or /comments/:commentId/reactions
   */
  async getReactions(req: Request, res: Response): Promise<void> {
    const { postId, commentId } = req.params;

    const data = await reactionService.getReactions(postId, commentId);

    res.json({
      success: true,
      data,
    });
  }

  /**
   * DELETE /reactions/:id
   */
  async removeReaction(req: Request, res: Response): Promise<void> {
    try {
      await reactionService.removeReaction(req.params.id, req.auth!.userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        res.status(403).json({ error: 'Cannot delete another user\'s reaction' });
      } else {
        throw error;
      }
    }
  }

  /**
   * GET /users/me/reactions
   */
  async getUserReactions(req: Request, res: Response): Promise<void> {
    const reactions = await reactionService.getUserReactions(req.auth!.userId);

    res.json({
      success: true,
      data: reactions,
    });
  }

  /**
   * Get reaction types
   */
  getReactionTypes(_req: Request, res: Response): void {
    res.json({
      success: true,
      data: REACTION_TYPES,
    });
  }
}

export const reactionController = new ReactionController();
