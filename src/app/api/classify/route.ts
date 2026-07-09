import { NextRequest, NextResponse } from "next/server";
import { classifySession, allScores } from "@/lib/engine";
import { enhanceWithLLM, checkOllamaHealth } from "@/lib/ollama";
import { UserEvent } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events: UserEvent[] = body.events || [];
    const useLLM: boolean = body.useLLM !== false;

    // Rule-engine classification (instant)
    const classification = classifySession(events);
    const scores = allScores(events);

    // LLM enhancement (if requested and events exist)
    let enhanced = classification;
    if (useLLM && events.length >= 2) {
      enhanced = await enhanceWithLLM(classification, events);
    }

    return NextResponse.json({
      classification: enhanced,
      allScores: scores,
      eventCount: events.length,
      llmUsed: enhanced.llmExplanation !== undefined,
    });
  } catch (err) {
    console.error("Classification error:", err);
    return NextResponse.json(
      { error: "Classification failed" },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  const health = await checkOllamaHealth();
  return NextResponse.json(health);
}
