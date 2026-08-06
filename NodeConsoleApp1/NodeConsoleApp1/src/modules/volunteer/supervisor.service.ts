import { prisma } from '@/database/client';
import { logger } from '@/config/logger';
import {
  AssignSupervisionInput,
  ApproveCertificationInput,
} from './schemas';

export class SupervisorService {
  /**
   * Assign supervisor to volunteer
   */
  async assignSupervisor(
    volunteerId: string,
    input: AssignSupervisionInput
  ): Promise<any> {
    logger.info(
      { volunteerId, supervisorId: input.supervisorUserId },
      'Assigning supervisor to volunteer'
    );

    // Check supervisor exists and has permission
    const supervisor = await prisma.user.findUnique({
      where: { id: input.supervisorUserId },
      include: { roles: true },
    });

    if (!supervisor) {
      throw new Error('Supervisor not found');
    }

    // Verify supervisor has supervisor role or higher
    const hasSupervisorRole = supervisor.roles.some(
      (r: any) => r.role === 'supervisor' || r.role === 'admin'
    );

    if (!hasSupervisorRole) {
      throw new Error('User does not have supervisor permissions');
    }

    // Create or update supervisor assignment
    const assignment = await prisma.volunteerSupervisor.upsert({
      where: { volunteerId },
      update: {
        supervisorUserId: input.supervisorUserId,
        caseLoadLimit: input.caseLoadLimit,
      },
      create: {
        volunteerId,
        supervisorUserId: input.supervisorUserId,
        caseLoadLimit: input.caseLoadLimit,
      },
    });

    logger.info(
      { supervisorAssignmentId: assignment.id },
      'Supervisor assigned'
    );

    return {
      id: assignment.id,
      volunteerId,
      supervisorId: assignment.supervisorUserId,
      caseLoadLimit: assignment.caseLoadLimit,
      assignedAt: assignment.assignedAt,
    };
  }

  /**
   * Approve or reject certification
   */
  async approveCertification(
    certificationId: string,
    supervisorId: string,
    input: ApproveCertificationInput
  ): Promise<any> {
    const cert = await prisma.volunteerCertification.findUnique({
      where: { id: certificationId },
      include: { volunteer: { include: { supervisor: true } } },
    });

    if (!cert) {
      throw new Error('Certification not found');
    }

    // Verify supervisor has permission
    if (cert.volunteer.supervisor?.supervisorUserId !== supervisorId) {
      throw new Error('Not authorized to review this certification');
    }

    // Update certification
    const updated = await prisma.volunteerCertification.update({
      where: { id: certificationId },
      data: {
        isApproved: input.approved,
        supervisorReviewedBy: supervisorId,
        supervisorReviewedAt: new Date(),
        reviewNotes: input.reviewNotes,
      },
    });

    // If approved, update volunteer certification level
    if (input.approved) {
      await this.updateVolunteerCertificationLevel(cert.volunteerId);
    }

    logger.info(
      { certificationId, approved: input.approved },
      'Certification reviewed'
    );

    return {
      id: updated.id,
      type: updated.type,
      approved: updated.isApproved,
      reviewedAt: updated.supervisorReviewedAt,
    };
  }

  /**
   * Get supervisor dashboard
   */
  async getSupervisorDashboard(supervisorId: string): Promise<any> {
    // Get assigned volunteers
    const assignments = await prisma.volunteerSupervisor.findMany({
      where: { supervisorUserId: supervisorId },
      include: {
        volunteer: {
          include: {
            user: { select: { profile: { select: { displayName: true } } } },
            peerSupportMatches: {
              where: { status: 'active' },
              select: { id: true },
            },
            certifications: {
              where: { isApproved: false },
              select: { id: true, type: true },
            },
            wellnessCheckIns: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { emotionalStatus: true, burnoutRiskScore: true },
            },
          },
        },
      },
    });

    // Get escalations needing review
    const escalations = await prisma.peerSupportEscalation.findMany({
      where: {
        match: {
          volunteer: {
            supervisor: { supervisorUserId },
          },
        },
        status: { in: ['pending_review', 'in_progress'] },
      },
      include: {
        match: {
          select: {
            userId: true,
            user: { select: { profile: { select: { displayName: true } } } },
            volunteer: { select: { user: { select: { profile: { select: { displayName: true } } } } } },
          },
        },
      },
      orderBy: { escalatedAt: 'desc' },
      take: 10,
    });

    // Get incidents needing investigation
    const incidents = await prisma.peerSupportIncident.findMany({
      where: {
        volunteer: {
          supervisor: { supervisorUserId },
        },
        resolved: false,
      },
      include: {
        match: { select: { userId: true, user: { select: { profile: { select: { displayName: true } } } } } },
        volunteer: { select: { user: { select: { profile: { select: { displayName: true } } } } } },
      },
      orderBy: { reportedAt: 'desc' },
      take: 10,
    });

    // Calculate metrics
    const totalVolunteers = assignments.length;
    const activeMatches = assignments.reduce(
      (sum, a) => sum + a.volunteer.peerSupportMatches.length,
      0
    );
    const pendingCertifications = assignments.reduce(
      (sum, a) => sum + a.volunteer.certifications.length,
      0
    );
    const volunteerAtRisk = assignments.filter((a) =>
      a.volunteer.wellnessCheckIns[0]?.burnoutRiskScore >= 70
    ).length;

    return {
      summary: {
        totalVolunteers,
        activeMatches,
        pendingCertifications,
        volunteersAtRisk: volunteerAtRisk,
        escalationsPending: escalations.length,
        incidentsPending: incidents.length,
      },
      volunteers: assignments.map((a) => ({
        id: a.volunteer.id,
        displayName: a.volunteer.user?.profile?.displayName,
        status: a.volunteer.status,
        activeMatches: a.volunteer.peerSupportMatches.length,
        caseLoadLimit: a.caseLoadLimit,
        pendingCertifications: a.volunteer.certifications.length,
        wellnessStatus: a.volunteer.wellnessCheckIns[0]?.emotionalStatus || 'unknown',
        burnoutRisk: a.volunteer.wellnessCheckIns[0]?.burnoutRiskScore || 0,
      })),
      escalations: escalations.map((e) => ({
        id: e.id,
        reason: e.reason,
        volunteerId: e.match.volunteer.user?.profile?.displayName,
        userId: e.match.user?.profile?.displayName,
        status: e.status,
        escalatedAt: e.escalatedAt,
      })),
      incidents: incidents.map((i) => ({
        id: i.id,
        type: i.incidentType,
        severity: i.severity,
        volunteerId: i.volunteer.user?.profile?.displayName,
        userId: i.match.user?.profile?.displayName,
        reportedAt: i.reportedAt,
        resolved: i.resolved,
      })),
    };
  }

  /**
   * Review escalation and decide action
   */
  async reviewEscalation(
    escalationId: string,
    supervisorId: string,
    action: 'approved' | 'rejected' | 'escalated',
    resolution?: string
  ): Promise<void> {
    const escalation = await prisma.peerSupportEscalation.findUnique({
      where: { id: escalationId },
      include: {
        match: {
          include: { volunteer: { include: { supervisor: true } } },
        },
      },
    });

    if (!escalation) {
      throw new Error('Escalation not found');
    }

    // Verify supervisor has permission
    if (escalation.match.volunteer.supervisor?.supervisorUserId !== supervisorId) {
      throw new Error('Not authorized to review this escalation');
    }

    // Update escalation
    await prisma.peerSupportEscalation.update({
      where: { id: escalationId },
      data: {
        status: action === 'escalated' ? 'in_progress' : 'resolved',
        resolution,
        resolvedAt: new Date(),
      },
    });

    if (action === 'escalated') {
      // Create higher-level escalation
      logger.info({ escalationId }, 'Escalation escalated to clinical team');
    }

    logger.info(
      { escalationId, action },
      'Escalation reviewed'
    );
  }

  /**
   * Monitor volunteer health and detect risks
   */
  async monitorVolunteerHealth(volunteerId: string): Promise<any> {
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: volunteerId },
      include: {
        wellnessCheckIns: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
        peerSupportMatches: {
          where: { status: 'active' },
          select: { id: true, sessionsCompleted: true },
        },
      },
    });

    if (!volunteer) {
      throw new Error('Volunteer not found');
    }

    const latestCheckIn = volunteer.wellnessCheckIns[0];
    const previousCheckIn = volunteer.wellnessCheckIns[1];

    // Detect red flags
    const redFlags = [];

    if (latestCheckIn?.burnoutRiskScore >= 70) {
      redFlags.push('High burnout risk detected');
    }

    if (latestCheckIn?.emotionalStatus === 'overwhelmed' || latestCheckIn?.emotionalStatus === 'in_crisis') {
      redFlags.push('Volunteer in distress');
    }

    if (previousCheckIn && latestCheckIn?.burnoutRiskScore > previousCheckIn.burnoutRiskScore + 20) {
      redFlags.push('Burnout risk increasing rapidly');
    }

    if (volunteer.peerSupportMatches.length >= volunteer.maximumCaseLoad) {
      redFlags.push('At maximum case load');
    }

    return {
      volunteerId,
      status: volunteer.status,
      riskLevel: this.calculateRiskLevel(latestCheckIn?.burnoutRiskScore || 0),
      redFlags,
      latestCheckIn: latestCheckIn ? {
        date: latestCheckIn.createdAt,
        emotionalStatus: latestCheckIn.emotionalStatus,
        burnoutRiskScore: latestCheckIn.burnoutRiskScore,
        hoursWorked: latestCheckIn.hoursWorkedThisMonth,
      } : null,
      activeMatches: volunteer.peerSupportMatches.length,
      caseLoadUtilization: `${volunteer.peerSupportMatches.length}/${volunteer.maximumCaseLoad}`,
      recommendedActions: this.getRecommendedActions(redFlags),
    };
  }

  /**
   * Get incidents for volunteer
   */
  async getVolunteerIncidents(volunteerId: string, supervisorId: string): Promise<any> {
    // Verify supervisor has permission
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: volunteerId },
      include: { supervisor: true },
    });

    if (!volunteer || volunteer.supervisor?.supervisorUserId !== supervisorId) {
      throw new Error('Not authorized to view these incidents');
    }

    const incidents = await prisma.peerSupportIncident.findMany({
      where: { volunteerId },
      include: {
        match: {
          select: {
            userId: true,
            user: { select: { profile: { select: { displayName: true } } } },
          },
        },
      },
      orderBy: { reportedAt: 'desc' },
    });

    return incidents.map((i) => ({
      id: i.id,
      type: i.incidentType,
      severity: i.severity,
      userId: i.match.user?.profile?.displayName,
      description: i.description,
      reportedAt: i.reportedAt,
      reportedBy: i.reportedBy,
      resolved: i.resolved,
      resolvedAt: i.resolvedAt,
      action: i.action,
    }));
  }

  /**
   * Suspend volunteer
   */
  async suspendVolunteer(
    volunteerId: string,
    supervisorId: string,
    reason: string,
    notes?: string
  ): Promise<void> {
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: volunteerId },
      include: { supervisor: true },
    });

    if (!volunteer || volunteer.supervisor?.supervisorUserId !== supervisorId) {
      throw new Error('Not authorized to suspend this volunteer');
    }

    // Update volunteer status
    await prisma.volunteer.update({
      where: { id: volunteerId },
      data: {
        status: 'suspended',
        inactiveAt: new Date(),
      },
    });

    // End all active matches
    await prisma.peerSupportMatch.updateMany({
      where: { volunteerId, status: 'active' },
      data: {
        status: 'terminated',
        endedAt: new Date(),
        endReason: `Volunteer suspended: ${reason}`,
      },
    });

    logger.warn(
      { volunteerId, supervisorId, reason },
      'Volunteer suspended'
    );
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async updateVolunteerCertificationLevel(volunteerId: string): Promise<void> {
    const certs = await prisma.volunteerCertification.findMany({
      where: {
        volunteerId,
        isApproved: true,
        expiresAt: { gt: new Date() },
      },
    });

    let level: any = 'none';
    if (certs.length >= 5) {
      level = 'specialist';
    } else if (certs.length >= 4) {
      level = 'advanced';
    } else if (certs.length >= 2) {
      level = 'intermediate';
    } else if (certs.length >= 1) {
      level = 'basic';
    }

    await prisma.volunteer.update({
      where: { id: volunteerId },
      data: { certificationLevel: level },
    });
  }

  private calculateRiskLevel(burnoutScore: number): string {
    if (burnoutScore >= 80) return 'critical';
    if (burnoutScore >= 60) return 'high';
    if (burnoutScore >= 40) return 'moderate';
    return 'low';
  }

  private getRecommendedActions(redFlags: string[]): string[] {
    const actions = [];

    if (redFlags.some((f) => f.includes('burnout'))) {
      actions.push('Schedule wellness check-in');
      actions.push('Consider temporary case load reduction');
    }

    if (redFlags.some((f) => f.includes('distress'))) {
      actions.push('Offer peer support resources');
      actions.push('Connect with mental health services');
    }

    if (redFlags.some((f) => f.includes('maximum'))) {
      actions.push('Do not assign new matches');
      actions.push('Redistribute load to other volunteers');
    }

    return actions;
  }
}

export const supervisorService = new SupervisorService();
