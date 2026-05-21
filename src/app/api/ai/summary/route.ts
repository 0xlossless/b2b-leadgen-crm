import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, contacts, leadScores, deals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const LLM_URL = "http://localhost:8080/v1/chat/completions";
const LLM_MODEL = "Qwen3.6-27B-Q4_K_M.gguf";

const SYSTEM_PROMPT = `You are a CRM assistant for Golden State Epoxy Flooring, an epoxy flooring company in Livermore, CA.
Your job is to generate concise 2-3 sentence lead briefings for the sales team.

The briefing should cover:
1. What the company does and its size/location
2. Why they'd be a good fit for epoxy flooring (specific use case)
3. Who the decision maker is and contact status

Be specific and actionable. Use a direct, informative tone. No fluff.
Example: "Bay Area Auto Group operates 3 dealerships in Fremont with ~45 employees. Their showrooms and service bays are prime candidates for metallic epoxy flooring. Decision maker is Mike Chen (Facilities Director) — email verified."`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: "leadId is required" },
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

    const decisionMaker = leadContacts.find((c) => c.isDecisionMaker);
    const primaryContact = decisionMaker || leadContacts[0];

    const leadInfoBlock = `Generate a 2-3 sentence lead briefing for this prospect:

Company: ${lead.companyName}
Industry: ${lead.industry || "Unknown"}
Location: ${[lead.city, lead.state].filter(Boolean).join(", ") || "Unknown"}
Employee Count: ${lead.employeeCount || "Unknown"}
Revenue Range: ${lead.revenueRange || "Unknown"}
Website: ${lead.website || "N/A"}
Contacts: ${leadContacts.map((c) => `${c.fullName}${c.title ? ` (${c.title})` : ""}${c.isDecisionMaker ? " [Decision Maker]" : ""}${c.emailVerified ? " — email verified" : ""}`).join("; ") || "None"}
Lead Score: ${score?.totalScore ?? "Not scored"}/100${score?.tier ? ` (${score.tier})` : ""}
Deal Stage: ${deal?.stage || "No deal yet"}
Deal Value: ${deal?.dealValue ? `$${deal.dealValue.toLocaleString()}` : "N/A"}

Respond with ONLY the 2-3 sentence briefing. No labels, no formatting, just the sentences.`;

    // Call local LLM
    const llmResponse = await fetch(LLM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: leadInfoBlock },
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
    const summary =
      (llmData.choices?.[0]?.message?.content?.trim() || 
       llmData.choices?.[0]?.message?.reasoning_content?.trim() || "")
      // If we got reasoning_content, try to extract the final answer (last paragraph)
      .split("\n\n").pop()?.trim() || "";

    if (!summary) {
      return NextResponse.json(
        { error: "AI returned empty response" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      summary,
      leadId,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /api/ai/summary error:", error);

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
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
