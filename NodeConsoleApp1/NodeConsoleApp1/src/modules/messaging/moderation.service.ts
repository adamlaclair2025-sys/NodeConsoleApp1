import { prisma } from '@/database/client';
import { logger } from '@/config/logger';

// Safety keywords that should flag messages for review
const SAFETY_KEYWORDS = [
  'suicide',
  'self-harm',
  'self harm',
  'kill myself',
  'kill myself',
  'harm myself',
  'hurt myself',
];

// Hate speech and abuse patterns (simplified)
const ABUSE_KEYWORDS = [
  'hate',
  'attack',
  'assault',
  'abuse',
];

export interface ModerationResult {
  flagged: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high';
}

export class MessageModerationService {
  /**
   * Screen message for harmful content
   */
  async screenMessage(
    content: string,
    authorId: string,
    conversationId: string
  ): Promise<ModerationResult> {
    const lowerContent = content.toLowerCase();

    // Check for safety keywords (crisis-related)
    for (const keyword of SAFETY_KEYWORDS) {
      if (lowerContent.includes(keyword)) {
        return {
          flagged: true,
          reason: 'safety_keyword_detected',
          severity: 'high',
        };
      }
    }

    // Check for abuse/hate speech patterns
    for (const keyword of ABUSE_KEYWORDS) {
      if (lowerContent.includes(keyword)) {
        // Do more sophisticated checking here
        // For now, flag if appears multiple times
        const matches = (lowerContent.match(new RegExp(keyword, 'g')) || []).length;
        if (matches >= 2) {
          return {
            flagged: true,
            reason: 'potential_abuse',
            severity: 'medium',
          };
        }
      }
    }

    // Check for excessive caps
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.7 && content.length > 20) {
      return {
        flagged: true,
        reason: 'excessive_caps',
        severity: 'low',
      };
    }

    // Check for spam patterns (repetitive characters)
    if (/(.)\1{9,}/.test(content)) {
      return {
        flagged: true,
        reason: 'spam_pattern',
        severity: 'low',
      };
    }

    return {
      flagged: false,
    };
  }

  /**
   * Create moderation queue entry for flagged message
   */
  async createModerationEntry(
    conversationId: string,
    messageId: string,
    authorId: string,
    reason: string
  ): Promise<void> {
    logger.info(
      { conversationId, messageId, authorId, reason },
      'Creating moderation entry'
    );

    // In production, this would create an entry in a moderation queue/dashboard
    // For now, we'll just log it
    // TODO: Integrate with ModerationModule when available
  }

  /**
   * Create report queue entry for user-reported message
   */
  async createReportQueueEntry(
    messageId: string,
    reporterId: string,
    reason: string,
    description?: string
  ): Promise<void> {
    logger.info(
      { messageId, reporterId, reason },
      'Creating message report queue entry'
    );

    // In production, this would notify moderators
    // TODO: Integrate with ModerationModule when available
  }

  /**
   * Check user's messaging behavior pattern (rate of flagged messages, etc)
   */
  async checkUserBehavior(userId: string): Promise<{
    totalMessages: number;
    flaggedMessages: number;
    flagRate: number;
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const totalMessages = await prisma.message.count({
      where: {
        authorId: userId,
        createdAt: { gte: last24Hours },
      },
    });

    // Count messages with associated reports
    const flaggedMessages = await prisma.messageReport.count({
      where: {
        reporter: {
          id: userId,
        },
        createdAt: { gte: last24Hours },
        status: 'pending',
      },
    });

    const flagRate = totalMessages > 0 ? flaggedMessages / totalMessages : 0;

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (flagRate > 0.3) {
      riskLevel = 'high';
    } else if (flagRate > 0.1) {
      riskLevel = 'medium';
    }

    return {
      totalMessages,
      flaggedMessages,
      flagRate,
      riskLevel,
    };
  }

  /**
   * Determine if message should trigger crisis intervention
   */
  async assessCrisisRisk(content: string): Promise<boolean> {
    const crisisIndicators = [
      'suicide',
      'kill myself',
      'want to die',
      'end it all',
      'harm myself',
      'self-harm',
      'cutting',
      'overdose',
    ];

    const lowerContent = content.toLowerCase();

    for (const indicator of crisisIndicators) {
      if (lowerContent.includes(indicator)) {
        logger.warn(
          { indicator, contentPreview: content.substring(0, 100) },
          'Crisis risk indicator detected'
        );
        return true;
      }
    }

    return false;
  }
}

export const messageModerationService = new MessageModerationService();
