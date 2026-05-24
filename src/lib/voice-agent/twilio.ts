function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildTwimlResponse(content: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${content}</Response>`;
}

export function buildDialSipTwiml(sipUri: string, actionUrl?: string) {
  const actionAttr = actionUrl ? ` action="${escapeXml(actionUrl)}" method="POST"` : "";
  return buildTwimlResponse(`<Dial answerOnBridge="true"${actionAttr}><Sip>${escapeXml(sipUri)}</Sip></Dial>`);
}

export function buildSayTwiml(message: string) {
  return buildTwimlResponse(`<Say voice="alice">${escapeXml(message)}</Say>`);
}

export function buildRejectTwiml() {
  return buildTwimlResponse("<Reject />");
}
