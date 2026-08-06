import { Request, Response } from 'express';
import { volunteerService } from './service';
import { logger } from '@/config/logger';

export class VolunteerController {
  /**
   * POST /volunteer/apply
   */
  async applyAsVolunteer(req: Request, res: Response): Promise<void> {
    const { bio, languages, supportTopics, availability } = req.body;

    const profile = await volunteerService.createVolunteerProfile({
      userId: req.auth!.userId,
      bio,
      languages,
      supportTopics,
      availability,
    });

    logger.info({ volunteerId: profile.id }, 'Volunteer application submitted');

    res.status(201).json({
      success: true,
      data: profile,
      message: 'Your application has been submitted for review',
    });
  }

  /**
   * GET /volunteer/profile
   */
  async getVolunteerProfile(req: Request, res: Response): Promise<void> {
    const volunteer = await volunteerService.getActiveVolunteers();
    // In production, would filter by userId

    res.json({
      success: true,
      data: volunteer,
    });
  }

  /**
   * GET /volunteer/matches
   */
  async getMatches(req: Request, res: Response): Promise<void> {
    // In production, would get volunteerId from JWT
    const matches = await volunteerService.getVolunteerMatches('volunteer-id');

    res.json({
      success: true,
      data: matches,
    });
  }

  /**
   * GET /volunteer/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    // In production, would get volunteerId from JWT
    const stats = await volunteerService.getVolunteerStats('volunteer-id');

    res.json({
      success: true,
      data: stats,
    });
  }

  /**
   * POST /volunteer/escalate
   */
  async escalate(req: Request, res: Response): Promise<void> {
    const { matchId, reason } = req.body;

    const escalation = await volunteerService.escalateToSupervisor(matchId, reason);

    logger.info({ matchId }, 'Escalation requested via API');

    res.status(201).json({
      success: true,
      data: escalation,
    });
  }
}

export const volunteerController = new VolunteerController();
