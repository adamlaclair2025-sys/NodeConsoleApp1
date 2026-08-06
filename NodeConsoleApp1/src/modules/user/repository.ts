import prisma from '@/database/client';
import { logger } from '@/config/logger';
import { hashPassword, normalizeEmail, verifyPassword } from '@/auth/security';
import { Prisma, User } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@/middleware/errors';

export class UserRepository {
  /**
   * Create a new user
   */
  async create(data: {
    email: string;
    password: string;
    displayName: string;
    username?: string;
  }): Promise<User> {
    const normalizedEmail = normalizeEmail(data.email);

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const hashedPassword = await hashPassword(data.password);

    try {
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          profile: {
            create: {
              displayName: data.displayName,
            },
          },
        },
        include: { profile: true },
      });

      logger.info({ userId: user.id, email: user.email }, 'User created');
      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError('Email already registered');
      }
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
      include: { profile: true },
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  }

  /**
   * Verify password for login
   */
  async verifyLogin(email: string, password: string): Promise<User> {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new ValidationError('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new ValidationError('Account is not active');
    }

    const passwordValid = await verifyPassword(password, user.password);

    if (!passwordValid) {
      throw new ValidationError('Invalid email or password');
    }

    return user;
  }

  /**
   * Update user
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data,
        include: { profile: true },
      });

      logger.info({ userId: id }, 'User updated');
      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundError('User');
      }
      throw error;
    }
  }

  /**
   * Delete user (soft delete via status)
   */
  async delete(id: string): Promise<User> {
    logger.info({ userId: id }, 'User deleted');
    return this.update(id, { status: 'deleted', deletedAt: new Date() });
  }

  /**
   * Update password
   */
  async updatePassword(id: string, newPassword: string): Promise<void> {
    const hashedPassword = await hashPassword(newPassword);
    await this.update(id, { password: hashedPassword });
    logger.info({ userId: id }, 'Password updated');
  }
}

export const userRepository = new UserRepository();
