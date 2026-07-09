# ⚡ Shopper Intelligence Engine

**LLM-powered ecommerce personalization rules engine** — classifies shoppers in real time based on behavioral event streams and recommends targeted site actions.

Built for the Helium Software Engineer assessment (Option C).

---

## What it does

Feed a user's shopping session events into the engine and it will:

1. **Classify the shopper** into one of five behavioral states:
   - 👀 **Browser** — casually exploring, low purchase intent
   - ⚖️ **Comparer** — actively evaluating options across products
   - 🏷️ **Discount Seeker** — price-sensitive, hunting for deals
   - 🛒 **Cart Abandoner** — added items but stalling at checkout
   - 💎 **Loyal Customer** — high engagement, repeat behavior

2. **Explain the evidence** — every classification comes with specific signals, their weights, and details referencing actual session data

3. **Recommend a nudge** — a specific, actionable site intervention (exit-intent overlay, comparison table, time-limited discount, etc.)

4. **Live simulator** — add, remove, and modify events in real time and watch the classification update instantly

## Architecture

```
┌─────────────────────────────────────────────┐
│  Next.js Frontend (React)                   │
│  ├── Event Simulator (add/remove/presets)   │
│  ├── Classification Dashboard               │
│  └── Score Breakdown + Evidence Panel        │
└──────────────┬──────────────────────────────┘
               │ POST /api/classify
┌──────────────▼──────────────────────────────┐
│  Classification API                          │
│  ├── Rule Engine (deterministic, instant)    │
│  │   └── 5 scorer functions with evidence    │
│  └── LLM Layer (Ollama, optional)            │
│      └── Natural language explanation +      │
│          context-aware nudge                 │
└─────────────────────────────────────────────┘
```

**Design decisions:**

- **Two-layer classification**: The rule engine runs instantly and gives deterministic, reproducible results. The LLM layer adds natural language explanations that reference specific products and behaviors from the session. If Ollama is unavailable, the app works perfectly with the rule engine alone.

- **Evidence-based scoring**: Each state has a dedicated scorer that looks for specific behavioral signals (coupon attempts, compare views, cart-without-checkout, return visits, etc.). Scores are weighted and the winner is picked by highest aggregate. Confidence factors in the gap between the top two scores — a narrow win = lower confidence.

- **Real-time reactivity**: The frontend debounces classification calls (300ms) so adding/removing events gives near-instant feedback without hammering the API.

## Getting started

### Prerequisites

- Node.js 18+
- [Ollama](https://ollama.ai) (optional, for LLM-enhanced explanations)

### Setup

```bash
# Install dependencies
npm install

# (Optional) Pull an Ollama model for LLM enhancement
ollama pull llama3

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Configuration

Edit `.env.local`:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

The app auto-detects whether Ollama is available and shows the status in the header. LLM can be toggled on/off from the UI.

## How to use

1. **Load a preset scenario** — click any of the five scenario cards (Casual Browser, Product Comparer, Discount Hunter, Cart Abandoner, Loyal Customer) to populate a realistic event stream

2. **Watch the classification** — the right panel immediately shows the detected state, confidence, evidence, and recommended action

3. **Modify the stream** — add custom events (with product names, prices, search queries, coupon codes) or remove existing ones and see the classification shift in real time

4. **Compare scores** — the "All State Scores" section shows how close other classifications are, revealing edge cases and mixed-signal sessions

## Tech stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** (custom dark theme)
- **Ollama** (local LLM, defaults to llama3)
- No external dependencies beyond Next.js and React

## Project structure

```
src/
├── app/
│   ├── api/classify/route.ts   # Classification API endpoint
│   ├── globals.css              # Tailwind + custom styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Main interactive UI
└── lib/
    ├── types.ts                 # Event, classification, state types
    ├── engine.ts                # Rule-based classification engine
    ├── ollama.ts                # Ollama LLM integration
    └── scenarios.ts             # Preset scenario generators
```
