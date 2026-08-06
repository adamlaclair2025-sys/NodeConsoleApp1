import { Request, Response } from 'express';
import { postService } from './service';

export class PostController {
  /**
   * POST /posts
   */
  async createPost(req: Request, res: Response): Promise<void> {
    const { content, isAnonymous, contentWarning, triggerWarnings, visibility, audience, anonymousAlias, allowComments, allowReactions, isDraft } = req.body;

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const post = await postService.createPost({
      authorId: req.auth!.userId,
      content,
      isAnonymous: isAnonymous || false,
      contentWarning,
      triggerWarnings,
      visibility: visibility || 'public',
      audience,
      anonymousAlias,
      allowComments,
      allowReactions,
      isDraft: isDraft || false,
    });

    res.status(201).json({
      success: true,
      data: post,
    });
  }

  /**
   * GET /posts/feed
   */
  async getFeed(req: Request, res: Response): Promise<void> {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const posts = await postService.getFeed(limit, offset);

    res.json({
      success: true,
      data: posts,
      pagination: { limit, offset },
    });
  }

  /**
   * GET /posts/:id
   */
  async getPost(req: Request, res: Response): Promise<void> {
    const post = await postService.getPostById(req.params.id);

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    res.json({
      success: true,
      data: post,
    });
  }

  /**
   * DELETE /posts/:id
   */
  async deletePost(req: Request, res: Response): Promise<void> {
    try {
      await postService.deletePost(req.params.id, req.auth!.userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        res.status(403).json({ error: 'Cannot delete another user\'s post' });
      } else {
        throw error;
      }
    }
  }
}

export const postController = new PostController();
