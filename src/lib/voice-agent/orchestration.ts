import { decideLiveTransfer } from "./transfer";

export type OrchestrationAction =
  | "book_estimate"
  | "transfer_to_joseph"
  | "capture_and_callback"
  | "decline_politely";

export interface OrchestrationInput {
  priority?: string | null;
  serviceAreaMatch?: boolean | null;
  requestedImmediateTransfer?: boolean;
  wantsBooking?: boolean;
  preferredDate?: string | null;
  preferredStartTime?: string | null;
}

export interface OrchestrationDecision {
  action: OrchestrationAction;
  reason: string;
  bookingEligible: boolean;
  transferEligible: boolean;
  fallbackAction: "capture_and_callback" | "decline_politely";
}

function hasBookingSignals(input: OrchestrationInput) {
  return Boolean(input.preferredDate && input.preferredDate.trim());
}

export function decideVoiceOrchestration(input: OrchestrationInput): OrchestrationDecision {
  const transfer = decideLiveTransfer({
    priority: input.priority,
    serviceAreaMatch: input.serviceAreaMatch,
    requestedImmediateTransfer: input.requestedImmediateTransfer,
  });

  if (input.serviceAreaMatch === false) {
    return {
      action: "decline_politely",
      reason: "Caller is outside the configured service area.",
      bookingEligible: false,
      transferEligible: false,
      fallbackAction: "decline_politely",
    };
  }

  const bookingEligible = hasBookingSignals(input);
  const bookingIntent = Boolean(
    input.wantsBooking ||
      bookingEligible ||
      (input.preferredStartTime && input.preferredStartTime.trim())
  );

  if (transfer.shouldTransfer) {
    return {
      action: "transfer_to_joseph",
      reason: transfer.reason,
      bookingEligible,
      transferEligible: true,
      fallbackAction: transfer.fallbackAction,
    };
  }

  if (bookingEligible) {
    return {
      action: "book_estimate",
      reason: "Caller supplied a concrete appointment date for an estimate.",
      bookingEligible: true,
      transferEligible: false,
      fallbackAction: "capture_and_callback",
    };
  }

  if (bookingIntent) {
    return {
      action: "capture_and_callback",
      reason: "Caller wants an estimate, but the appointment date still needs confirmation.",
      bookingEligible: false,
      transferEligible: false,
      fallbackAction: "capture_and_callback",
    };
  }

  return {
    action: "capture_and_callback",
    reason: "Capture lead details and follow up later.",
    bookingEligible: false,
    transferEligible: false,
    fallbackAction: transfer.fallbackAction,
  };
}
