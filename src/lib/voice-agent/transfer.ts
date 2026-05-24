const DEFAULT_TRANSFER_TIMEOUT_SECONDS = 25;

export interface TransferDecisionInput {
  priority?: string | null;
  serviceAreaMatch?: boolean | null;
  requestedImmediateTransfer?: boolean;
  isBusinessHours?: boolean;
}

export interface TransferDecision {
  shouldTransfer: boolean;
  reason: string;
  targetNumber: string | null;
  timeoutSeconds: number;
  fallbackAction: "capture_and_callback" | "decline_politely";
}

export interface TransferTarget {
  number: string | null;
  configured: boolean;
}

export function getTransferTarget(): TransferTarget {
  const number = process.env.TRANSFER_TO_NUMBER || process.env.NOTIFY_PHONE || null;
  return {
    number,
    configured: Boolean(number),
  };
}

export function isWithinBusinessHours(now = new Date()) {
  const hour = now.getHours();
  return hour >= 8 && hour < 18;
}

export function decideLiveTransfer(input: TransferDecisionInput): TransferDecision {
  const target = getTransferTarget();
  const businessHours = input.isBusinessHours ?? isWithinBusinessHours();

  if (!target.configured) {
    return {
      shouldTransfer: false,
      reason: "No transfer target is configured.",
      targetNumber: null,
      timeoutSeconds: DEFAULT_TRANSFER_TIMEOUT_SECONDS,
      fallbackAction: "capture_and_callback",
    };
  }

  if (input.serviceAreaMatch === false) {
    return {
      shouldTransfer: false,
      reason: "Caller is outside the configured service area.",
      targetNumber: target.number,
      timeoutSeconds: DEFAULT_TRANSFER_TIMEOUT_SECONDS,
      fallbackAction: "decline_politely",
    };
  }

  if (!businessHours) {
    return {
      shouldTransfer: false,
      reason: "Outside business hours, capture for callback instead of transferring.",
      targetNumber: target.number,
      timeoutSeconds: DEFAULT_TRANSFER_TIMEOUT_SECONDS,
      fallbackAction: "capture_and_callback",
    };
  }

  const isHot = input.priority === "hot";
  const explicitlyRequested = Boolean(input.requestedImmediateTransfer);

  if (isHot || explicitlyRequested) {
    return {
      shouldTransfer: true,
      reason: explicitlyRequested
        ? "Caller explicitly requested an immediate transfer."
        : "Lead is classified as hot during business hours.",
      targetNumber: target.number,
      timeoutSeconds: DEFAULT_TRANSFER_TIMEOUT_SECONDS,
      fallbackAction: "capture_and_callback",
    };
  }

  return {
    shouldTransfer: false,
    reason: "Lead does not meet live-transfer criteria.",
    targetNumber: target.number,
    timeoutSeconds: DEFAULT_TRANSFER_TIMEOUT_SECONDS,
    fallbackAction: "capture_and_callback",
  };
}
