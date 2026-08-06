    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    res.json({
      success: true,
      data: comment,
    });
  }

  /**
   * GET /posts/:postId/comments
   */
  async getPostComments(req: Request, res: Response): Promise<void> {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const comments = await commentService.getPostComments(
      req.params.postId,
      limit,
      offset,
    );
    const total = await commentService.countPostComments(req.params.postId);

    res.json({
      success: true,
      data: comments,
      pagination: { limit, offset, total },
    });
  }

  /**
   * PATCH /comments/:id
   */
  async updateComment(req: Request, res: Response): Promise<void> {
    try {
      const input = updateCommentSchema.parse(req.body);

      const comment = await commentService.updateComment(
        req.params.id,
        req.auth!.userId,
        input.content,
      );

      res.json({
        success: true,
        data: comment,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        res.status(403).json({ error: 'Cannot edit another user\'s comment' });
      } else {
        throw error;
      }
    }
  }

  /**
   * DELETE /comments/:id
   */
  async deleteComment(req: Request, res: Response): Promise<void> {
    try {
      await commentService.deleteComment(req.params.id, req.auth!.userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        res.status(403).json({ error: 'Cannot delete another user\'s comment' });
      } else {
        throw error;
      }
    }
  }

  async updateCommentModeration(req: Request, res: Response): Promise<void> {
    const input = commentModerationSchema.parse(req.body);
    const comment = await commentService.setCommentModerationState(
      req.params.id,
      req.auth!.userId,
      input.moderationState || 'reviewed',
      input.isLocked,
    );

    res.json({ success: true, data: comment });
  }
}

export const commentController = new CommentController();
