import type { ScoreTier } from "./db/schema";

// ─── ICP Configuration ──────────────────────────────────
// Customize these to match your Ideal Customer Profile

export const ICP_CONFIG = {
  targetIndustries: [
    "Construction",
    "Real Estate",
    "Property Management",
    "Manufacturing",
    "Warehouse",
    "Restaurant",
    "Automotive",
    "Healthcare",
    "Retail",
    "Hospitality",
  ],
  employeeRange: { min: 1, max: 200 },
  targetTechStack: [
    "Angi",
    "HomeAdvisor",
    "Yelp",
    "Google Business",
    "Houzz",
    "BuildZoom",
    "Thumbtack",
  ],
  minTrafficThreshold: 1000,
  serviceArea: [
    "Livermore",
    "Pleasanton",
    "Dublin",
    "Tracy",
    "San Ramon",
    "Fremont",
    "Oakland",
    "Walnut Creek",
    "Danville",
    "Hayward",
    "Castro Valley",
    "Bay Area",
  ],
};

// ─── Scoring Weights ────────────────────────────────────
const WEIGHTS = {
  industryMatch: 20,
  employeeFit: 15,
  decisionMaker: 20,
  techMatch: 15,
  fundingEvent: 15,
  trafficScore: 10,
  emailVerified: 5,
} as const;

// ─── Types ──────────────────────────────────────────────
export interface LeadData {
  industry?: string | null;
  employeeCount?: number | null;
  techStack?: string | null; // JSON array string
  hasDecisionMaker: boolean;
  hasVerifiedEmail: boolean;
  hasFundingEvent?: boolean;
  monthlyTraffic?: number;
}

export interface ScoreBreakdown {
  totalScore: number;
  tier: ScoreTier;
  industryMatch: number;
  employeeFit: number;
  decisionMaker: number;
  techMatch: number;
  fundingEvent: number;
  trafficScore: number;
  emailVerified: number;
  disqualified: boolean;
  disqualifyReason: string | null;
}

// ─── Scoring Functions ──────────────────────────────────

function scoreIndustry(industry?: string | null): number {
  if (!industry) return 0;
  const match = ICP_CONFIG.targetIndustries.some(
    (target) => target.toLowerCase() === industry.toLowerCase()
  );
  return match ? WEIGHTS.industryMatch : 0;
}

function scoreEmployeeCount(count?: number | null): number {
  if (!count) return 0;
  const { min, max } = ICP_CONFIG.employeeRange;
  if (count >= min && count <= max) return WEIGHTS.employeeFit;
  // Partial credit for close matches
  if (count >= min * 0.5 && count <= max * 1.5) return Math.round(WEIGHTS.employeeFit * 0.5);
  return 0;
}

function scoreDecisionMaker(hasDecisionMaker: boolean): number {
  return hasDecisionMaker ? WEIGHTS.decisionMaker : 0;
}

function scoreTechStack(techStackJson?: string | null): number {
  if (!techStackJson) return 0;
  try {
    const techStack: string[] = JSON.parse(techStackJson);
    const matches = techStack.filter((tech) =>
      ICP_CONFIG.targetTechStack.some(
        (target) => target.toLowerCase() === tech.toLowerCase()
      )
    );
    if (matches.length === 0) return 0;
    // Scale: 1 match = 5pts, 2 = 10pts, 3+ = full 15pts
    return Math.min(matches.length * 5, WEIGHTS.techMatch);
  } catch {
    return 0;
  }
}

function scoreFunding(hasFundingEvent?: boolean): number {
  return hasFundingEvent ? WEIGHTS.fundingEvent : 0;
}

function scoreTraffic(monthlyTraffic?: number): number {
  if (!monthlyTraffic) return 0;
  return monthlyTraffic >= ICP_CONFIG.minTrafficThreshold
    ? WEIGHTS.trafficScore
    : 0;
}

function scoreEmail(hasVerifiedEmail: boolean): number {
  return hasVerifiedEmail ? WEIGHTS.emailVerified : 0;
}

function getTier(score: number): ScoreTier {
  if (score >= 80) return "hot";
  if (score >= 50) return "warm";
  return "cold";
}

function checkDisqualification(
  score: number,
  data: LeadData
): { disqualified: boolean; reason: string | null } {
  if (score < 30) {
    const reasons: string[] = [];
    if (!data.industry) reasons.push("no_industry_data");
    if (!data.hasDecisionMaker) reasons.push("no_decision_maker");
    if (!data.hasVerifiedEmail) reasons.push("no_verified_email");
    if (data.employeeCount && data.employeeCount < 5)
      reasons.push("company_too_small");
    return {
      disqualified: true,
      reason: reasons.join(", ") || "low_overall_score",
    };
  }
  return { disqualified: false, reason: null };
}

// ─── Main Scoring Function ──────────────────────────────
export function scoreLead(data: LeadData): ScoreBreakdown {
  const industryMatch = scoreIndustry(data.industry);
  const employeeFit = scoreEmployeeCount(data.employeeCount);
  const decisionMaker = scoreDecisionMaker(data.hasDecisionMaker);
  const techMatch = scoreTechStack(data.techStack);
  const fundingEvent = scoreFunding(data.hasFundingEvent);
  const trafficScore = scoreTraffic(data.monthlyTraffic);
  const emailVerified = scoreEmail(data.hasVerifiedEmail);

  const totalScore =
    industryMatch +
    employeeFit +
    decisionMaker +
    techMatch +
    fundingEvent +
    trafficScore +
    emailVerified;

  const tier = getTier(totalScore);
  const { disqualified, reason: disqualifyReason } = checkDisqualification(
    totalScore,
    data
  );

  return {
    totalScore,
    tier,
    industryMatch,
    employeeFit,
    decisionMaker,
    techMatch,
    fundingEvent,
    trafficScore,
    emailVerified,
    disqualified,
    disqualifyReason,
  };
}
