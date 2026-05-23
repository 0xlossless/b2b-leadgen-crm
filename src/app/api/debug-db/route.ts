import { NextResponse } from "next/server";

// Simple debug endpoint to see DATABASE_URL host
export async function GET() {
  const dbUrl = process.env.DATABASE_URL || '';
  // Extract just the host (no password)
  let host = 'not-set';
  let user = 'not-set';
  let port = 'not-set';
  try {
    const match = dbUrl.match(/@([^/:]+)(?::(\d+))?/);
    if (match) {
      host = match[1];
      port = match[2] || 'default';
    }
    const userMatch = dbUrl.match(/\/\/([^:@]+)/);
    if (userMatch) user = userMatch[1];
  } catch {}
  
  return NextResponse.json({ host, user, port, hasUrl: !!dbUrl, urlLen: dbUrl.length });
}
