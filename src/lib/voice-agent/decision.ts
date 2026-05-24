import { getVoiceAgentBlueprint } from "./config";
import type { CallAction, LeadPriority } from "./types";

export interface VoiceLeadAssessment {
  priority: LeadPriority;
  action: CallAction;
  serviceAreaMatch: boolean;
  matchedTriggers: string[];
  reasons: string[];
}

function normalizeValue(value: unknown) {
  return String(value || "").trim();
}

export function getServiceAreaMatch(serviceCity?: string | null) {
  const city = normalizeValue(serviceCity).toLowerCase();
  if (!city) return false;
  const blueprint = getVoiceAgentBlueprint();
  return blueprint.businessRules.serviceAreas.some((area) => area.toLowerCase() === city);
}

export function assessVoiceLead(payload: Record<string, unknown>): VoiceLeadAssessment {
  const blueprint = getVoiceAgentBlueprint();
  const serviceCity = normalizeValue(payload.serviceCity || payload.service_city);
  const projectType = normalizeValue(payload.projectType || payload.project_type).toLowerCase();
  const propertyType = normalizeValue(payload.propertyType || payload.property_type).toLowerCase();
  const timeline = normalizeValue(payload.timeline).toLowerCase();
  const squareFootage = Number(payload.squareFootage || payload.square_footage || 0);
  const immediateTransferRequested = Boolean(
    payload.requestImmediateTransfer || payload.request_immediate_transfer
  );

  const serviceAreaMatch = getServiceAreaMatch(serviceCity);
  const reasons: string[] = [];
  const matchedTriggers: string[] = [];

  const isCommercial =
    propertyType.includes("commercial") ||
    projectType.includes("commercial") ||
    projectType.includes("warehouse") ||
    projectType.includes("showroom");

  const isUrgent =
    timeline.includes("asap") ||
    timeline.includes("this week") ||
    timeline.includes("urgent") ||
    timeline.includes("soon");

  const isOutOfScope = !serviceAreaMatch && serviceCity.length > 0;
  const isLargeProject = squareFootage >= 1000;

  if (immediateTransferRequested) {
    matchedTriggers.push("Urgent high-intent caller");
    reasons.push("Caller explicitly asked for an immediate transfer.");
  }

  if (isCommercial && isLargeProject) {
    matchedTriggers.push("Large commercial opportunity");
    reasons.push("Commercial project with high square footage.");
  }

  if (isUrgent) {
    matchedTriggers.push("Urgent high-intent caller");
    reasons.push("Timeline suggests immediate buying intent.");
  }

  if (isOutOfScope) {
    matchedTriggers.push("Out-of-scope or spam caller");
    reasons.push("Caller city is outside the configured service area.");
  }

  if (isOutOfScope) {
    return {
      priority: "disqualified",
      action: "decline_politely",
      serviceAreaMatch,
      matchedTriggers,
      reasons,
    };
  }

  if (immediateTransferRequested || (isCommercial && isLargeProject) || isUrgent) {
    return {
      priority: "hot",
      action: blueprint.businessRules.businessHoursPolicy === "transfer_or_schedule"
        ? "transfer_to_joseph"
        : "capture_and_callback",
      serviceAreaMatch,
      matchedTriggers: matchedTriggers.length ? matchedTriggers : ["Urgent high-intent caller"],
      reasons,
    };
  }

  return {
    priority: "standard",
    action: "capture_and_callback",
    serviceAreaMatch,
    matchedTriggers: ["Standard quote request"],
    reasons: reasons.length
      ? reasons
      : ["Caller fits service area and should receive standard callback handling."],
  };
}
