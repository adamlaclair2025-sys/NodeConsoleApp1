import prisma from '@/database/client';
import { logger } from '@/config/logger';
import { CrisisResource } from '@prisma/client';
import { NotFoundError } from '@/middleware/errors';

export class CrisisResourceService {
  /**
   * Create or update crisis resource
   */
  async upsertResource(data: {
    name: string;
    organization?: string;
    description?: string;
    country: string;
    region?: string;
    phone?: string;
    website?: string;
    languages?: string[];
    categories?: string[];
    sms?: boolean;
    chat?: boolean;
    featured?: boolean;
  }): Promise<CrisisResource> {
    // Try to find existing by name and country
    const existing = await prisma.crisisResource.findFirst({
      where: {
        name: data.name,
        country: data.country,
      },
    });

    if (existing) {
      // Update existing
      return prisma.crisisResource.update({
        where: { id: existing.id },
        data: {
          ...data,
          verifiedAt: new Date(),
        },
      });
    }

    // Create new
    const resource = await prisma.crisisResource.create({
      data: {
        ...data,
        verifiedAt: new Date(),
      },
    });

    logger.info({ resourceId: resource.id, country: data.country }, 'Crisis resource created');
    return resource;
  }

  /**
   * Get resources by location
   */
  async getResourcesByLocation(
    country: string,
    region?: string,
  ): Promise<CrisisResource[]> {
    return prisma.crisisResource.findMany({
      where: {
        country,
        ...(region && { region }),
        featured: true,
      },
      orderBy: [{ featured: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Search resources by category
   */
  async getResourcesByCategory(
    category: string,
    country?: string,
  ): Promise<CrisisResource[]> {
    return prisma.crisisResource.findMany({
      where: {
        categories: {
          hasSome: [category],
        },
        ...(country && { country }),
      },
      orderBy: { featured: 'desc' },
    });
  }

  /**
   * Get featured resources
   */
  async getFeaturedResources(country?: string): Promise<CrisisResource[]> {
    return prisma.crisisResource.findMany({
      where: {
        featured: true,
        ...(country && { country }),
      },
      orderBy: { name: 'asc' },
      take: 50,
    });
  }

  /**
   * Search all resources
   */
  async searchResources(
    query: string,
    country?: string,
    language?: string,
  ): Promise<CrisisResource[]> {
    return prisma.crisisResource.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { organization: { contains: query, mode: 'insensitive' } },
        ],
        ...(country && { country }),
        ...(language && { languages: { hasSome: [language] } }),
      },
      orderBy: { featured: 'desc' },
      take: 100,
    });
  }

  /**
   * Get immediate crisis numbers by country
   */
  async getEmergenceResources(country: string): Promise<CrisisResource[]> {
    return prisma.crisisResource.findMany({
      where: {
        country,
        categories: {
          hasSome: ['crisis', 'emergency', 'suicide'],
        },
      },
      orderBy: { featured: 'desc' },
      take: 10,
    });
  }

  /**
   * Get all resources with filtering
   */
  async getAllResources(
    filters?: {
      country?: string;
      category?: string;
      language?: string;
      featured?: boolean;
    },
    limit: number = 100,
    offset: number = 0,
  ): Promise<CrisisResource[]> {
    return prisma.crisisResource.findMany({
      where: {
        ...(filters?.country && { country: filters.country }),
        ...(filters?.category && { categories: { hasSome: [filters.category] } }),
        ...(filters?.language && { languages: { hasSome: [filters.language] } }),
        ...(filters?.featured !== undefined && { featured: filters.featured }),
      },
      take: Math.min(limit, 1000),
      skip: offset,
      orderBy: [{ featured: 'desc' }, { country: 'asc' }],
    });
  }

  /**
   * Verify resource is still active
   */
  async verifyResource(id: string): Promise<CrisisResource> {
    return prisma.crisisResource.update({
      where: { id },
      data: { verifiedAt: new Date() },
    });
  }

  /**
   * Get resources needing verification (not verified in 90 days)
   */
  async getResourcesNeedingVerification(): Promise<CrisisResource[]> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    return prisma.crisisResource.findMany({
      where: {
        OR: [{ verifiedAt: null }, { verifiedAt: { lt: ninetyDaysAgo } }],
      },
      orderBy: { verifiedAt: 'asc' },
    });
  }

  /**
   * Get resource categories
   */
  async getCategories(): Promise<string[]> {
    const resources = await prisma.crisisResource.findMany({
      select: { categories: true },
    });

    const categories = new Set<string>();
    for (const res of resources) {
      res.categories.forEach(cat => categories.add(cat));
    }

    return Array.from(categories).sort();
  }

  /**
   * Get supported countries
   */
  async getCountries(): Promise<string[]> {
    const resources = await prisma.crisisResource.findMany({
      select: { country: true },
      distinct: ['country'],
    });

    return resources.map(r => r.country).sort();
  }
}

export const crisisResourceService = new CrisisResourceService();
