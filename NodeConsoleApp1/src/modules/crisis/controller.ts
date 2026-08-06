import { Request, Response } from 'express';
import { crisisResourceService } from './service';
import { logger } from '@/config/logger';

export class CrisisResourceController {
  /**
   * GET /crisis/resources/emergency
   * Get emergency crisis numbers by country
   */
  async getEmergencyResources(req: Request, res: Response): Promise<void> {
    const { country } = req.query;

    if (!country) {
      res.status(400).json({ error: 'Country parameter required' });
      return;
    }

    const resources = await crisisResourceService.getEmergenceResources(
      country as string,
    );

    logger.info({ country }, 'Emergency resources retrieved');

    res.json({
      success: true,
      data: resources,
    });
  }

  /**
   * GET /crisis/resources/featured
   * Get featured crisis resources
   */
  async getFeaturedResources(req: Request, res: Response): Promise<void> {
    const { country } = req.query;

    const resources = await crisisResourceService.getFeaturedResources(
      country as string,
    );

    res.json({
      success: true,
      data: resources,
    });
  }

  /**
   * GET /crisis/resources/by-location
   */
  async getByLocation(req: Request, res: Response): Promise<void> {
    const { country, region } = req.query;

    if (!country) {
      res.status(400).json({ error: 'Country parameter required' });
      return;
    }

    const resources = await crisisResourceService.getResourcesByLocation(
      country as string,
      region as string,
    );

    res.json({
      success: true,
      data: resources,
    });
  }

  /**
   * GET /crisis/resources/by-category
   */
  async getByCategory(req: Request, res: Response): Promise<void> {
    const { category, country } = req.query;

    if (!category) {
      res.status(400).json({ error: 'Category parameter required' });
      return;
    }

    const resources = await crisisResourceService.getResourcesByCategory(
      category as string,
      country as string,
    );

    res.json({
      success: true,
      data: resources,
    });
  }

  /**
   * GET /crisis/resources/search
   */
  async search(req: Request, res: Response): Promise<void> {
    const { q, country, language } = req.query;

    if (!q) {
      res.status(400).json({ error: 'Query parameter required' });
      return;
    }

    const resources = await crisisResourceService.searchResources(
      q as string,
      country as string,
      language as string,
    );

    res.json({
      success: true,
      data: resources,
    });
  }

  /**
   * GET /crisis/resources
   */
  async listAll(req: Request, res: Response): Promise<void> {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const resources = await crisisResourceService.getAllResources(
      {
        country: req.query.country as string,
        category: req.query.category as string,
        language: req.query.language as string,
        featured: req.query.featured === 'true',
      },
      limit,
      offset,
    );

    res.json({
      success: true,
      data: resources,
      pagination: { limit, offset },
    });
  }

  /**
   * GET /crisis/categories
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    const categories = await crisisResourceService.getCategories();

    res.json({
      success: true,
      data: categories,
    });
  }

  /**
   * GET /crisis/countries
   */
  async getCountries(req: Request, res: Response): Promise<void> {
    const countries = await crisisResourceService.getCountries();

    res.json({
      success: true,
      data: countries,
    });
  }
}

export const crisisResourceController = new CrisisResourceController();
