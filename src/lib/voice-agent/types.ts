export type VoiceAgentGoal =
  | "answer_missed_calls"
  | "capture_leads"
  | "qualify_projects"
  | "book_estimates"
  | "transfer_hot_calls"
  | "reduce_interruptions";

export type VoiceIntakeFieldKey =
  | "full_name"
  | "callback_phone"
  | "email"
  | "service_city"
  | "project_address"
  | "project_type"
  | "property_type"
  | "coating_interest"
  | "square_footage"
  | "timeline"
  | "notes"
  | "best_callback_time";

export type LeadPriority = "hot" | "standard" | "disqualified";

export type BusinessHoursPolicy = "transfer_or_schedule" | "capture_and_callback";
export type AfterHoursPolicy = "capture_and_callback" | "emergency_transfer";

export type CallAction =
  | "continue_intake"
  | "book_estimate"
  | "transfer_to_joseph"
  | "capture_and_callback"
  | "decline_politely"
  | "mark_spam";

export interface VoiceProviderStack {
  telephony: string;
  orchestration: string;
  primaryModel: string;
  fallbackModel: string;
  notes: string[];
}

export interface VoiceIntakeField {
  key: VoiceIntakeFieldKey;
  label: string;
  required: boolean;
  prompt: string;
  captureHints?: string[];
}

export interface TransferTrigger {
  label: string;
  priority: LeadPriority;
  action: CallAction;
  conditions: string[];
}

export interface RestrictedClaim {
  topic: string;
  rule: string;
  replacement: string;
}

export interface VoiceCallFlowStep {
  id: string;
  label: string;
  objective: string;
  agentInstruction: string;
  successOutcome: string;
}

export interface VoiceAgentBusinessRules {
  brandName: string;
  ownerName: string;
  voicePersona: string;
  serviceAreas: string[];
  acceptedProjectTypes: string[];
  disallowedProjectTypes: string[];
  goals: VoiceAgentGoal[];
  requiredIntakeFields: VoiceIntakeField[];
  transferTriggers: TransferTrigger[];
  restrictedClaims: RestrictedClaim[];
  businessHoursPolicy: BusinessHoursPolicy;
  afterHoursPolicy: AfterHoursPolicy;
  successCriteria: string[];
}

export interface VoiceAgentBlueprint {
  version: string;
  providerStack: VoiceProviderStack;
  businessRules: VoiceAgentBusinessRules;
  callFlow: VoiceCallFlowStep[];
}
