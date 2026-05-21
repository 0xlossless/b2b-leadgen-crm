import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, contacts, leadScores, deals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const LLM_URL = "http://localhost:8080/v1/chat/completions";
const LLM_MODEL = "Qwen3.6-27B-Q4_K_M.gguf";

const GOLDEN_STATE_CONTEXT = `You are an email copywriter for Golden State Epoxy Flooring.

Company Info:
- Company: Golden State Epoxy Flooring, based in Livermore, CA
- Owner: Joseph Galindo, (925) 518-2985
- Services: epoxy flooring, metallic epoxy, flake floors, garage floors, commercial epoxy, polished concrete
- Value Proposition: 15-year warranty, same-day quotes, serving the entire Bay Area
- Tone: Professional but friendly, not salesy. Like a knowledgeable neighbor who happens to be an expert. Warm and genuine.

IMPORTANT formatting rules:
- Never use pushy sales language or excessive exclamation marks
- Keep emails concise and respectful of the reader's time
- Always sign off as Joseph Galindo, Golden State Epoxy Flooring
- Include phone number (925) 518-2985 in the signature`;

const EMAIL_TYPE_PROMPTS: Record<string, string> = {
  cold_intro: `Write a cold introduction email. This is the FIRST outreach to this prospect. 
Mention their specific business type/industry and suggest how epoxy flooring could benefit their specific use case.
Keep it short (under 150 words for the body). Ask a simple question to invite a reply.
Don't be pushy — just introduce yourself and plant the seed.`,

  follow_up: `Write a gentle follow-up email. We reached out before but haven't heard back.
Keep it very short (under 100 words). Don't guilt-trip them.
Offer something of value — maybe a relevant project example or a quick tip.
Make it easy for them to respond with a simple yes/no question.`,

  proposal: `Write a more detailed proposal-style email. Include:
- Specific benefits for their industry/use case
- Mention our 15-year warranty as a differentiator
- Hint at pricing range (commercial epoxy typically $3-7/sqft depending on system)
- Offer a free on-site consultation and same-day quote
Keep it professional but still warm. Under 250 words for the body.`,

  check_in: `Write a casual check-in email. It's been a while since we last connected.
Keep it very brief (under 80 words). No pressure whatsoever.
Maybe mention a recent project we completed in their area or industry.
Just letting them know we're still here if they ever need us.`,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, emailType, customPrompt } = body;

    if (!leadId || !emailType) {
      return NextResponse.json(
        { error: "leadId and emailType are required" },
        { status: 400 }
      );
    }

    if (!EMAIL_TYPE_PROMPTS[emailType]) {
      return NextResponse.json(
        { error: "Invalid emailType. Must be: cold_intro, follow_up, proposal, or check_in" },
        { status: 400 }
      );
    }

    // Fetch lead data
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const leadContacts = await db
      .select()
      .from(contacts)
      .where(eq(contacts.leadId, leadId));

    const [score] = await db
      .select()
      .from(leadScores)
      .where(eq(leadScores.leadId, leadId));

    const [deal] = await db
      .select()
      .from(deals)
      .where(eq(deals.leadId, leadId));

    // Build lead context for the prompt
    const decisionMaker = leadContacts.find((c) => c.isDecisionMaker);
    const primaryContact = decisionMaker || leadContacts[0];

    const leadContext = {
      companyName: lead.companyName,
      industry: lead.industry || "Unknown",
      city: lead.city,
      state: lead.state,
      employeeCount: lead.employeeCount,
      revenueRange: lead.revenueRange,
      website: lead.website,
      contactName: primaryContact?.fullName || "the team",
      contactTitle: primaryContact?.title || "",
      contactEmail: primaryContact?.email || "",
      scoreTier: score?.tier || "unknown",
      totalScore: score?.totalScore ?? 0,
      dealStage: deal?.stage || "no_deal",
      dealValue: deal?.dealValue ?? 0,
    };

    const leadInfoBlock = `
LEAD INFORMATION:
- Company: ${leadContext.companyName}
- Industry: ${leadContext.industry}
- Location: ${[lead.city, lead.state].filter(Boolean).join(", ") || "Bay Area"}
- Employee Count: ${leadContext.employeeCount || "Unknown"}
- Revenue Range: ${leadContext.revenueRange || "Unknown"}
- Website: ${leadContext.website || "N/A"}
- Primary Contact: ${leadContext.contactName}${leadContext.contactTitle ? ` (${leadContext.contactTitle})` : ""}
- Lead Score: ${leadContext.totalScore}/100 (${leadContext.scoreTier})
- Deal Stage: ${leadContext.dealStage}
`;

    const userPrompt = `${EMAIL_TYPE_PROMPTS[emailType]}

${leadInfoBlock}

${customPrompt ? `ADDITIONAL CONTEXT FROM USER: ${customPrompt}\n` : ""}
RESPONSE FORMAT — You MUST respond in EXACTLY this format with no other text:
SUBJECT: <email subject line>
BODY:
<email body text>`;

    // Call local LLM
    const llmResponse = await fetch(LLM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: "system", content: GOLDEN_STATE_CONTEXT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text().catch(() => "Unknown error");
      console.error("LLM API error:", llmResponse.status, errText);
      return NextResponse.json(
        { error: "AI service unavailable. Please try again later." },
        { status: 502 }
      );
    }

    const llmData = await llmResponse.json();
    const rawContent =
      llmData.choices?.[0]?.message?.content || 
      llmData.choices?.[0]?.message?.reasoning_content || "";

    // Parse subject and body from the response
    const { subject, emailBody } = parseEmailResponse(rawContent);

    return NextResponse.json({
      email: {
        subject,
        body: emailBody,
      },
      leadContext,
      raw: rawContent,
    });
  } catch (error) {
    console.error("POST /api/ai/email error:", error);

    // Check if it's a connection error (LLM not running)
    if (
      error instanceof TypeError &&
      (error.message.includes("fetch") || error.message.includes("ECONNREFUSED"))
    ) {
      return NextResponse.json(
        { error: "Cannot connect to AI service. Make sure the local LLM server is running on port 8080." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate email" },
      { status: 500 }
    );
  }
}

function parseEmailResponse(raw: string): {
  subject: string;
  emailBody: string;
} {
  // Try to extract SUBJECT: and BODY: sections
  const subjectMatch = raw.match(/SUBJECT:\s*(.+?)(?:\n|$)/i);
  const bodyMatch = raw.match(/BODY:\s*\n?([\s\S]*)/i);

  if (subjectMatch && bodyMatch) {
    return {
      subject: subjectMatch[1].trim(),
      emailBody: bodyMatch[1].trim(),
    };
  }

  // Fallback: try to find a subject line pattern
  const lines = raw.trim().split("\n");
  const subjectLine = lines.find(
    (l) =>
      l.toLowerCase().startsWith("subject:") ||
      l.toLowerCase().startsWith("re:") ||
      l.toLowerCase().startsWith("subj:")
  );

  if (subjectLine) {
    const subject = subjectLine.replace(/^(subject|subj|re):\s*/i, "").trim();
    const bodyStart = lines.indexOf(subjectLine) + 1;
    const emailBody = lines
      .slice(bodyStart)
      .join("\n")
      .trim()
      .replace(/^body:\s*/i, "");
    return { subject, emailBody };
  }

  // Last resort: first line is subject, rest is body
  return {
    subject: lines[0]?.trim() || "Following up",
    emailBody: lines.slice(1).join("\n").trim() || raw.trim(),
  };
}
