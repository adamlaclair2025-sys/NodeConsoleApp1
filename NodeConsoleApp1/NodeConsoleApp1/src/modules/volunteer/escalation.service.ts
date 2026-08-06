import { prisma } from '@/database/client';
import { logger } from '@/config/logger';
import { EscalationReason, EscalationStatus } from '@prisma/client';
import { EscalateMatchInput, ReportIncidentInput } from './schemas';

export class EscalationService {
  /**
   * Escalate a match to supervisor
   */
  async escalateMatch(
    matchId: string,
    userId: string,
    input: EscalateMatchInput
  ): Promise<any> {
    const match = await prisma.peerSupportMatch.findUnique({
      where: { id: matchId },
      include: { volunteer: { include: { supervisor: true } } },
    });

    if (!match) throw new Error('Match not found');

    // Verify authorization
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: match.volunteerId },
    });

    if (volunteer?.userId !== userId && match.userId !== userId) {
      throw new Error('Not authorized to escalate');
    }

    // Create escalation record
    const escalation = await prisma.peerSupportEscalation.create({
      data: {
        matchId,
        reason: input.reason as EscalationReason,
        description: input.description,
        escalatedBy: userId,
        escalatedTo: match.volunteer.supervisor?.supervisorUserId,
        status: 'pending_review' as EscalationStatus,
      },
    });

    // Update match status if critical
    if (input.urgency === 'critical') {
      await prisma.peerSupportMatch.update({
        where: { id: matchId },
        data: { status: 'escalated' as any },
      });
    }

    logger.info(
      { matchId, reason: input.reason, urgency: input.urgency },
      'Match escalated'
    );

    return {
      id: escalation.id,
      status: escalation.status,
      escalatedAt: escalation.escalatedAt,
    };
  }

  /**
   * Handle crisis indicators in session
   */
  async handleCrisisIndicators(matchId: string, sessionId: string): Promise<any> {
    const session = await prisma.peerSupportSession.findUnique({
      where: { id: sessionId },
      include: { match: { include: { volunteer: { include: { supervisor: true } } } } },
    });

    if (!session) throw new Error('Session not found');

    if (!session.crisisIndicators) {
      return { message: 'No crisis indicators detected' };
    }

    // Escalate to supervisor automatically
    const escalation = await prisma.peerSupportEscalation.create({
      data: {
        matchId,
        reason: 'crisis_indicators' as EscalationReason,
        description: `Crisis indicators detected in session ${sessionId}`,
        escalatedBy: 'system',
        escalatedTo: session.match.volunteer.supervisor?.supervisorUserId,
        status: 'in_progress' as EscalationStatus,
      },
    });

    logger.error({ matchId, sessionId }, 'Crisis indicators escalated');

    return {
      id: escalation.id,
      status: escalation.status,
      action: 'Escalated to supervisor for immediate review',
    };
  }

  /**
   * Escalate to supervisor
   */
  async escalateToSupervisor(
    escalationId: string,
    action: 'approved' | 'escalated',
    notes?: string
  ): Promise<void> {
    const escalation = await prisma.peerSupportEscalation.findUnique({
      where: { id: escalationId },
    });

    if (!escalation) throw new Error('Escalation not found');

    await prisma.peerSupportEscalation.update({
      where: { id: escalationId },
      data: {
        status: action === 'escalated' ? 'in_progress' : 'resolved',
        resolution: notes,
        resolvedAt: new Date(),
      },
    });

    logger.info({ escalationId, action }, 'Escalation handled by supervisor');
  }

  /**
   * Escalate to clinical team
   */
  async escalateToClinical(
    escalationId: string,
    reason: string,
    clinicalNotes?: string
  ): Promise<void> {
    const escalation = await prisma.peerSupportEscalation.findUnique({
      where: { id: escalationId },
      include: { match: { select: { userId: true } } },
    });

    if (!escalation) throw new Error('Escalation not found');

    await prisma.peerSupportEscalation.update({
      where: { id: escalationId },
      data: {
        status: 'in_progress' as EscalationStatus,
        resolution: clinicalNotes,
      },
    });

    logger.warn(
      { escalationId, userId: escalation.match.userId, reason },
      'Escalated to clinical team'
    );

    // TODO: Notify clinical team via notification system
  }

  /**
   * Escalate to emergency services
   */
  async escalateToEmergency(
    matchId: string,
    userId: string,
    crisisData: any
  ): Promise<any> {
    const match = await prisma.peerSupportMatch.findUnique({
      where: { id: matchId },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!match) throw new Error('Match not found');

    if (match.userId !== userId && match.user.id !== userId) {
      throw new Error('Not authorized');
    }

    // Create escalation
    const escalation = await prisma.peerSupportEscalation.create({
      data: {
        matchId,
        reason: 'crisis_indicators' as EscalationReason,
        description: `Emergency escalation: ${crisisData.reason}`,
        escalatedBy: userId,
        status: 'in_progress' as EscalationStatus,
      },
    });

    logger.error(
      { matchId, userId: match.user.id, reason: crisisData.reason },
      'Escalated to emergency services'
    );

    return {
      id: escalation.id,
      message: 'Emergency services have been notified',
      emergencySupportResources: this.getEmergencyResources(),
    };
  }

  /**
   * Track escalation details
   */
  async trackEscalation(escalationId: string): Promise<any> {
    const escalation = await prisma.peerSupportEscalation.findUnique({
      where: { id: escalationId },
      include: {
        match: {
          select: {
            id: true,
            userId: true,
            volunteerId: true,
            status: true,
            user: { select: { profile: { select: { displayName: true } } } },
            volunteer: { select: { user: { select: { profile: { select: { displayName: true } } } } } },
          },
        },
      },
    });

    if (!escalation) throw new Error('Escalation not found');

    return {
      id: escalation.id,
      reason: escalation.reason,
      status: escalation.status,
      escalatedAt: escalation.escalatedAt,
      escalatedBy: escalation.escalatedBy,
      description: escalation.description,
      match: {
        id: escalation.match.id,
        user: escalation.match.user?.profile?.displayName,
        volunteer: escalation.match.volunteer.user?.profile?.displayName,
      },
      timeline: {
        created: escalation.escalatedAt,
        resolved: escalation.resolvedAt,
        duration: escalation.resolvedAt
          ? `${Math.round((escalation.resolvedAt.getTime() - escalation.escalatedAt.getTime()) / 60000)} minutes`
          : 'Ongoing',
      },
      resolution: escalation.resolution,
    };
  }

  /**
   * Resolve escalation
   */
  async resolveEscalation(
    escalationId: string,
    supervisorId: string,
    resolution: string
  ): Promise<void> {
    const escalation = await prisma.peerSupportEscalation.findUnique({
      where: { id: escalationId },
      include: { match: { include: { volunteer: { include: { supervisor: true } } } } },
    });

    if (!escalation) throw new Error('Escalation not found');

    // Verify supervisor has permission
    if (escalation.match.volunteer.supervisor?.supervisorUserId !== supervisorId) {
      throw new Error('Not authorized to resolve');
    }

    await prisma.peerSupportEscalation.update({
      where: { id: escalationId },
      data: {
        status: 'closed' as EscalationStatus,
        resolution,
        resolvedAt: new Date(),
      },
    });

    logger.info({ escalationId }, 'Escalation resolved');
  }

  /**
   * Report incident during peer support
   */
  async reportIncident(
    matchId: string,
    userId: string,
    input: ReportIncidentInput
  ): Promise<any> {
    const match = await prisma.peerSupportMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) throw new Error('Match not found');

    // Create incident record
    const incident = await prisma.peerSupportIncident.create({
      data: {
        matchId,
        volunteerId: match.volunteerId,
        incidentType: input.incidentType as any,
        description: input.description,
        severity: input.severity as any,
        reportedBy: userId,
      },
    });

    // Auto-escalate if critical/serious
    if (input.severity === 'serious' || input.severity === 'critical') {
      await this.escalateMatch(matchId, userId, {
        reason: 'incident_report' as any,
        description: `Incident reported: ${input.incidentType}`,
      });
    }

    logger.warn(
      { matchId, incidentType: input.incidentType, severity: input.severity },
      'Incident reported'
    );

    return {
      id: incident.id,
      status: input.severity === 'critical' ? 'escalated' : 'reported',
      reportedAt: incident.reportedAt,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private getEmergencyResources(): any[] {
    return [
      {
        name: '988 Suicide & Crisis Lifeline',
        phone: '988',
        type: 'Phone',
        available: '24/7',
      },
      {
        name: 'Crisis Text Line',
        method: 'Text HOME to 741741',
        type: 'Text',
        available: '24/7',
      },
      {
        name: 'Emergency Services',
        phone: '911',
        type: 'Phone',
        note: 'For immediate danger',
      },
    ];
  }
}

export const escalationService = new EscalationService();
