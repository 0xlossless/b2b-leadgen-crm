import { NextResponse } from "next/server";

// ONE-TIME USE: Extract DB password to construct pooler URL
// DELETE THIS FILE AFTER USE
export async function GET() {
  const dbUrl = process.env.DATABASE_URL || '';
  const match = dbUrl.match(/:\/\/[^:]+:([^@]+)@/);
  const pw = match ? match[1] : 'not-found';
  return NextResponse.json({ pw });
}
