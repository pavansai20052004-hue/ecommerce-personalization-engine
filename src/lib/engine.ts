import { UserEvent, ShopperState, Evidence, Classification } from "./types";

/**
 * Rule-based shopper classification engine.
 *
 * Design rationale: A deterministic rules engine gives us speed and
 * predictability. The LLM layer (Ollama) adds natural-language explanations
 * and nuanced nudge recommendations on top. If the LLM is unavailable,
 * the engine still produces a fully usable classification.
 *
 * Each classifier function returns a score (0–1) and its supporting evidence.
 * The engine picks the highest-scoring state.
 */

interface ScoredState {
  state: ShopperState;
  score: number;
  evidence: Evidence[];
  nudge: string;
}

// ── Helper extractors ────────────────────────────────────────

function countByType(events: UserEvent[], type: string): number {
  return events.filter((e) => e.type === type).length;
}

function uniqueProducts(events: UserEvent[]): Set<string> {
  const ids = new Set<string>();
  events.forEach((e) => {
    if (e.data.productId) ids.add(e.data.productId);
  });
  return ids;
}

function uniqueCategories(events: UserEvent[]): Set<string> {
  const cats = new Set<string>();
  events.forEach((e) => {
    if (e.data.productCategory) cats.add(e.data.productCategory);
  });
  return cats;
}

function hasEvent(events: UserEvent[], type: string): boolean {
  return events.some((e) => e.type === type);
}

function sessionDurationMs(events: UserEvent[]): number {
  if (events.length < 2) return 0;
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  return sorted[sorted.length - 1].timestamp - sorted[0].timestamp;
}

// ── Individual state scorers ─────────────────────────────────

function scoreBrowser(events: UserEvent[]): ScoredState {
  const evidence: Evidence[] = [];
  let score = 0;

  const pageViews = countByType(events, "page_view");
  const productViews = countByType(events, "product_view");
  const cartAdds = countByType(events, "add_to_cart");
  const totalEvents = events.length;

  // High page views, low product engagement
  if (pageViews >= 3 && productViews <= 1) {
    score += 0.3;
    evidence.push({
      signal: "High browse, low product focus",
      weight: 0.3,
      detail: `${pageViews} page views but only ${productViews} product views`,
    });
  }

  // No cart activity
  if (cartAdds === 0 && totalEvents >= 3) {
    score += 0.25;
    evidence.push({
      signal: "No cart engagement",
      weight: 0.25,
      detail: "Zero add-to-cart actions in session",
    });
  }

  // Browsing mostly home/category pages
  const homeCatViews = events.filter(
    (e) =>
      e.type === "page_view" &&
      (e.data.page === "home" || e.data.page === "category")
  ).length;
  if (homeCatViews >= 2) {
    score += 0.2;
    evidence.push({
      signal: "Category-level browsing",
      weight: 0.2,
      detail: `${homeCatViews} home/category page views — exploring, not drilling down`,
    });
  }

  // Short session with few interactions
  if (totalEvents <= 4 && totalEvents >= 2) {
    score += 0.15;
    evidence.push({
      signal: "Light engagement",
      weight: 0.15,
      detail: `Only ${totalEvents} events — casual visit pattern`,
    });
  }

  return {
    state: "browser",
    score: Math.min(score, 1),
    evidence,
    nudge:
      "Show trending products or personalized category highlights to convert browsing into engagement.",
  };
}

function scoreComparer(events: UserEvent[]): ScoredState {
  const evidence: Evidence[] = [];
  let score = 0;

  const uniqueProds = uniqueProducts(events);
  const productViews = countByType(events, "product_view");
  const compareViews = countByType(events, "compare_view");
  const reviewViews = countByType(events, "review_view");
  const filterUses = countByType(events, "filter_use");
  const uniqueCats = uniqueCategories(events);

  // Multiple product views
  if (uniqueProds.size >= 3) {
    score += 0.35;
    evidence.push({
      signal: "Multi-product evaluation",
      weight: 0.35,
      detail: `Viewed ${uniqueProds.size} different products — actively comparing`,
    });
  } else if (uniqueProds.size === 2) {
    score += 0.2;
    evidence.push({
      signal: "Pair comparison",
      weight: 0.2,
      detail: "Viewed 2 different products",
    });
  }

  // Explicit compare action
  if (compareViews > 0) {
    score += 0.25;
    evidence.push({
      signal: "Used comparison tool",
      weight: 0.25,
      detail: `${compareViews} compare view(s) — deliberate evaluation`,
    });
  }

  // Reading reviews = evaluating
  if (reviewViews >= 2) {
    score += 0.2;
    evidence.push({
      signal: "Review research",
      weight: 0.2,
      detail: `Read ${reviewViews} reviews — seeking validation`,
    });
  }

  // Using filters = narrowing down
  if (filterUses >= 2) {
    score += 0.15;
    evidence.push({
      signal: "Active filtering",
      weight: 0.15,
      detail: `Used filters ${filterUses} times — refining criteria`,
    });
  }

  // Same category, multiple products = comparing within category
  if (uniqueCats.size === 1 && uniqueProds.size >= 2) {
    score += 0.15;
    evidence.push({
      signal: "In-category comparison",
      weight: 0.15,
      detail: `${uniqueProds.size} products viewed in same category`,
    });
  }

  return {
    state: "comparer",
    score: Math.min(score, 1),
    evidence,
    nudge:
      "Surface a comparison table, highlight key differentiators, or show 'customers also considered' to help them decide.",
  };
}

function scoreDiscountSeeker(events: UserEvent[]): ScoredState {
  const evidence: Evidence[] = [];
  let score = 0;

  const couponAttempts = countByType(events, "apply_coupon");
  const couponFails = countByType(events, "coupon_fail");
  const salePageViews = events.filter(
    (e) => e.type === "page_view" && e.data.page === "sale"
  ).length;
  const searches = events.filter((e) => e.type === "search");
  const discountSearches = searches.filter((e) => {
    const q = (e.data.query || "").toLowerCase();
    return (
      q.includes("sale") ||
      q.includes("deal") ||
      q.includes("discount") ||
      q.includes("coupon") ||
      q.includes("offer") ||
      q.includes("cheap") ||
      q.includes("clearance")
    );
  });

  // Coupon attempts are a strong signal
  if (couponAttempts >= 1) {
    score += 0.4;
    evidence.push({
      signal: "Coupon usage",
      weight: 0.4,
      detail: `Applied ${couponAttempts} coupon(s) — actively seeking discounts`,
    });
  }

  // Failed coupons = desperate for a deal
  if (couponFails >= 1) {
    score += 0.2;
    evidence.push({
      signal: "Failed coupon attempts",
      weight: 0.2,
      detail: `${couponFails} failed coupon attempt(s) — trying multiple codes`,
    });
  }

  // Visiting sale pages
  if (salePageViews >= 1) {
    score += 0.2;
    evidence.push({
      signal: "Sale page visits",
      weight: 0.2,
      detail: `Visited sale/clearance pages ${salePageViews} time(s)`,
    });
  }

  // Searching for deals
  if (discountSearches.length >= 1) {
    score += 0.25;
    evidence.push({
      signal: "Deal-seeking searches",
      weight: 0.25,
      detail: `Searched for: ${discountSearches.map((e) => `"${e.data.query}"`).join(", ")}`,
    });
  }

  return {
    state: "discount_seeker",
    score: Math.min(score, 1),
    evidence,
    nudge:
      "Offer a time-limited discount, free shipping threshold, or bundle deal to convert price sensitivity into a purchase.",
  };
}

function scoreCartAbandoner(events: UserEvent[]): ScoredState {
  const evidence: Evidence[] = [];
  let score = 0;

  const cartAdds = countByType(events, "add_to_cart");
  const cartRemoves = countByType(events, "remove_from_cart");
  const cartViews = countByType(events, "cart_view");
  const checkoutStarts = countByType(events, "checkout_start");
  const checkoutCompletes = countByType(events, "checkout_complete");

  const hasItemsInCart = cartAdds > cartRemoves;
  const startedCheckout = checkoutStarts > 0;
  const completedCheckout = checkoutCompletes > 0;

  // Has items in cart but hasn't completed
  if (hasItemsInCart && !completedCheckout) {
    score += 0.35;
    evidence.push({
      signal: "Unpurchased cart items",
      weight: 0.35,
      detail: `${cartAdds - cartRemoves} item(s) in cart without checkout completion`,
    });
  }

  // Started but didn't finish checkout
  if (startedCheckout && !completedCheckout) {
    score += 0.35;
    evidence.push({
      signal: "Checkout abandoned",
      weight: 0.35,
      detail: "Started checkout process but did not complete — friction point detected",
    });
  }

  // Multiple cart views without purchasing = hesitation
  if (cartViews >= 2 && !completedCheckout) {
    score += 0.2;
    evidence.push({
      signal: "Cart revisits",
      weight: 0.2,
      detail: `Viewed cart ${cartViews} times without purchasing — deliberating`,
    });
  }

  // Removing items = second-guessing
  if (cartRemoves >= 1) {
    score += 0.15;
    evidence.push({
      signal: "Item removal",
      weight: 0.15,
      detail: `Removed ${cartRemoves} item(s) from cart — reconsidering choices`,
    });
  }

  return {
    state: "cart_abandoner",
    score: Math.min(score, 1),
    evidence,
    nudge:
      "Trigger an exit-intent overlay with a small incentive, show trust badges, or offer guest checkout to reduce friction.",
  };
}

function scoreLoyalCustomer(events: UserEvent[]): ScoredState {
  const evidence: Evidence[] = [];
  let score = 0;

  const returnVisits = countByType(events, "return_visit");
  const checkoutCompletes = countByType(events, "checkout_complete");
  const wishlistAdds = countByType(events, "wishlist_add");
  const reviewViews = countByType(events, "review_view");
  const totalEvents = events.length;
  const accountViews = events.filter(
    (e) => e.type === "page_view" && e.data.page === "account"
  ).length;

  // Return visits are the strongest loyalty signal
  if (returnVisits >= 2) {
    score += 0.35;
    evidence.push({
      signal: "Repeat visitor",
      weight: 0.35,
      detail: `${returnVisits} return visits — established relationship`,
    });
  } else if (returnVisits === 1) {
    score += 0.15;
    evidence.push({
      signal: "Returning visitor",
      weight: 0.15,
      detail: "At least one return visit",
    });
  }

  // Past purchases
  if (checkoutCompletes >= 1) {
    score += 0.3;
    evidence.push({
      signal: "Purchase history",
      weight: 0.3,
      detail: `${checkoutCompletes} completed purchase(s) in session data`,
    });
  }

  // Wishlisting = future intent + investment
  if (wishlistAdds >= 1) {
    score += 0.15;
    evidence.push({
      signal: "Wishlist engagement",
      weight: 0.15,
      detail: `Added ${wishlistAdds} item(s) to wishlist — invested in the brand`,
    });
  }

  // Account page visits = established customer
  if (accountViews >= 1) {
    score += 0.15;
    evidence.push({
      signal: "Account engagement",
      weight: 0.15,
      detail: "Visiting account pages — active customer relationship",
    });
  }

  // High overall engagement
  if (totalEvents >= 8) {
    score += 0.1;
    evidence.push({
      signal: "Deep engagement",
      weight: 0.1,
      detail: `${totalEvents} total events — highly engaged session`,
    });
  }

  return {
    state: "loyal_customer",
    score: Math.min(score, 1),
    evidence,
    nudge:
      "Show early access to new arrivals, loyalty rewards, or a personalized 'picked for you' section to deepen the relationship.",
  };
}

// ── Main classification function ─────────────────────────────

export function classifySession(events: UserEvent[]): Classification {
  if (events.length === 0) {
    return {
      state: "browser",
      confidence: 0,
      evidence: [],
      nudge: "No events yet — waiting for user activity.",
    };
  }

  const scores: ScoredState[] = [
    scoreBrowser(events),
    scoreComparer(events),
    scoreDiscountSeeker(events),
    scoreCartAbandoner(events),
    scoreLoyalCustomer(events),
  ];

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  const winner = scores[0];

  // Confidence is the gap between top and second score, normalized
  const runnerUp = scores[1];
  const gap = winner.score - runnerUp.score;
  const confidence = Math.min(
    winner.score * 0.7 + gap * 0.3, // Weighted: raw score + decisiveness
    1
  );

  return {
    state: winner.state,
    confidence: Math.round(confidence * 100) / 100,
    evidence: winner.evidence,
    nudge: winner.nudge,
  };
}

// ── All scores (for the debug/comparison view) ───────────────

export function allScores(
  events: UserEvent[]
): { state: ShopperState; score: number }[] {
  if (events.length === 0) {
    return [
      { state: "browser", score: 0 },
      { state: "comparer", score: 0 },
      { state: "discount_seeker", score: 0 },
      { state: "cart_abandoner", score: 0 },
      { state: "loyal_customer", score: 0 },
    ];
  }

  return [
    scoreBrowser(events),
    scoreComparer(events),
    scoreDiscountSeeker(events),
    scoreCartAbandoner(events),
    scoreLoyalCustomer(events),
  ].map((s) => ({ state: s.state, score: Math.round(s.score * 100) / 100 }));
}
