import { Request, Response } from 'express';
import { userService } from './service';
import { registerSchema, loginSchema, updateProfileSchema } from './schemas';
import { ValidationError } from '@/middleware/errors';
import { logger } from '@/config/logger';

export class UserController {
  /**
   * POST /auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const input = registerSchema.parse(req.body);
      const result = await userService.register(input);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        throw error;
      }
    }
  }

  /**
   * POST /auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const input = loginSchema.parse(req.body);
      const result = await userService.login(input);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(401).json({ error: error.message });
      } else {
        throw error;
      }
    }
  }

  /**
   * GET /users/me
   */
  async getMe(req: Request, res: Response): Promise<void> {
    const user = await userService.getUserById(req.auth!.userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        profile: user.profile,
      },
    });
  }

  /**
   * PATCH /users/me/profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const input = updateProfileSchema.parse(req.body);
      const user = await userService.updateProfile(req.auth!.userId, input);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        throw error;
      }
    }
  }

  /**
   * DELETE /users/me
   */
  async deleteAccount(req: Request, res: Response): Promise<void> {
    await userService.deleteAccount(req.auth!.userId);
    logger.info({ userId: req.auth!.userId }, 'Account deleted via API');

    res.status(204).send();
  }
}

export const userController = new UserController();
