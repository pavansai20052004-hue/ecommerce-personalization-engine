import { Classification, UserEvent, EVENT_META, STATE_META } from "./types";

const OLLAMA_BASE =
  process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "llama3";

/**
 * Enhance a rule-engine classification with an LLM-generated explanation.
 * If Ollama is unavailable, returns the classification unchanged.
 */
export async function enhanceWithLLM(
  classification: Classification,
  events: UserEvent[]
): Promise<Classification> {
  try {
    const eventSummary = events
      .map((e) => {
        const meta = EVENT_META[e.type];
        const details = [];
        if (e.data.productName) details.push(`product: ${e.data.productName}`);
        if (e.data.productPrice)
          details.push(`price: $${e.data.productPrice}`);
        if (e.data.page) details.push(`page: ${e.data.page}`);
        if (e.data.query) details.push(`query: "${e.data.query}"`);
        if (e.data.couponCode) details.push(`code: ${e.data.couponCode}`);
        const detailStr = details.length ? ` (${details.join(", ")})` : "";
        return `- ${meta.label}${detailStr}`;
      })
      .join("\n");

    const stateMeta = STATE_META[classification.state];
    const evidenceSummary = classification.evidence
      .map((e) => `- ${e.signal}: ${e.detail}`)
      .join("\n");

    const prompt = `You are an ecommerce personalization analyst. Analyze this shopping session and provide a brief, specific explanation of the shopper behavior and a tailored action recommendation.

## Session Events (chronological)
${eventSummary}

## Rule Engine Classification
State: ${stateMeta.label} (${stateMeta.description})
Confidence: ${Math.round(classification.confidence * 100)}%

## Evidence
${evidenceSummary}

## Default Nudge
${classification.nudge}

Respond in this exact JSON format, nothing else:
{
  "explanation": "2-3 sentence analysis of THIS specific session, referencing actual events and products the shopper interacted with. Be specific, not generic.",
  "nudge": "One specific, actionable recommendation for this exact session. Reference actual products/categories from the events if possible."
}`;

    const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 300,
        },
      }),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      console.warn(`Ollama returned ${response.status}, using rule-engine output`);
      return classification;
    }

    const data = await response.json();
    const text = data.response || "";

    // Extract JSON from response (handle models that wrap in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        ...classification,
        llmExplanation: parsed.explanation || undefined,
        nudge: parsed.nudge || classification.nudge,
      };
    }

    return classification;
  } catch (err) {
    console.warn("LLM enhancement unavailable:", (err as Error).message);
    return classification;
  }
}

/**
 * Check if Ollama is reachable.
 */
export async function checkOllamaHealth(): Promise<{
  available: boolean;
  model: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { available: false, model: MODEL, error: `HTTP ${res.status}` };
    const data = await res.json();
    const models = (data.models || []).map((m: { name: string }) => m.name);
    const hasModel = models.some(
      (m: string) => m === MODEL || m.startsWith(`${MODEL}:`)
    );
    return {
      available: hasModel,
      model: MODEL,
      error: hasModel
        ? undefined
        : `Model "${MODEL}" not found. Available: ${models.join(", ") || "none"}. Run: ollama pull ${MODEL}`,
    };
  } catch {
    return {
      available: false,
      model: MODEL,
      error: "Ollama not reachable at " + OLLAMA_BASE,
    };
  }
}
