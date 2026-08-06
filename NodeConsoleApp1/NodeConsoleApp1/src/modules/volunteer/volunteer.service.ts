import { prisma } from '@/database/client';
import { logger } from '@/config/logger';
import { VolunteerStatus, VerificationStatus, CertificationLevel, BurnoutRisk } from '@prisma/client';
import {
  ApplyAsVolunteerInput,
  UpdateVolunteerProfileInput,
  CompleteTrainingInput,
  SetAvailabilityInput,
  SearchVolunteersInput,
  GetVolunteerStatsInput,
} from './schemas';

export class VolunteerService {
  /**
   * Apply to become a peer support volunteer
   */
  async applyAsVolunteer(
    userId: string,
    input: ApplyAsVolunteerInput
  ): Promise<any> {
    logger.info(
      { userId, specialties: input.specialties.length },
      'Processing volunteer application'
    );

    // Check if already a volunteer
    const existing = await prisma.volunteer.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new Error('User is already a volunteer or has pending application');
    }

    // Create volunteer record
    const volunteer = await prisma.volunteer.create({
      data: {
        userId,
        status: 'pending_verification',
        verificationStatus: 'pending_review',
        specialties: input.specialties,
        languages: input.languages,
        timezone: input.timezone,
        bio: input.bio,
        currentCaseLoad: 0,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    logger.info(
      { volunteerId: volunteer.id, userId },
      'Volunteer application created'
    );

    // Create audit log
    await this.logAudit(userId, 'volunteer_application_submitted', volunteer.id);

    return this.formatVolunteer(volunteer);
  }

  /**
   * Get volunteer profile
   */
  async getVolunteerProfile(userId: string): Promise<any> {
    const volunteer = await prisma.volunteer.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatar: true,
              },
            },
          },
        },
        certifications: {
          where: { isApproved: true },
          orderBy: { expiresAt: 'desc' },
          take: 5,
        },
        availability: {
          where: { isActive: true },
          orderBy: { dayOfWeek: 'asc' },
        },
        supervisor: true,
        peerSupportMatches: {
          where: { status: 'active' },
          select: { id: true },
        },
      },
    });

    if (!volunteer) {
      throw new Error('Volunteer profile not found');
    }

    return this.formatVolunteerWithDetails(volunteer);
  }

  /**
   * Update volunteer profile
   */
  async updateVolunteerProfile(
    userId: string,
    input: UpdateVolunteerProfileInput
  ): Promise<any> {
    const volunteer = await prisma.volunteer.update({
      where: { userId },
      data: {
        bio: input.bio,
        specialties: input.specialties,
        languages: input.languages,
        timezone: input.timezone,
        maximumCaseLoad: input.maximumCaseLoad,
      },
      include: {
        certifications: true,
        availability: true,
      },
    });

    logger.info(
      { volunteerId: volunteer.id },
      'Volunteer profile updated'
    );

    return this.formatVolunteer(volunteer);
  }

  /**
   * Complete training and add certification
   */
  async completeTraining(
    userId: string,
    input: CompleteTrainingInput
  ): Promise<any> {
    const volunteer = await prisma.volunteer.findUnique({
      where: { userId },
    });

    if (!volunteer) {
      throw new Error('Volunteer not found');
    }

    // Check if already has this certification
    const existing = await prisma.volunteerCertification.findFirst({
      where: {
        volunteerId: volunteer.id,
        type: input.trainingType,
        isApproved: true,
      },
    });

    if (existing && !this.isCertificationExpired(existing.expiresAt)) {
      throw new Error(`Already has active ${input.trainingType} certification`);
    }

    // Create certification
    const certification = await prisma.volunteerCertification.create({
      data: {
        volunteerId: volunteer.id,
        type: input.trainingType,
        completedAt: input.completedDate,
        expiresAt: input.expirationDate,
        description: input.notes,
      },
    });

    logger.info(
      { volunteerId: volunteer.id, certificationId: certification.id },
      'Training completed, awaiting supervisor review'
    );

    return {
      id: certification.id,
      type: certification.type,
      completedAt: certification.completedAt,
      expiresAt: certification.expiresAt,
      status: 'pending_review',
    };
  }

  /**
   * Set volunteer availability
   */
  async setAvailability(
    userId: string,
    availability: SetAvailabilityInput[]
  ): Promise<any> {
    const volunteer = await prisma.volunteer.findUnique({
      where: { userId },
    });

    if (!volunteer) {
      throw new Error('Volunteer not found');
    }

    // Clear existing availability
    await prisma.volunteerAvailability.deleteMany({
      where: { volunteerId: volunteer.id },
    });

    // Add new availability slots
    const slots = await prisma.volunteerAvailability.createMany({
      data: availability.map((slot) => ({
        volunteerId: volunteer.id,
        ...slot,
      })),
    });

    logger.info(
      { volunteerId: volunteer.id, slotCount: slots.count },
      'Volunteer availability updated'
    );

    return {
      message: 'Availability updated',
      slotsCreated: slots.count,
    };
  }

  /**
   * Search volunteers by specialties and languages
   */
  async searchVolunteers(input: SearchVolunteersInput): Promise<any> {
    const where: any = {
      status: 'active',
      verificationStatus: 'verified',
      isActive: true,
    };

    // Filter by specialties (array overlap)
    if (input.specialties && input.specialties.length > 0) {
      where.specialties = { hasSome: input.specialties };
    }

    // Filter by languages
    if (input.languages && input.languages.length > 0) {
      where.languages = { hasSome: input.languages };
    }

    // Filter by timezone
    if (input.timezone) {
      where.timezone = input.timezone;
    }

    const volunteers = await prisma.volunteer.findMany({
      where,
      skip: input.offset,
      take: input.limit,
      include: {
        user: {
          select: {
            profile: {
              select: {
                displayName: true,
                avatar: true,
              },
            },
          },
        },
        availability: {
          where: { isActive: true },
        },
        certifications: {
          where: { isApproved: true },
          take: 3,
        },
        peerSupportMatches: {
          where: { status: 'active' },
          select: { id: true },
        },
      },
    });

    return volunteers.map((v) => ({
      id: v.id,
      displayName: v.user?.profile?.displayName,
      avatar: v.user?.profile?.avatar,
      specialties: v.specialties,
      languages: v.languages,
      timezone: v.timezone,
      bio: v.bio,
      currentCaseLoad: v.currentCaseLoad,
      maximumCaseLoad: v.maximumCaseLoad,
      availabilitySlots: v.availability.length,
      activeCertifications: v.certifications.length,
      activeMatches: v.peerSupportMatches.length,
      isAvailable: v.currentCaseLoad < v.maximumCaseLoad,
    }));
  }

  /**
   * Get volunteer statistics
   */
  async getVolunteerStats(userId: string, input: GetVolunteerStatsInput): Promise<any> {
    const volunteer = await prisma.volunteer.findUnique({
      where: { userId },
    });

    if (!volunteer) {
      throw new Error('Volunteer not found');
    }

    const periodStart = new Date(Date.now() - input.periodDays * 24 * 60 * 60 * 1000);

    // Get session stats
    const sessions = await prisma.peerSupportSession.findMany({
      where: {
        match: { volunteerId: volunteer.id },
        createdAt: { gte: periodStart },
      },
    });

    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
    const escalatedSessions = sessions.filter((s) => s.escalated).length;

    // Get match stats
    const matches = await prisma.peerSupportMatch.findMany({
      where: { volunteerId: volunteer.id },
    });

    const activeMatches = matches.filter((m) => m.status === 'active').length;
    const completedMatches = matches.filter((m) => m.status === 'completed').length;

    // Get wellness stats
    const latestCheckIn = await prisma.volunteerWellnessCheckIn.findFirst({
      where: { volunteerId: volunteer.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      volunteerId: volunteer.id,
      period: `Last ${input.periodDays} days`,
      sessions: {
        total: sessions.length,
        totalMinutes,
        escalated: escalatedSessions,
        averageDuration: sessions.length > 0 ? Math.round(totalMinutes / sessions.length) : 0,
      },
      matches: {
        active: activeMatches,
        completed: completedMatches,
        total: matches.length,
      },
      wellness: {
        emotionalStatus: latestCheckIn?.emotionalStatus || 'unknown',
        burnoutRiskScore: latestCheckIn?.burnoutRiskScore || 0,
        lastCheckIn: latestCheckIn?.createdAt,
      },
      certification: {
        level: volunteer.certificationLevel,
        count: await prisma.volunteerCertification.count({
          where: {
            volunteerId: volunteer.id,
            isApproved: true,
            expiresAt: { gt: new Date() },
          },
        }),
      },
    };
  }

  /**
   * Get volunteer's active matches
   */
  async getVolunteerMatches(userId: string, status?: string): Promise<any> {
    const volunteer = await prisma.volunteer.findUnique({
      where: { userId },
    });

    if (!volunteer) {
      throw new Error('Volunteer not found');
    }

    const matches = await prisma.peerSupportMatch.findMany({
      where: {
        volunteerId: volunteer.id,
        status: status as any,
      },
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: {
                displayName: true,
                avatar: true,
              },
            },
          },
        },
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return matches.map((m) => ({
      id: m.id,
      userId: m.user.id,
      userDisplayName: m.user.profile?.displayName,
      userAvatar: m.user.profile?.avatar,
      status: m.status,
      sessionsCompleted: m.sessionsCompleted,
      lastSessionAt: m.sessions[0]?.createdAt,
      userSatisfaction: m.userSatisfaction,
      notes: m.notes,
      createdAt: m.createdAt,
    }));
  }

  /**
   * Get approved certifications
   */
  async getActiveCertifications(userId: string): Promise<any> {
    const volunteer = await prisma.volunteer.findUnique({
      where: { userId },
    });

    if (!volunteer) {
      throw new Error('Volunteer not found');
    }

    const certs = await prisma.volunteerCertification.findMany({
      where: {
        volunteerId: volunteer.id,
        isApproved: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: 'asc' },
    });

    return certs.map((c) => ({
      id: c.id,
      type: c.type,
      completedAt: c.completedAt,
      expiresAt: c.expiresAt,
      daysUntilExpiration: Math.ceil(
        (c.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
    }));
  }

  /**
   * Verify volunteer (admin/supervisor only)
   */
  async verifyVolunteer(volunteerId: string): Promise<void> {
    await prisma.volunteer.update({
      where: { id: volunteerId },
      data: {
        verificationStatus: 'verified',
        verificationDate: new Date(),
      },
    });

    logger.info({ volunteerId }, 'Volunteer verified');
  }

  /**
   * Update volunteer status
   */
  async updateVolunteerStatus(volunteerId: string, status: VolunteerStatus): Promise<void> {
    await prisma.volunteer.update({
      where: { id: volunteerId },
      data: {
        status,
        inactiveAt: status === 'inactive' ? new Date() : null,
      },
    });

    logger.info({ volunteerId, status }, 'Volunteer status updated');
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private formatVolunteer(volunteer: any): any {
    return {
      id: volunteer.id,
      userId: volunteer.userId,
      displayName: volunteer.user?.profile?.displayName,
      email: volunteer.user?.email,
      avatar: volunteer.user?.profile?.avatar,
      status: volunteer.status,
      verificationStatus: volunteer.verificationStatus,
      specialties: volunteer.specialties,
      languages: volunteer.languages,
      timezone: volunteer.timezone,
      bio: volunteer.bio,
      currentCaseLoad: volunteer.currentCaseLoad,
      maximumCaseLoad: volunteer.maximumCaseLoad,
      applicationDate: volunteer.applicationDate,
      verificationDate: volunteer.verificationDate,
    };
  }

  private formatVolunteerWithDetails(volunteer: any): any {
    return {
      ...this.formatVolunteer(volunteer),
      certifications: volunteer.certifications.map((c: any) => ({
        type: c.type,
        completedAt: c.completedAt,
        expiresAt: c.expiresAt,
      })),
      availability: volunteer.availability.map((a: any) => ({
        id: a.id,
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
      })),
      supervisor: volunteer.supervisor ? {
        supervisorUserId: volunteer.supervisor.supervisorUserId,
      } : null,
      activeMatches: volunteer.peerSupportMatches.length,
    };
  }

  private isCertificationExpired(expiresAt: Date): boolean {
    return expiresAt < new Date();
  }

  private async logAudit(userId: string, action: string, resourceId: string): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource: 'volunteer',
        resourceId,
        timestamp: new Date(),
      },
    }).catch((err) => logger.error(err, 'Failed to create audit log'));
  }
}

export const volunteerService = new VolunteerService();
