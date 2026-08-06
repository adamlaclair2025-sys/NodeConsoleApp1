-- ============================================================================
-- PEER SUPPORT VOLUNTEER PROGRAM
-- ============================================================================

-- Volunteer profile for peer support providers
CREATE TABLE "Volunteer" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"userId" TEXT NOT NULL UNIQUE,
	"status" TEXT NOT NULL DEFAULT 'pending_verification',
	"verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
	"certificationLevel" TEXT NOT NULL DEFAULT 'none',
	"specialties" TEXT[],
	"languages" TEXT[] DEFAULT ARRAY['en']::TEXT[],
	"timezone" TEXT NOT NULL DEFAULT 'UTC',
	"bio" VARCHAR(1000),
	"maximumCaseLoad" INTEGER NOT NULL DEFAULT 5,
	"currentCaseLoad" INTEGER NOT NULL DEFAULT 0,
	"isActive" BOOLEAN NOT NULL DEFAULT true,
	"supportResourcesUsed" TEXT,
	"burnoutRiskLevel" TEXT NOT NULL DEFAULT 'low',
	"applicationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"verificationDate" TIMESTAMP(3),
	"firstCertificationDate" TIMESTAMP(3),
	"inactiveAt" TIMESTAMP(3),
	CONSTRAINT "Volunteer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

CREATE INDEX "Volunteer_userId_idx" ON "Volunteer"("userId");
CREATE INDEX "Volunteer_status_idx" ON "Volunteer"("status");
CREATE INDEX "Volunteer_verificationStatus_idx" ON "Volunteer"("verificationStatus");
CREATE INDEX "Volunteer_certificationLevel_idx" ON "Volunteer"("certificationLevel");

-- Volunteer certifications tracking
CREATE TABLE "VolunteerCertification" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"volunteerId" TEXT NOT NULL,
	"type" TEXT NOT NULL,
	"description" TEXT,
	"completedAt" TIMESTAMP(3) NOT NULL,
	"expiresAt" TIMESTAMP(3) NOT NULL,
	"supervisorReviewedAt" TIMESTAMP(3),
	"supervisorReviewedBy" TEXT,
	"isApproved" BOOLEAN NOT NULL DEFAULT false,
	"reviewNotes" TEXT,
	CONSTRAINT "VolunteerCertification_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "VolunteerCertification_volunteerId_type_completedAt_key" ON "VolunteerCertification"("volunteerId", "type", "completedAt");
CREATE INDEX "VolunteerCertification_volunteerId_idx" ON "VolunteerCertification"("volunteerId");
CREATE INDEX "VolunteerCertification_type_idx" ON "VolunteerCertification"("type");
CREATE INDEX "VolunteerCertification_expiresAt_idx" ON "VolunteerCertification"("expiresAt");

-- Volunteer availability schedule
CREATE TABLE "VolunteerAvailability" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"volunteerId" TEXT NOT NULL,
	"dayOfWeek" INTEGER NOT NULL,
	"startTime" TEXT NOT NULL,
	"endTime" TEXT NOT NULL,
	"timezone" TEXT NOT NULL DEFAULT 'UTC',
	"isActive" BOOLEAN NOT NULL DEFAULT true,
	CONSTRAINT "VolunteerAvailability_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "VolunteerAvailability_volunteerId_dayOfWeek_startTime_endTime_key" 
	ON "VolunteerAvailability"("volunteerId", "dayOfWeek", "startTime", "endTime");
CREATE INDEX "VolunteerAvailability_volunteerId_idx" ON "VolunteerAvailability"("volunteerId");

-- Volunteer wellness check-ins
CREATE TABLE "VolunteerWellnessCheckIn" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"volunteerId" TEXT NOT NULL,
	"emotionalStatus" TEXT NOT NULL,
	"burnoutRiskScore" INTEGER NOT NULL,
	"hoursWorkedThisMonth" INTEGER NOT NULL,
	"supportUsed" TEXT,
	"notes" TEXT,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "VolunteerWellnessCheckIn_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer" ("id") ON DELETE CASCADE
);

CREATE INDEX "VolunteerWellnessCheckIn_volunteerId_idx" ON "VolunteerWellnessCheckIn"("volunteerId");
CREATE INDEX "VolunteerWellnessCheckIn_createdAt_idx" ON "VolunteerWellnessCheckIn"("createdAt");

-- Volunteer supervisor assignments
CREATE TABLE "VolunteerSupervisor" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"volunteerId" TEXT NOT NULL UNIQUE,
	"supervisorUserId" TEXT NOT NULL,
	"assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"caseLoadLimit" INTEGER NOT NULL DEFAULT 20,
	CONSTRAINT "VolunteerSupervisor_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer" ("id") ON DELETE CASCADE
);

CREATE INDEX "VolunteerSupervisor_volunteerId_idx" ON "VolunteerSupervisor"("volunteerId");
CREATE INDEX "VolunteerSupervisor_supervisorUserId_idx" ON "VolunteerSupervisor"("supervisorUserId");

-- Peer support matches between volunteer and user
CREATE TABLE "PeerSupportMatch" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"volunteerId" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"status" TEXT NOT NULL DEFAULT 'pending_acceptance',
	"notes" VARCHAR(500),
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"startedAt" TIMESTAMP(3),
	"endedAt" TIMESTAMP(3),
	"endReason" TEXT,
	"sessionsCompleted" INTEGER NOT NULL DEFAULT 0,
	"lastSessionAt" TIMESTAMP(3),
	"userSatisfaction" INTEGER,
	CONSTRAINT "PeerSupportMatch_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer" ("id") ON DELETE CASCADE,
	CONSTRAINT "PeerSupportMatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "PeerSupportMatch_volunteerId_userId_key" ON "PeerSupportMatch"("volunteerId", "userId");
CREATE INDEX "PeerSupportMatch_volunteerId_idx" ON "PeerSupportMatch"("volunteerId");
CREATE INDEX "PeerSupportMatch_userId_idx" ON "PeerSupportMatch"("userId");
CREATE INDEX "PeerSupportMatch_status_idx" ON "PeerSupportMatch"("status");
CREATE INDEX "PeerSupportMatch_createdAt_idx" ON "PeerSupportMatch"("createdAt");

-- Individual peer support sessions
CREATE TABLE "PeerSupportSession" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"matchId" TEXT NOT NULL,
	"sessionDate" TIMESTAMP(3) NOT NULL,
	"duration" INTEGER NOT NULL,
	"sessionMethod" TEXT NOT NULL,
	"notes" TEXT,
	"outcome" TEXT NOT NULL,
	"volunteerNotes" TEXT,
	"userReflection" TEXT,
	"crisisIndicators" BOOLEAN NOT NULL DEFAULT false,
	"escalated" BOOLEAN NOT NULL DEFAULT false,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "PeerSupportSession_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "PeerSupportMatch" ("id") ON DELETE CASCADE
);

CREATE INDEX "PeerSupportSession_matchId_idx" ON "PeerSupportSession"("matchId");
CREATE INDEX "PeerSupportSession_sessionDate_idx" ON "PeerSupportSession"("sessionDate");
CREATE INDEX "PeerSupportSession_escalated_idx" ON "PeerSupportSession"("escalated");

-- Escalation tracking
CREATE TABLE "PeerSupportEscalation" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"matchId" TEXT NOT NULL,
	"reason" TEXT NOT NULL,
	"description" TEXT,
	"escalatedBy" TEXT NOT NULL,
	"escalatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"escalatedTo" TEXT,
	"status" TEXT NOT NULL DEFAULT 'pending_review',
	"resolution" TEXT,
	"resolvedAt" TIMESTAMP(3),
	CONSTRAINT "PeerSupportEscalation_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "PeerSupportMatch" ("id") ON DELETE CASCADE
);

CREATE INDEX "PeerSupportEscalation_matchId_idx" ON "PeerSupportEscalation"("matchId");
CREATE INDEX "PeerSupportEscalation_status_idx" ON "PeerSupportEscalation"("status");
CREATE INDEX "PeerSupportEscalation_escalatedAt_idx" ON "PeerSupportEscalation"("escalatedAt");

-- Incident reporting
CREATE TABLE "PeerSupportIncident" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"matchId" TEXT NOT NULL,
	"volunteerId" TEXT NOT NULL,
	"incidentType" TEXT NOT NULL,
	"description" TEXT,
	"severity" TEXT NOT NULL,
	"reportedBy" TEXT NOT NULL,
	"reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"investigation" TEXT,
	"resolved" BOOLEAN NOT NULL DEFAULT false,
	"resolvedAt" TIMESTAMP(3),
	"action" TEXT,
	CONSTRAINT "PeerSupportIncident_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "PeerSupportMatch" ("id") ON DELETE CASCADE,
	CONSTRAINT "PeerSupportIncident_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer" ("id") ON DELETE CASCADE
);

CREATE INDEX "PeerSupportIncident_matchId_idx" ON "PeerSupportIncident"("matchId");
CREATE INDEX "PeerSupportIncident_volunteerId_idx" ON "PeerSupportIncident"("volunteerId");
CREATE INDEX "PeerSupportIncident_severity_idx" ON "PeerSupportIncident"("severity");
CREATE INDEX "PeerSupportIncident_resolved_idx" ON "PeerSupportIncident"("resolved");
