import { UserEvent, EventType, PageType } from "./types";

let eventCounter = 0;

function makeEvent(
  type: EventType,
  data: UserEvent["data"] = {},
  offsetMs = 0
): UserEvent {
  eventCounter++;
  return {
    id: `evt_${eventCounter}_${Date.now()}`,
    type,
    timestamp: Date.now() + offsetMs,
    data,
  };
}

// ── Preset scenarios ─────────────────────────────────────────

export function casualBrowserScenario(): UserEvent[] {
  return [
    makeEvent("page_view", { page: "home" }, 0),
    makeEvent("page_view", { page: "category" }, 8000),
    makeEvent("page_view", { page: "category" }, 20000),
    makeEvent(
      "product_view",
      {
        page: "product",
        productId: "sneaker-01",
        productName: "Classic Runner V2",
        productCategory: "Sneakers",
        productPrice: 89.99,
      },
      35000
    ),
    makeEvent("page_view", { page: "home" }, 50000),
  ];
}

export function comparerScenario(): UserEvent[] {
  return [
    makeEvent("page_view", { page: "category" }, 0),
    makeEvent(
      "product_view",
      {
        page: "product",
        productId: "laptop-01",
        productName: 'ProBook 14"',
        productCategory: "Laptops",
        productPrice: 999,
      },
      5000
    ),
    makeEvent(
      "review_view",
      { productId: "laptop-01", productName: 'ProBook 14"' },
      15000
    ),
    makeEvent(
      "product_view",
      {
        page: "product",
        productId: "laptop-02",
        productName: "UltraSlim X1",
        productCategory: "Laptops",
        productPrice: 1199,
      },
      25000
    ),
    makeEvent(
      "review_view",
      { productId: "laptop-02", productName: "UltraSlim X1" },
      35000
    ),
    makeEvent(
      "product_view",
      {
        page: "product",
        productId: "laptop-03",
        productName: "WorkStation Pro",
        productCategory: "Laptops",
        productPrice: 1399,
      },
      45000
    ),
    makeEvent("compare_view", {}, 55000),
    makeEvent("filter_use", {}, 60000),
    makeEvent("filter_use", {}, 65000),
  ];
}

export function discountSeekerScenario(): UserEvent[] {
  return [
    makeEvent("page_view", { page: "sale" }, 0),
    makeEvent("search", { query: "discount deals" }, 8000),
    makeEvent(
      "product_view",
      {
        page: "product",
        productId: "dress-01",
        productName: "Summer Wrap Dress",
        productCategory: "Dresses",
        productPrice: 45.99,
      },
      15000
    ),
    makeEvent(
      "add_to_cart",
      {
        productId: "dress-01",
        productName: "Summer Wrap Dress",
        productPrice: 45.99,
      },
      25000
    ),
    makeEvent("apply_coupon", { couponCode: "SAVE20" }, 30000),
    makeEvent("coupon_fail", { couponCode: "SAVE20" }, 31000),
    makeEvent("apply_coupon", { couponCode: "SUMMER10" }, 35000),
    makeEvent("search", { query: "clearance shoes" }, 45000),
    makeEvent("page_view", { page: "sale" }, 55000),
  ];
}

export function cartAbandonerScenario(): UserEvent[] {
  return [
    makeEvent(
      "product_view",
      {
        page: "product",
        productId: "watch-01",
        productName: "Chrono Sport Watch",
        productCategory: "Watches",
        productPrice: 249.99,
      },
      0
    ),
    makeEvent(
      "add_to_cart",
      {
        productId: "watch-01",
        productName: "Chrono Sport Watch",
        productPrice: 249.99,
      },
      12000
    ),
    makeEvent(
      "product_view",
      {
        page: "product",
        productId: "strap-01",
        productName: "Leather Watch Strap",
        productCategory: "Accessories",
        productPrice: 34.99,
      },
      22000
    ),
    makeEvent(
      "add_to_cart",
      {
        productId: "strap-01",
        productName: "Leather Watch Strap",
        productPrice: 34.99,
      },
      28000
    ),
    makeEvent("cart_view", {}, 35000),
    makeEvent("checkout_start", {}, 45000),
    makeEvent("cart_view", {}, 60000),
    makeEvent(
      "remove_from_cart",
      {
        productId: "strap-01",
        productName: "Leather Watch Strap",
      },
      70000
    ),
    makeEvent("cart_view", {}, 80000),
  ];
}

export function loyalCustomerScenario(): UserEvent[] {
  return [
    makeEvent("return_visit", {}, 0),
    makeEvent("return_visit", {}, 1000),
    makeEvent("page_view", { page: "account" }, 3000),
    makeEvent(
      "product_view",
      {
        page: "product",
        productId: "coffee-01",
        productName: "Ethiopian Single Origin",
        productCategory: "Coffee",
        productPrice: 18.99,
      },
      10000
    ),
    makeEvent(
      "add_to_cart",
      {
        productId: "coffee-01",
        productName: "Ethiopian Single Origin",
        productPrice: 18.99,
      },
      15000
    ),
    makeEvent(
      "wishlist_add",
      {
        productId: "coffee-02",
        productName: "Colombian Dark Roast",
        productCategory: "Coffee",
      },
      25000
    ),
    makeEvent("checkout_start", {}, 35000),
    makeEvent(
      "checkout_complete",
      { productId: "coffee-01", productPrice: 18.99 },
      50000
    ),
  ];
}

// ── Scenario registry ────────────────────────────────────────

export interface Scenario {
  id: string;
  name: string;
  description: string;
  expectedState: string;
  generate: () => UserEvent[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: "browser",
    name: "Casual Browser",
    description: "Window shopping across categories with minimal engagement",
    expectedState: "browser",
    generate: casualBrowserScenario,
  },
  {
    id: "comparer",
    name: "Product Comparer",
    description: "Evaluating multiple laptops, reading reviews, using filters",
    expectedState: "comparer",
    generate: comparerScenario,
  },
  {
    id: "discount",
    name: "Discount Hunter",
    description: "Browsing sales, searching deals, trying coupon codes",
    expectedState: "discount_seeker",
    generate: discountSeekerScenario,
  },
  {
    id: "abandoner",
    name: "Cart Abandoner",
    description: "Added items, started checkout, then stalled and removed items",
    expectedState: "cart_abandoner",
    generate: cartAbandonerScenario,
  },
  {
    id: "loyal",
    name: "Loyal Customer",
    description: "Return visitor, checks account, purchases, uses wishlist",
    expectedState: "loyal_customer",
    generate: loyalCustomerScenario,
  },
];

// ── Build a single custom event ──────────────────────────────

export function createCustomEvent(
  type: EventType,
  data: UserEvent["data"] = {}
): UserEvent {
  return makeEvent(type, data);
}
