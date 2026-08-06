import { z } from 'zod';

// ============================================================================
// VOLUNTEER APPLICATION SCHEMAS
// ============================================================================

export const ApplyAsVolunteerSchema = z.object({
  bio: z.string()
    .min(50, 'Bio must be at least 50 characters')
    .max(1000, 'Bio cannot exceed 1000 characters'),
  specialties: z.array(z.enum([
    'anxiety',
    'depression',
    'grief',
    'trauma',
    'substance_use',
    'eating_disorders',
    'sleep_issues',
    'relationships',
    'work_stress',
    'life_transitions',
    'identity',
    'disability',
    'chronic_illness',
    'parenting',
    'lgbtq_support',
    'cultural_competency',
  ])).min(1, 'Select at least one specialty').max(5, 'Select no more than 5 specialties'),

  languages: z.array(z.string().min(2).max(5))
    .min(1, 'Select at least one language')
    .default(['en']),

  timezone: z.string().min(3).max(50),

  medicalHistoryConsent: z.boolean()
    .refine((val) => val === true, 'Must consent to medical history disclosure'),

  backgroundCheckConsent: z.boolean()
    .refine((val) => val === true, 'Must consent to background check'),

  codesOfConductAccepted: z.boolean()
    .refine((val) => val === true, 'Must accept codes of conduct'),

  privacyPolicyAccepted: z.boolean()
    .refine((val) => val === true, 'Must accept privacy policy'),

  clinicalDisclaimerAccepted: z.boolean()
    .refine((val) => val === true, 'Must acknowledge clinical disclaimer'),
});

export type ApplyAsVolunteerInput = z.infer<typeof ApplyAsVolunteerSchema>;

export const UpdateVolunteerProfileSchema = z.object({
  bio: z.string().max(1000).optional(),
  specialties: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  maximumCaseLoad: z.number().int().min(1).max(20).optional(),
});

export type UpdateVolunteerProfileInput = z.infer<typeof UpdateVolunteerProfileSchema>;

export const CompleteTrainingSchema = z.object({
  trainingType: z.enum([
    'listening_skills',
    'trauma_informed_support',
    'crisis_response',
    'suicide_prevention',
    'peer_support_fundamentals',
    'mental_health_awareness',
    'boundary_setting',
    'self_care_for_supporters',
  ]),
  completedDate: z.date(),
  certificateUrl: z.string().url('Invalid certificate URL'),
  expirationDate: z.date(),
  notes: z.string().optional(),
});

export type CompleteTrainingInput = z.infer<typeof CompleteTrainingSchema>;

export const SubmitCertificationForReviewSchema = z.object({
  certificationId: z.string().min(1),
  supervisorNotes: z.string().optional(),
});

export type SubmitCertificationForReviewInput = z.infer<typeof SubmitCertificationForReviewSchema>;

// ============================================================================
// AVAILABILITY SCHEMAS
// ============================================================================

export const SetAvailabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  timezone: z.string().default('UTC'),
}).refine(
  (data) => {
    const [startHour, startMin] = data.startTime.split(':').map(Number);
    const [endHour, endMin] = data.endTime.split(':').map(Number);
    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;
    return endTotalMin > startTotalMin;
  },
  'End time must be after start time'
);

export type SetAvailabilityInput = z.infer<typeof SetAvailabilitySchema>;

// ============================================================================
// PEER SUPPORT REQUEST SCHEMAS
// ============================================================================

export const RequestPeerSupportSchema = z.object({
  supportType: z.enum([
    'emotional_support',
    'listening',
    'guidance',
    'crisis_support',
    'celebration',
  ]),

  focusAreas: z.array(z.string())
    .min(1, 'Select at least one focus area')
    .max(3, 'Select no more than 3 focus areas'),

  preferredLanguage: z.string().default('en'),

  availabilityPreference: z.enum([
    'flexible',
    'weekdays_only',
    'weekends_only',
    'evenings',
    'mornings',
  ]).optional(),

  timezone: z.string().optional(),

  notes: z.string().max(500).optional(),
});

export type RequestPeerSupportInput = z.infer<typeof RequestPeerSupportSchema>;

export const MatchPreferencesSchema = z.object({
  preferredSpecialties: z.array(z.string()).optional(),
  preferredLanguages: z.array(z.string()).optional(),
  preferredTimeOfDay: z.enum(['morning', 'afternoon', 'evening']).optional(),
  acceptVolunteerMatching: z.boolean().default(true),
});

export type MatchPreferencesInput = z.infer<typeof MatchPreferencesSchema>;

// ============================================================================
// PEER SUPPORT MATCH SCHEMAS
// ============================================================================

export const AcceptMatchSchema = z.object({
  matchId: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export type AcceptMatchInput = z.infer<typeof AcceptMatchSchema>;

export const PauseMatchSchema = z.object({
  matchId: z.string().min(1),
  reason: z.string().optional(),
  estimatedReturnDate: z.date().optional(),
});

export type PauseMatchInput = z.infer<typeof PauseMatchSchema>;

export const EndMatchSchema = z.object({
  matchId: z.string().min(1),
  reason: z.enum([
    'user_request',
    'volunteer_request',
    'incompatibility',
    'goals_met',
    'escalation',
    'other',
  ]),
  reason_details: z.string().optional(),
});

export type EndMatchInput = z.infer<typeof EndMatchSchema>;

// ============================================================================
// PEER SUPPORT SESSION SCHEMAS
// ============================================================================

export const LogSessionSchema = z.object({
  matchId: z.string().min(1),
  sessionDate: z.date(),
  duration: z.number().int().min(5).max(180), // 5 minutes to 3 hours
  sessionMethod: z.enum([
    'messaging',
    'voice_call',
    'video_call',
    'in_person',
  ]),
  outcome: z.enum([
    'supportive',
    'processing',
    'resource_shared',
    'referred_to_professional',
    'crisis_response_initiated',
    'no_progress',
  ]),
  notes: z.string().max(1000).optional(),
  volunteerNotes: z.string().max(1000).optional(),
  crisisIndicators: z.boolean().default(false),
});

export type LogSessionInput = z.infer<typeof LogSessionSchema>;

export const SessionReflectionSchema = z.object({
  sessionId: z.string().min(1),
  userReflection: z.string().max(1000),
  satisfaction: z.number().int().min(1).max(5).optional(),
});

export type SessionReflectionInput = z.infer<typeof SessionReflectionSchema>;

// ============================================================================
// ESCALATION & INCIDENT SCHEMAS
// ============================================================================

export const EscalateMatchSchema = z.object({
  matchId: z.string().min(1),
  reason: z.enum([
    'crisis_indicators',
    'safety_concern',
    'boundary_violation',
    'skill_mismatch',
    'user_request',
    'volunteer_request',
    'supervisor_review',
    'incident_report',
    'lost_contact',
  ]),
  description: z.string().max(1000),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

export type EscalateMatchInput = z.infer<typeof EscalateMatchSchema>;

export const ReportIncidentSchema = z.object({
  matchId: z.string().min(1),
  incidentType: z.enum([
    'boundary_violation',
    'inappropriate_advice',
    'conflict',
    'wellness_concern',
    'policy_violation',
    'other',
  ]),
  description: z.string().max(2000),
  severity: z.enum(['minor', 'moderate', 'serious', 'critical']),
});

export type ReportIncidentInput = z.infer<typeof ReportIncidentSchema>;

// ============================================================================
// WELLNESS CHECK-IN SCHEMAS
// ============================================================================

export const WellnessCheckInSchema = z.object({
  emotionalStatus: z.enum([
    'thriving',
    'managing',
    'struggling',
    'overwhelmed',
    'in_crisis',
  ]),
  burnoutRiskScore: z.number().int().min(0).max(100),
  hoursWorkedThisMonth: z.number().int().min(0).max(200),
  supportUsed: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export type WellnessCheckInInput = z.infer<typeof WellnessCheckInSchema>;

// ============================================================================
// SUPERVISOR SCHEMAS
// ============================================================================

export const ApproveCertificationSchema = z.object({
  certificationId: z.string().min(1),
  approved: z.boolean(),
  reviewNotes: z.string().max(1000).optional(),
});

export type ApproveCertificationInput = z.infer<typeof ApproveCertificationSchema>;

export const AssignSupervisionSchema = z.object({
  volunteerId: z.string().min(1),
  supervisorUserId: z.string().min(1),
  caseLoadLimit: z.number().int().min(1).max(50).default(20),
});

export type AssignSupervisionInput = z.infer<typeof AssignSupervisionSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const GetVolunteerStatsSchema = z.object({
  volunteerId: z.string().min(1),
  periodDays: z.number().int().min(1).max(365).default(30),
});

export type GetVolunteerStatsInput = z.infer<typeof GetVolunteerStatsSchema>;

export const SearchVolunteersSchema = z.object({
  specialties: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  availableNow: z.boolean().default(false),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
});

export type SearchVolunteersInput = z.infer<typeof SearchVolunteersSchema>;

export const GetMatchesSchema = z.object({
  status: z.enum([
    'pending_acceptance',
    'active',
    'paused',
    'completed',
    'terminated',
    'escalated',
  ]).optional(),
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
});

export type GetMatchesInput = z.infer<typeof GetMatchesSchema>;

export const GetSessionHistorySchema = z.object({
  matchId: z.string().min(1),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export type GetSessionHistoryInput = z.infer<typeof GetSessionHistorySchema>;
