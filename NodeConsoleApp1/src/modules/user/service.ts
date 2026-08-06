import { userRepository } from './repository';
import { signToken, signRefreshToken } from '@/auth/jwt';
import { RegisterInput, LoginInput, UpdateProfileInput } from './schemas';
import { logger } from '@/config/logger';
import { User } from '@prisma/client';
import { ValidationError, NotFoundError } from '@/middleware/errors';
import { validatePasswordStrength } from '@/auth/security';
import { config } from '@/config';
import { UserRole } from '@/types';

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
  };
  accessToken: string;
  refreshToken: string;
}

export class UserService {
  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(input.password, config.password);
    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.errors.join('; '));
    }

    const user = await userRepository.create({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
    });

    logger.info({ userId: user.id }, 'User registered successfully');

    const accessToken = signToken(user.id, user.email, [UserRole.USER]);
    const refreshToken = signRefreshToken(user.id, user.email, [UserRole.USER]);

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.profile?.displayName || '',
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login user
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await userRepository.verifyLogin(input.email, input.password);

    logger.info({ userId: user.id }, 'User logged in');

    const accessToken = signToken(user.id, user.email, [UserRole.USER]);
    const refreshToken = signRefreshToken(user.id, user.email, [UserRole.USER]);

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.profile?.displayName || '',
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    return userRepository.findById(id);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    return userRepository.update(userId, {
      profile: {
        update: {
          displayName: input.displayName,
          bio: input.bio,
          pronouns: input.pronouns,
          avatar: input.avatar,
        },
      },
    });
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string): Promise<void> {
    await userRepository.delete(userId);
    logger.info({ userId }, 'User account deleted');
  }
}

export const userService = new UserService();
