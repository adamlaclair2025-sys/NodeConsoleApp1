import { prisma } from '@/database/client';
import { logger } from '@/config/logger';
import { MatchStatus } from '@prisma/client';
import {
  RequestPeerSupportInput,
  MatchPreferencesInput,
  AcceptMatchInput,
  PauseMatchInput,
  EndMatchInput,
  SessionReflectionInput,
} from './schemas';

export class MatchingService {
  /**
   * User requests peer support
   */
  async requestPeerSupport(
    userId: string,
    input: RequestPeerSupportInput
  ): Promise<any> {
    logger.info(
      { userId, supportType: input.supportType },
      'Peer support requested'
    );

    // Create support request (stored as match in pending state)
    const request = await prisma.peerSupportMatch.create({
      data: {
        userId,
        volunteerId: '', // Placeholder, will be updated when matched
        status: 'pending_acceptance' as any,
        notes: `Support: ${input.supportType}, Focus: ${input.focusAreas.join(',')}`,
      },
    });

    // Find matching volunteers
    const availableVolunteers = await this.getAvailableVolunteers({
      specialties: input.focusAreas,
      languages: [input.preferredLanguage],
      timezone: input.timezone,
    });

    logger.info(
      { userId, availableCount: availableVolunteers.length },
      'Available volunteers found'
    );

    return {
      requestId: request.id,
      availableVolunteers,
      message: `Found ${availableVolunteers.length} available volunteers`,
    };
  }

  /**
   * Create match between volunteer and user
   * Called when user picks a volunteer or system auto-matches
   */
  async createMatch(
    volunteerId: string,
    userId: string,
    input: AcceptMatchInput
  ): Promise<any> {
    logger.info(
      { volunteerId, userId },
      'Creating peer support match'
    );

    // Check volunteer can accept more matches
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: volunteerId },
    });

    if (!volunteer) {
      throw new Error('Volunteer not found');
    }

    if (volunteer.currentCaseLoad >= volunteer.maximumCaseLoad) {
      throw new Error('Volunteer case load is at maximum');
    }

    // Check no existing active match
    const existing = await prisma.peerSupportMatch.findFirst({
      where: {
        volunteerId,
        userId,
        status: { in: ['active', 'pending_acceptance'] },
      },
    });

    if (existing) {
      throw new Error('Match already exists between these users');
    }

    // Create match
    const match = await prisma.peerSupportMatch.create({
      data: {
        volunteerId,
        userId,
        status: 'pending_acceptance' as any,
        notes: input.notes,
      },
      include: {
        volunteer: {
          select: {
            user: {
              select: {
                profile: { select: { displayName: true, avatar: true } },
              },
            },
          },
        },
        user: {
          select: {
            email: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });

    logger.info(
      { matchId: match.id },
      'Match created, awaiting volunteer acceptance'
    );

    return this.formatMatch(match);
  }

  /**
   * Get available volunteers for peer support
   * Implements matching algorithm
   */
  async getAvailableVolunteers(preferences?: {
    specialties?: string[];
    languages?: string[];
    timezone?: string;
  }): Promise<any[]> {
    // Step 1: Base filter - active, verified, certified, under case load
    const baseFilter: any = {
      status: 'active',
      verificationStatus: 'verified',
      certificationLevel: { not: 'none' },
      isActive: true,
    };

    // Step 2: Case load filter
    const volunteersWithCaseLoad = await prisma.volunteer.findMany({
      where: baseFilter,
      include: {
        peerSupportMatches: {
          where: { status: 'active' },
          select: { id: true },
        },
      },
    });

    const availableByLoad = volunteersWithCaseLoad.filter(
      (v) => v.peerSupportMatches.length < v.maximumCaseLoad
    );

    if (availableByLoad.length === 0) {
      return [];
    }

    // Step 3: Filter by preferences if provided
    let filtered = availableByLoad;

    if (preferences?.specialties?.length) {
      filtered = filtered.filter((v) =>
        v.specialties.some((s) => preferences.specialties!.includes(s))
      );
    }

    if (preferences?.languages?.length) {
      filtered = filtered.filter((v) =>
        v.languages.some((l) => preferences.languages!.includes(l))
      );
    }

    if (preferences?.timezone) {
      filtered = filtered.filter((v) => v.timezone === preferences.timezone);
    }

    // Step 4: Get full details and format
    const detailed = await prisma.volunteer.findMany({
      where: { id: { in: filtered.map((v) => v.id) } },
      include: {
        user: {
          select: {
            profile: { select: { displayName: true, avatar: true } },
          },
        },
        certifications: {
          where: { isApproved: true },
          select: { type: true },
          take: 3,
        },
      },
    });

    // Step 5: Score and sort
    const scored = detailed.map((v) => ({
      id: v.id,
      displayName: v.user?.profile?.displayName,
      avatar: v.user?.profile?.avatar,
      specialties: v.specialties,
      languages: v.languages,
      timezone: v.timezone,
      bio: v.bio,
      certifications: v.certifications.map((c) => c.type),
      score: this.calculateMatchScore(v, preferences || {}),
    }));

    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Volunteer accepts a match
   */
  async acceptMatch(
    matchId: string,
    volunteerId: string,
    startDate?: Date
  ): Promise<any> {
    const match = await prisma.peerSupportMatch.findUnique({
      where: { id: matchId },
      include: {
        volunteer: true,
        user: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
      },
    });

    if (!match) {
      throw new Error('Match not found');
    }

    if (match.volunteerId !== volunteerId) {
      throw new Error('Not your match to accept');
    }

    // Update match status
    const updated = await prisma.peerSupportMatch.update({
      where: { id: matchId },
      data: {
        status: 'active' as any,
        startedAt: startDate || new Date(),
      },
      include: {
        volunteer: { select: { user: { select: { profile: { select: { displayName: true } } } } } },
        user: { select: { profile: { select: { displayName: true } } } },
      },
    });

    // Increment volunteer case load
    await prisma.volunteer.update({
      where: { id: volunteerId },
      data: { currentCaseLoad: { increment: 1 } },
    });

    logger.info(
      { matchId, volunteerId },
      'Match accepted by volunteer'
    );

    return this.formatMatch(updated);
  }

  /**
   * Pause a match
   */
  async pauseMatch(
    matchId: string,
    userId: string,
    input: PauseMatchInput
  ): Promise<void> {
    const match = await prisma.peerSupportMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new Error('Match not found');
    }

    // Allow either volunteer or user to pause
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: match.volunteerId },
    });

    if (volunteer?.userId !== userId && match.userId !== userId) {
      throw new Error('Not authorized to pause this match');
    }

    await prisma.peerSupportMatch.update({
      where: { id: matchId },
      data: { status: 'paused' as any },
    });

    logger.info({ matchId, userId }, 'Match paused');
  }

  /**
   * End a match
   */
  async endMatch(
    matchId: string,
    userId: string,
    input: EndMatchInput
  ): Promise<void> {
    const match = await prisma.peerSupportMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new Error('Match not found');
    }

    // Verify authorization
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: match.volunteerId },
    });

    if (volunteer?.userId !== userId && match.userId !== userId) {
      throw new Error('Not authorized to end this match');
    }

    // Update match
    await prisma.peerSupportMatch.update({
      where: { id: matchId },
      data: {
        status: 'completed' as any,
        endedAt: new Date(),
        endReason: input.reason,
      },
    });

    // Decrement volunteer case load
    if (volunteer) {
      await prisma.volunteer.update({
        where: { id: volunteer.id },
        data: { currentCaseLoad: { decrement: 1 } },
      });
    }

    logger.info({ matchId, reason: input.reason }, 'Match ended');
  }

  /**
   * Get match details with full context
   */
  async getMatchDetails(matchId: string, userId: string): Promise<any> {
    const match = await prisma.peerSupportMatch.findUnique({
      where: { id: matchId },
      include: {
        volunteer: {
          include: {
            user: { select: { email: true, profile: true } },
            certifications: { where: { isApproved: true } },
          },
        },
        user: { select: { profile: true, email: true } },
        sessions: { orderBy: { createdAt: 'desc' }, take: 10 },
        escalations: { orderBy: { escalatedAt: 'desc' }, take: 5 },
      },
    });

    if (!match) {
      throw new Error('Match not found');
    }

    // Verify access
    if (match.volunteer.userId !== userId && match.userId !== userId) {
      throw new Error('Unauthorized access');
    }

    return this.formatMatchDetails(match);
  }

  /**
   * Rate volunteer (user perspective)
   */
  async rateVolunteer(
    matchId: string,
    userId: string,
    input: SessionReflectionInput
  ): Promise<void> {
    const match = await prisma.peerSupportMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new Error('Match not found');
    }

    if (match.userId !== userId) {
      throw new Error('Only user can rate their volunteer');
    }

    // Update match with satisfaction rating
    await prisma.peerSupportMatch.update({
      where: { id: matchId },
      data: {
        userSatisfaction: input.satisfaction || null,
      },
    });

    logger.info(
      { matchId, satisfaction: input.satisfaction },
      'Volunteer rated'
    );
  }

  /**
   * Get upcoming matches for volunteer
   */
  async getUpcomingMatches(volunteerId: string): Promise<any[]> {
    const matches = await prisma.peerSupportMatch.findMany({
      where: {
        volunteerId,
        status: { in: ['pending_acceptance', 'active'] },
      },
      include: {
        user: {
          select: {
            id: true,
            profile: { select: { displayName: true, avatar: true } },
          },
        },
        sessions: { orderBy: { sessionDate: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'asc' },
    });

    return matches.map((m) => ({
      id: m.id,
      userId: m.user.id,
      userName: m.user.profile?.displayName,
      userAvatar: m.user.profile?.avatar,
      status: m.status,
      startedAt: m.startedAt,
      lastSession: m.sessions[0]?.createdAt,
      sessionsCompleted: m.sessionsCompleted,
    }));
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private calculateMatchScore(volunteer: any, preferences: any): number {
    let score = 100;

    // Specialty overlap scoring
    if (preferences.specialties?.length) {
      const overlaps = volunteer.specialties.filter((s: string) =>
        preferences.specialties!.includes(s)
      ).length;
      score += overlaps * 50;
    }

    // Language bonus
    if (preferences.languages?.length) {
      if (volunteer.languages.some((l: string) => preferences.languages!.includes(l))) {
        score += 30;
      }
    }

    // Timezone bonus
    if (preferences.timezone && volunteer.timezone === preferences.timezone) {
      score += 25;
    }

    // Availability bonus
    const hasAvailability = volunteer.availability?.some((a: any) => a.isActive);
    if (hasAvailability) {
      score += 20;
    }

    // Certification level bonus
    const certLevelMap = { basic: 10, intermediate: 20, advanced: 30, specialist: 40 };
    score += certLevelMap[volunteer.certificationLevel as keyof typeof certLevelMap] || 0;

    return score;
  }

  private formatMatch(match: any): any {
    return {
      id: match.id,
      volunteerId: match.volunteerId,
      volunteerName: match.volunteer?.user?.profile?.displayName,
      volunteerAvatar: match.volunteer?.user?.profile?.avatar,
      userId: match.userId,
      userName: match.user?.profile?.displayName,
      status: match.status,
      createdAt: match.createdAt,
      startedAt: match.startedAt,
      sessionsCompleted: match.sessionsCompleted,
    };
  }

  private formatMatchDetails(match: any): any {
    return {
      id: match.id,
      status: match.status,
      volunteer: {
        id: match.volunteer.id,
        displayName: match.volunteer.user?.profile?.displayName,
        email: match.volunteer.user?.email,
        avatar: match.volunteer.user?.profile?.avatar,
        bio: match.volunteer.bio,
        specialties: match.volunteer.specialties,
        languages: match.volunteer.languages,
        certifications: match.volunteer.certifications.map((c: any) => c.type),
      },
      user: {
        displayName: match.user?.profile?.displayName,
        email: match.user?.email,
      },
      statistics: {
        sessionsCompleted: match.sessionsCompleted,
        userSatisfaction: match.userSatisfaction,
        lastSessionAt: match.lastSessionAt,
      },
      recentSessions: match.sessions.slice(0, 5).map((s: any) => ({
        date: s.sessionDate,
        duration: s.duration,
        outcome: s.outcome,
      })),
      activeEscalations: match.escalations.filter((e: any) => e.status !== 'resolved').length,
    };
  }
}

export const matchingService = new MatchingService();
