import { prisma } from '@/database/client';
import { logger } from '@/config/logger';
import { BurnoutRisk, EmotionalStatus } from '@prisma/client';
import { WellnessCheckInInput } from './schemas';

export class WellnessService {
  /**
   * Schedule wellness check-in for volunteer
   */
  async scheduleWellnessCheckIn(volunteerId: string): Promise<any> {
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: volunteerId },
    });

    if (!volunteer) {
      throw new Error('Volunteer not found');
    }

    // Check if already has pending check-in this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const existing = await prisma.volunteerWellnessCheckIn.findFirst({
      where: {
        volunteerId,
        createdAt: { gte: monthStart },
      },
    });

    if (existing) {
      return {
        message: 'Check-in already submitted this month',
        checkInDate: existing.createdAt,
      };
    }

    logger.info(
      { volunteerId },
      'Wellness check-in scheduled'
    );

    return {
      volunteerId,
      message: 'Please complete your monthly wellness check-in',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
    };
  }

  /**
   * Submit wellness check-in
   */
  async submitWellnessCheckIn(
    volunteerId: string,
    input: WellnessCheckInInput
  ): Promise<any> {
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: volunteerId },
    });

    if (!volunteer) {
      throw new Error('Volunteer not found');
    }

    // Create check-in record
    const checkIn = await prisma.volunteerWellnessCheckIn.create({
      data: {
        volunteerId,
        emotionalStatus: input.emotionalStatus as EmotionalStatus,
        burnoutRiskScore: input.burnoutRiskScore,
        hoursWorkedThisMonth: input.hoursWorkedThisMonth,
        supportUsed: input.supportUsed,
        notes: input.notes,
      },
    });

    // Assess burnout risk
    const riskLevel = this.assessBurnoutRisk(
      input.burnoutRiskScore,
      input.emotionalStatus
    );

    // Update volunteer burnout risk level
    await prisma.volunteer.update({
      where: { id: volunteerId },
      data: { burnoutRiskLevel: riskLevel },
    });

    // Create alerts for high risk
    if (riskLevel === 'high' || riskLevel === 'critical') {
      await this.createWellnessAlert(volunteerId, riskLevel);
    }

    logger.info(
      { volunteerId, riskLevel, burnoutScore: input.burnoutRiskScore },
      'Wellness check-in submitted'
    );

    return {
      id: checkIn.id,
      emotionalStatus: checkIn.emotionalStatus,
      burnoutRiskScore: checkIn.burnoutRiskScore,
      riskLevel,
      nextCheckInDue: this.getNextCheckInDate(),
    };
  }

  /**
   * Assess burnout risk based on check-in data
   */
  assessBurnoutRisk(burnoutScore: number, emotionalStatus: string): BurnoutRisk {
    // Burnout scoring matrix
    if (emotionalStatus === 'in_crisis' || burnoutScore >= 80) {
      return 'critical';
    }

    if (emotionalStatus === 'overwhelmed' || burnoutScore >= 60) {
      return 'high';
    }

    if (emotionalStatus === 'struggling' || burnoutScore >= 40) {
      return 'moderate';
    }

    return 'low';
  }

  /**
   * Recommend support for volunteer
   */
  async recommendSupport(volunteerId: string, checkInData: any): Promise<string[]> {
    const recommendations = [];

    // Based on emotional status
    if (checkInData.emotionalStatus === 'overwhelmed') {
      recommendations.push('Consider requesting a temporary break from active matches');
      recommendations.push('Schedule mental health check-up with your therapist');
      recommendations.push('Join volunteer peer support group');
    }

    if (checkInData.emotionalStatus === 'in_crisis') {
      recommendations.push('Reach out to crisis support hotline immediately');
      recommendations.push('Contact your supervisor for emergency support');
      recommendations.push('Consider medical leave');
    }

    // Based on burnout score
    if (checkInData.burnoutRiskScore >= 70) {
      recommendations.push('Reduce case load - focus on quality over quantity');
      recommendations.push('Take mandatory rest days/week');
      recommendations.push('Engage in self-care activities');
    }

    if (checkInData.burnoutRiskScore >= 50) {
      recommendations.push('Review work-life balance');
      recommendations.push('Set clearer boundaries between volunteer and personal time');
      recommendations.push('Attend stress-management workshop');
    }

    // Based on hours worked
    if (checkInData.hoursWorkedThisMonth > 40) {
      recommendations.push('Hours worked is high - ensure adequate rest');
      recommendations.push('Consider declining new match requests temporarily');
    }

    // Based on support usage
    if (!checkInData.supportUsed) {
      recommendations.push('Utilize available wellness resources');
      recommendations.push('Connect with peer support network');
    }

    if (recommendations.length === 0) {
      recommendations.push('Keep up the great work! Continue self-care practices.');
    }

    return recommendations;
  }

  /**
   * Create wellness alert for supervisors
   */
  async createWellnessAlert(volunteerId: string, riskLevel: BurnoutRisk): Promise<void> {
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: volunteerId },
      include: {
        user: { select: { profile: { select: { displayName: true } } } },
        supervisor: true,
      },
    });

    if (!volunteer || !volunteer.supervisor) {
      logger.warn({ volunteerId }, 'Volunteer has no supervisor for alert');
      return;
    }

    const message = `Wellness Alert: ${volunteer.user?.profile?.displayName} has ${riskLevel} burnout risk and needs support`;

    logger.error(
      { volunteerId, supervisorId: volunteer.supervisor.supervisorUserId, riskLevel },
      message
    );

    // TODO: Integrate with notification system
    // await notificationService.notifySupervisor(
    //   volunteer.supervisor.supervisorUserId,
    //   'wellness_alert',
    //   { volunteerId, riskLevel, volunteer_name: volunteer.user?.profile?.displayName }
    // );
  }

  /**
   * Get wellness history with trends
   */
  async getWellnessHistory(volunteerId: string, days: number = 90): Promise<any> {
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: volunteerId },
    });

    if (!volunteer) {
      throw new Error('Volunteer not found');
    }

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const checkIns = await prisma.volunteerWellnessCheckIn.findMany({
      where: {
        volunteerId,
        createdAt: { gte: cutoffDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (checkIns.length === 0) {
      return {
        volunteerId,
        message: 'No wellness check-ins in this period',
        checkIns: [],
      };
    }

    // Calculate trends
    const scores = checkIns.map((c) => c.burnoutRiskScore);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const trend = this.calculateTrend(scores);

    const emotionalStatuses = checkIns.map((c) => c.emotionalStatus);
    const mostCommonStatus = this.getMostCommon(emotionalStatuses);

    const totalHours = checkIns.reduce((sum, c) => sum + c.hoursWorkedThisMonth, 0);
    const avgHours = Math.round(totalHours / checkIns.length);

    return {
      volunteerId,
      period: `Last ${days} days`,
      statistics: {
        checkInCount: checkIns.length,
        averageBurnoutScore: avgScore,
        maxBurnoutScore: maxScore,
        minBurnoutScore: minScore,
        trend,
        mostCommonEmotionalStatus: mostCommonStatus,
        totalHoursWorked: totalHours,
        averageHoursPerCheckIn: avgHours,
      },
      checkIns: checkIns.map((c) => ({
        date: c.createdAt,
        emotionalStatus: c.emotionalStatus,
        burnoutRiskScore: c.burnoutRiskScore,
        hoursWorked: c.hoursWorkedThisMonth,
        supportUsed: c.supportUsed,
        notes: c.notes,
      })),
      insights: this.generateInsights(checkIns),
    };
  }

  /**
   * Get wellness status for dashboard
   */
  async getWellnessStatus(volunteerId: string): Promise<any> {
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: volunteerId },
    });

    if (!volunteer) {
      throw new Error('Volunteer not found');
    }

    const latestCheckIn = await prisma.volunteerWellnessCheckIn.findFirst({
      where: { volunteerId },
      orderBy: { createdAt: 'desc' },
    });

    const monthStart = new Date();
    monthStart.setDate(1);

    const thisMonthCheckIns = await prisma.volunteerWellnessCheckIn.count({
      where: {
        volunteerId,
        createdAt: { gte: monthStart },
      },
    });

    return {
      volunteerId,
      currentStatus: latestCheckIn?.emotionalStatus || 'unknown',
      burnoutRiskLevel: volunteer.burnoutRiskLevel,
      burnoutRiskScore: latestCheckIn?.burnoutRiskScore || null,
      lastCheckInDate: latestCheckIn?.createdAt,
      thisMonthCheckIns,
      nextCheckInDue: this.getNextCheckInDate(),
      hoursThisMonth: latestCheckIn?.hoursWorkedThisMonth || 0,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private calculateTrend(scores: number[]): string {
    if (scores.length < 2) return 'insufficient_data';

    const recent = scores.slice(-3);
    const earlier = scores.slice(0, 3);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

    if (recentAvg > earlierAvg + 10) return 'worsening';
    if (recentAvg < earlierAvg - 10) return 'improving';
    return 'stable';
  }

  private getMostCommon(items: any[]): any {
    return items
      .sort(
        (a, b) =>
          items.filter((v: any) => v === a).length -
          items.filter((v: any) => v === b).length
      )
      .pop();
  }

  private generateInsights(checkIns: any[]): string[] {
    const insights = [];

    // Trend analysis
    if (checkIns.length >= 3) {
      const recentScores = checkIns.slice(-3).map((c: any) => c.burnoutRiskScore);
      const averageRecent = recentScores.reduce((a: number, b: number) => a + b, 0) / 3;

      if (averageRecent >= 70) {
        insights.push('⚠️ Consistent high burnout risk - recommend supervisor check-in');
      }

      if (this.calculateTrend(recentScores) === 'worsening') {
        insights.push('📈 Burnout risk trending upward - consider case load reduction');
      }

      if (this.calculateTrend(recentScores) === 'improving') {
        insights.push('✅ Burnout risk improving - keep up current wellness practices');
      }
    }

    // Emotional status
    const emotionalStatus = checkIns[checkIns.length - 1].emotionalStatus;
    if (emotionalStatus === 'thriving') {
      insights.push('🌟 Volunteer is thriving - model positive wellness practices for others');
    }

    if (emotionalStatus === 'struggling' || emotionalStatus === 'overwhelmed') {
      insights.push('💙 Volunteer may benefit from peer support or mentoring');
    }

    // Hours worked
    const latestHours = checkIns[checkIns.length - 1].hoursWorkedThisMonth;
    if (latestHours > 40) {
      insights.push(`⏰ ${latestHours} hours this month - ensure adequate recovery time`);
    }

    return insights;
  }

  private getNextCheckInDate(): Date {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    return nextMonth;
  }
}

export const wellnessService = new WellnessService();
