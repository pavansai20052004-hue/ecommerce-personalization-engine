"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  UserEvent,
  Classification,
  ShopperState,
  EventType,
  PageType,
  STATE_META,
  EVENT_META,
} from "@/lib/types";
import { SCENARIOS, createCustomEvent } from "@/lib/scenarios";

// ── Types ────────────────────────────────────────────────────

interface ClassifyResponse {
  classification: Classification;
  allScores: { state: ShopperState; score: number }[];
  eventCount: number;
  llmUsed: boolean;
}

interface OllamaHealth {
  available: boolean;
  model: string;
  error?: string;
}

// ── Main Page ────────────────────────────────────────────────

export default function Home() {
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [result, setResult] = useState<ClassifyResponse | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [ollamaHealth, setOllamaHealth] = useState<OllamaHealth | null>(null);
  const [useLLM, setUseLLM] = useState(true);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const eventListRef = useRef<HTMLDivElement>(null);

  // Check Ollama on mount
  useEffect(() => {
    fetch("/api/classify")
      .then((r) => r.json())
      .then(setOllamaHealth)
      .catch(() =>
        setOllamaHealth({ available: false, model: "llama3", error: "Network error" })
      );
  }, []);

  // Auto-classify when events change
  const classify = useCallback(
    async (evts: UserEvent[]) => {
      if (evts.length === 0) {
        setResult(null);
        return;
      }
      setIsClassifying(true);
      try {
        const res = await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ events: evts, useLLM }),
        });
        const data = await res.json();
        setResult(data);
      } catch (err) {
        console.error("Classification failed:", err);
      } finally {
        setIsClassifying(false);
      }
    },
    [useLLM]
  );

  useEffect(() => {
    const timer = setTimeout(() => classify(events), 300);
    return () => clearTimeout(timer);
  }, [events, classify]);

  // Scroll event list to top on new event
  useEffect(() => {
    eventListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [events.length]);

  const loadScenario = (id: string) => {
    const scenario = SCENARIOS.find((s) => s.id === id);
    if (scenario) setEvents(scenario.generate());
  };

  const addEvent = (type: EventType, data: UserEvent["data"] = {}) => {
    const evt = createCustomEvent(type, data);
    setEvents((prev) => [...prev, evt]);
  };

  const removeEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const clearAll = () => {
    setEvents([]);
    setResult(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <span className="text-accent-light">⚡</span>
              Shopper Intelligence Engine
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              Real-time shopper classification & personalization rules engine
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Ollama status */}
            <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]">
              <span
                className={`w-2 h-2 rounded-full pulse-dot ${
                  ollamaHealth?.available ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span className="text-[var(--text-muted)]">
                {ollamaHealth?.available
                  ? `LLM: ${ollamaHealth.model}`
                  : "LLM: offline (rules only)"}
              </span>
            </div>
            {/* LLM toggle */}
            <button
              onClick={() => setUseLLM(!useLLM)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                useLLM
                  ? "border-accent bg-accent/10 text-accent-light"
                  : "border-[var(--border)] text-[var(--text-muted)]"
              }`}
            >
              {useLLM ? "LLM On" : "LLM Off"}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-0 lg:gap-6 p-6">
        {/* Left panel: Event simulator */}
        <div className="flex flex-col gap-4">
          {/* Scenario picker */}
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
            <h2 className="text-sm font-semibold mb-3 text-[var(--text-muted)] uppercase tracking-wider">
              Load Scenario
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadScenario(s.id)}
                  className="text-left px-3 py-2.5 rounded-lg border border-[var(--border)] hover:border-accent/50 hover:bg-accent/5 transition-all group"
                >
                  <div className="text-sm font-medium group-hover:text-accent-light transition-colors">
                    {s.name}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
                    {s.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Event stream */}
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Event Stream
                {events.length > 0 && (
                  <span className="ml-2 text-accent-light font-mono">
                    ({events.length})
                  </span>
                )}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddEvent(!showAddEvent)}
                  className="text-xs px-2.5 py-1 rounded-md bg-accent/10 text-accent-light hover:bg-accent/20 transition-colors"
                >
                  + Add
                </button>
                <button
                  onClick={clearAll}
                  className="text-xs px-2.5 py-1 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Add event form */}
            {showAddEvent && <AddEventForm onAdd={addEvent} />}

            {/* Event list */}
            <div
              ref={eventListRef}
              className="flex-1 overflow-y-auto space-y-1.5 max-h-[400px]"
            >
              {events.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-muted)] text-sm">
                  Load a scenario or add events manually
                </div>
              ) : (
                [...events].reverse().map((evt) => (
                  <div
                    key={evt.id}
                    className="event-enter flex items-start gap-2.5 px-3 py-2 rounded-lg bg-[var(--surface-raised)] group"
                  >
                    <span className="text-base mt-0.5">
                      {EVENT_META[evt.type]?.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        {EVENT_META[evt.type]?.label}
                      </div>
                      <EventDetail event={evt} />
                    </div>
                    <button
                      onClick={() => removeEvent(evt.id)}
                      className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 transition-all text-xs mt-1"
                      title="Remove event"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right panel: Classification results */}
        <div className="flex flex-col gap-4">
          {/* Primary classification card */}
          {result?.classification ? (
            <ClassificationCard
              classification={result.classification}
              isClassifying={isClassifying}
              llmUsed={result.llmUsed}
            />
          ) : (
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-8 text-center">
              <div className="text-4xl mb-3">🎯</div>
              <div className="text-[var(--text-muted)]">
                Add events to see real-time classification
              </div>
            </div>
          )}

          {/* Score breakdown */}
          {result?.allScores && (
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5">
              <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
                All State Scores
              </h2>
              <div className="space-y-3">
                {result.allScores
                  .sort((a, b) => b.score - a.score)
                  .map((s) => {
                    const meta = STATE_META[s.state];
                    const isWinner =
                      s.state === result.classification.state;
                    return (
                      <div key={s.state} className="flex items-center gap-3">
                        <span className="text-lg w-7 text-center">
                          {meta.icon}
                        </span>
                        <span
                          className={`text-sm w-32 ${
                            isWinner ? "font-semibold" : "text-[var(--text-muted)]"
                          }`}
                        >
                          {meta.label}
                        </span>
                        <div className="flex-1 h-2.5 bg-[var(--surface-raised)] rounded-full overflow-hidden">
                          <div
                            className="score-bar h-full rounded-full"
                            style={{
                              width: `${s.score * 100}%`,
                              backgroundColor: isWinner
                                ? meta.color
                                : `${meta.color}66`,
                            }}
                          />
                        </div>
                        <span
                          className={`text-sm font-mono w-12 text-right ${
                            isWinner ? "text-white" : "text-[var(--text-muted)]"
                          }`}
                        >
                          {Math.round(s.score * 100)}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Evidence panel */}
          {result?.classification.evidence &&
            result.classification.evidence.length > 0 && (
              <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5">
                <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
                  Evidence
                </h2>
                <div className="space-y-3">
                  {result.classification.evidence.map((e, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 py-2 border-b border-[var(--border)] last:border-0"
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                        style={{
                          backgroundColor:
                            STATE_META[result.classification.state].color,
                        }}
                      />
                      <div>
                        <div className="text-sm font-medium">{e.signal}</div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">
                          {e.detail}
                        </div>
                      </div>
                      <span className="ml-auto text-xs font-mono text-[var(--text-muted)] flex-shrink-0">
                        +{Math.round(e.weight * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      </main>
    </div>
  );
}

// ── Classification Card ──────────────────────────────────────

function ClassificationCard({
  classification,
  isClassifying,
  llmUsed,
}: {
  classification: Classification;
  isClassifying: boolean;
  llmUsed: boolean;
}) {
  const meta = STATE_META[classification.state];
  const pct = Math.round(classification.confidence * 100);

  return (
    <div
      className="rounded-xl border-2 p-6 transition-colors"
      style={{
        borderColor: `${meta.color}40`,
        background: `linear-gradient(135deg, ${meta.color}08, transparent)`,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{meta.icon}</span>
          <div>
            <div className="text-xl font-bold" style={{ color: meta.color }}>
              {meta.label}
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              {meta.description}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold font-mono">{pct}%</div>
          <div className="text-xs text-[var(--text-muted)]">confidence</div>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="h-2 bg-[var(--surface-raised)] rounded-full overflow-hidden mb-5">
        <div
          className="confidence-bar h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: meta.color,
          }}
        />
      </div>

      {/* Nudge recommendation */}
      <div className="bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-accent-light">
            Recommended Action
          </span>
          {llmUsed && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent-light">
              AI-Enhanced
            </span>
          )}
          {isClassifying && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 animate-pulse">
              Analyzing...
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed">{classification.nudge}</p>
      </div>

      {/* LLM explanation */}
      {classification.llmExplanation && (
        <div className="mt-3 bg-[var(--surface)] rounded-lg p-4 border border-accent/20">
          <div className="text-xs font-semibold uppercase tracking-wider text-accent-light mb-2">
            AI Analysis
          </div>
          <p className="text-sm leading-relaxed text-[var(--text-muted)]">
            {classification.llmExplanation}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Event Detail ─────────────────────────────────────────────

function EventDetail({ event }: { event: UserEvent }) {
  const parts: string[] = [];
  if (event.data.productName) parts.push(event.data.productName);
  if (event.data.productPrice) parts.push(`$${event.data.productPrice}`);
  if (event.data.page) parts.push(event.data.page);
  if (event.data.query) parts.push(`"${event.data.query}"`);
  if (event.data.couponCode) parts.push(event.data.couponCode);

  if (parts.length === 0) return null;
  return (
    <div className="text-xs text-[var(--text-muted)] font-mono mt-0.5 truncate">
      {parts.join(" · ")}
    </div>
  );
}

// ── Add Event Form ───────────────────────────────────────────

function AddEventForm({
  onAdd,
}: {
  onAdd: (type: EventType, data: UserEvent["data"]) => void;
}) {
  const [type, setType] = useState<EventType>("page_view");
  const [page, setPage] = useState<PageType>("home");
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [query, setQuery] = useState("");
  const [couponCode, setCouponCode] = useState("");

  const eventTypes = Object.keys(EVENT_META) as EventType[];
  const pageTypes: PageType[] = [
    "home",
    "category",
    "product",
    "cart",
    "checkout",
    "sale",
    "search_results",
    "account",
  ];

  const needsPage = ["page_view"].includes(type);
  const needsProduct = [
    "product_view",
    "add_to_cart",
    "remove_from_cart",
    "review_view",
    "wishlist_add",
    "checkout_complete",
  ].includes(type);
  const needsQuery = ["search"].includes(type);
  const needsCoupon = ["apply_coupon", "coupon_fail"].includes(type);

  const handleSubmit = () => {
    const data: UserEvent["data"] = {};
    if (needsPage) data.page = page;
    if (needsProduct) {
      data.productName = productName || "Sample Product";
      data.productId = productName
        ? productName.toLowerCase().replace(/\s+/g, "-")
        : "sample-product";
      data.productCategory = "General";
      if (productPrice) data.productPrice = parseFloat(productPrice);
    }
    if (needsQuery) data.query = query || "search term";
    if (needsCoupon) data.couponCode = couponCode || "CODE10";
    onAdd(type, data);
  };

  return (
    <div className="mb-3 p-3 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] space-y-2.5">
      {/* Event type */}
      <div>
        <label className="text-xs text-[var(--text-muted)] block mb-1">
          Event Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as EventType)}
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-sm text-[var(--text)] focus:outline-none focus:border-accent"
        >
          {eventTypes.map((t) => (
            <option key={t} value={t}>
              {EVENT_META[t].icon} {EVENT_META[t].label}
            </option>
          ))}
        </select>
      </div>

      {/* Conditional fields */}
      {needsPage && (
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">
            Page
          </label>
          <select
            value={page}
            onChange={(e) => setPage(e.target.value as PageType)}
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-sm text-[var(--text)] focus:outline-none focus:border-accent"
          >
            {pageTypes.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      )}

      {needsProduct && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">
              Product Name
            </label>
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Running Shoes"
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">
              Price
            </label>
            <input
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value)}
              placeholder="49.99"
              type="number"
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      )}

      {needsQuery && (
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">
            Search Query
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. discount shoes"
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-accent"
          />
        </div>
      )}

      {needsCoupon && (
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">
            Coupon Code
          </label>
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="e.g. SAVE20"
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-accent"
          />
        </div>
      )}

      <button
        onClick={handleSubmit}
        className="w-full py-2 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors"
      >
        Add Event
      </button>
    </div>
  );
}
