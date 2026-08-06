import prisma from '@/database/client';
import { logger } from '@/config/logger';

export class VolunteerService {
  /**
   * Create volunteer profile
   */
  async createVolunteerProfile(data: {
    userId: string;
    bio?: string;
    languages?: string[];
    supportTopics?: string[];
    availability?: string;
  }) {
    const profile = await prisma.volunteer.create({
      data: {
        userId: data.userId,
        bio: data.bio,
        languages: data.languages || ['en'],
        supportTopics: data.supportTopics || [],
        availability: data.availability,
        isActive: false, // Requires approval
        verifiedAt: null,
      },
    });

    logger.info({ volunteerId: profile.id, userId: data.userId }, 'Volunteer profile created');
    return profile;
  }

  /**
   * Get pending volunteer applications
   */
  async getPendingApplications(limit: number = 50, offset: number = 0) {
    return prisma.volunteer.findMany({
      where: { verifiedAt: null },
      take: limit,
      skip: offset,
      include: {
        user: {
          include: { profile: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Approve volunteer
   */
  async approveVolunteer(volunteerId: string, approvedBy?: string) {
    const volunteer = await prisma.volunteer.update({
      where: { id: volunteerId },
      data: {
        isActive: true,
        verifiedAt: new Date(),
      },
    });

    logger.info(
      { volunteerId, approvedBy },
      'Volunteer approved',
    );

    return volunteer;
  }

  /**
   * Get active volunteers
   */
  async getActiveVolunteers() {
    return prisma.volunteer.findMany({
      where: { isActive: true, verifiedAt: { not: null } },
      include: {
        user: {
          include: { profile: true },
        },
        certifications: true,
      },
    });
  }

  /**
   * Match volunteer with peer
   */
  async matchVolunteerWithPeer(volunteerId: string, peerId: string, topic: string) {
    const match = await prisma.peerSupportMatch.create({
      data: {
        volunteerId,
        peerId,
        topic,
        startedAt: new Date(),
      },
    });

    logger.info(
      { volunteerId, peerId, topic },
      'Peer support match created',
    );

    return match;
  }

  /**
   * End peer support match
   */
  async endMatch(matchId: string) {
    return prisma.peerSupportMatch.update({
      where: { id: matchId },
      data: { endedAt: new Date() },
    });
  }

  /**
   * Get volunteer's active matches
   */
  async getVolunteerMatches(volunteerId: string) {
    return prisma.peerSupportMatch.findMany({
      where: {
        volunteerId,
        endedAt: null,
      },
      include: {
        peer: {
          include: { profile: true },
        },
      },
    });
  }

  /**
   * Log support session
   */
  async logSession(data: {
    matchId: string;
    duration: number; // in minutes
    notes?: string;
    peerId: string;
  }) {
    const match = await prisma.peerSupportMatch.findUnique({
      where: { id: data.matchId },
    });

    if (!match) {
      throw new Error('Match not found');
    }

    logger.info(
      { matchId: data.matchId, duration: data.duration },
      'Support session logged',
    );

    // In production, would create a SupportSession model
    return { success: true, sessionDuration: data.duration };
  }

  /**
   * Get volunteer statistics
   */
  async getVolunteerStats(volunteerId: string) {
    const matches = await prisma.peerSupportMatch.findMany({
      where: { volunteerId },
    });

    const completedMatches = matches.filter(m => m.endedAt);
    const activeMatches = matches.filter(m => !m.endedAt);
    const totalSessions = completedMatches.length + activeMatches.length;

    return {
      totalMatches: totalSessions,
      activeMatches: activeMatches.length,
      completedMatches: completedMatches.length,
      joinedAt: (await prisma.volunteer.findUnique({ where: { id: volunteerId } }))?.createdAt,
    };
  }

  /**
   * Request volunteer escalation
   */
  async escalateToSupervisor(matchId: string, reason: string) {
    const escalation = await prisma.peerSupportEscalation.create({
      data: {
        matchId,
        reason,
        status: 'pending',
      },
    });

    logger.info(
      { matchId, reason },
      'Support escalated to supervisor',
    );

    return escalation;
  }

  /**
   * Resolve escalation
   */
  async resolveEscalation(escalationId: string, resolution: string, supervisorId?: string) {
    return prisma.peerSupportEscalation.update({
      where: { id: escalationId },
      data: {
        status: 'resolved',
        resolution,
        resolvedAt: new Date(),
      },
    });
  }
}

export const volunteerService = new VolunteerService();
