// ── Event Types ──────────────────────────────────────────────

export type EventType =
  | "page_view"
  | "product_view"
  | "add_to_cart"
  | "remove_from_cart"
  | "cart_view"
  | "checkout_start"
  | "checkout_complete"
  | "search"
  | "apply_coupon"
  | "coupon_fail"
  | "wishlist_add"
  | "review_view"
  | "compare_view"
  | "return_visit"
  | "filter_use";

export type PageType =
  | "home"
  | "category"
  | "product"
  | "cart"
  | "checkout"
  | "sale"
  | "search_results"
  | "account";

export interface UserEvent {
  id: string;
  type: EventType;
  timestamp: number;
  data: {
    page?: PageType;
    productId?: string;
    productName?: string;
    productCategory?: string;
    productPrice?: number;
    query?: string;
    couponCode?: string;
    referrer?: string;
    [key: string]: unknown;
  };
}

// ── Classification Types ─────────────────────────────────────

export type ShopperState =
  | "browser"
  | "comparer"
  | "discount_seeker"
  | "cart_abandoner"
  | "loyal_customer";

export interface Evidence {
  signal: string;
  weight: number; // 0–1
  detail: string;
}

export interface Classification {
  state: ShopperState;
  confidence: number; // 0–1
  evidence: Evidence[];
  nudge: string;
  llmExplanation?: string;
}

export interface Session {
  id: string;
  events: UserEvent[];
  classification: Classification | null;
  isClassifying: boolean;
}

// ── State metadata ───────────────────────────────────────────

export const STATE_META: Record<
  ShopperState,
  { label: string; color: string; icon: string; description: string }
> = {
  browser: {
    label: "Browser",
    color: "#94a3b8",
    icon: "👀",
    description: "Casually exploring, low purchase intent",
  },
  comparer: {
    label: "Comparer",
    color: "#f59e0b",
    icon: "⚖️",
    description: "Actively evaluating options across products",
  },
  discount_seeker: {
    label: "Discount Seeker",
    color: "#ec4899",
    icon: "🏷️",
    description: "Price-sensitive, hunting for deals",
  },
  cart_abandoner: {
    label: "Cart Abandoner",
    color: "#ef4444",
    icon: "🛒",
    description: "Added items but stalling at checkout",
  },
  loyal_customer: {
    label: "Loyal Customer",
    color: "#10b981",
    icon: "💎",
    description: "High engagement, repeat behavior",
  },
};

// ── Event metadata ───────────────────────────────────────────

export const EVENT_META: Record<EventType, { label: string; icon: string }> = {
  page_view: { label: "Page View", icon: "📄" },
  product_view: { label: "Product View", icon: "👁️" },
  add_to_cart: { label: "Add to Cart", icon: "🛒" },
  remove_from_cart: { label: "Remove from Cart", icon: "❌" },
  cart_view: { label: "View Cart", icon: "🧺" },
  checkout_start: { label: "Start Checkout", icon: "💳" },
  checkout_complete: { label: "Complete Purchase", icon: "✅" },
  search: { label: "Search", icon: "🔍" },
  apply_coupon: { label: "Apply Coupon", icon: "🎟️" },
  coupon_fail: { label: "Coupon Failed", icon: "🚫" },
  wishlist_add: { label: "Add to Wishlist", icon: "❤️" },
  review_view: { label: "Read Reviews", icon: "⭐" },
  compare_view: { label: "Compare Products", icon: "🔄" },
  return_visit: { label: "Return Visit", icon: "🔁" },
  filter_use: { label: "Use Filters", icon: "🎚️" },
};
