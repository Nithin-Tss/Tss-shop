import { API_URL } from "@/lib/api";

// Guest cart + checkout client for a store's public storefront API.
// The cart belongs to a random session id kept in this browser.

const SESSION_KEY = "tss-cart-session";

function sessionId() {
  let id = null;
  try {
    id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
  } catch {
    id = id || crypto.randomUUID();
  }
  return id;
}

function message(data, fallback) {
  if (Array.isArray(data)) return String(data[0] ?? fallback);
  if (data?.detail) return String(data.detail);
  const first = data && typeof data === "object" ? Object.values(data)[0] : null;
  if (Array.isArray(first)) return String(first[0]);
  return typeof first === "string" ? first : fallback;
}

async function call(storeSlug, path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_URL}/api/v1/storefront/${storeSlug}/${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-Cart-Session": sessionId() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(message(data, "Something went wrong. Please try again."));
  return data;
}

export const storefront = {
  getCart: (slug) => call(slug, "cart/"),
  clearCart: (slug) => call(slug, "cart/", { method: "DELETE" }),
  addItem: (slug, product, quantity = 1, variant) =>
    call(slug, "cart/items/", {
      method: "POST",
      body: { product, quantity, ...(variant ? { variant } : {}) },
    }),
  setQuantity: (slug, itemId, quantity) =>
    call(slug, `cart/items/${itemId}/`, { method: "PATCH", body: { quantity } }),
  startCheckout: (slug, details = {}) => call(slug, "checkout/", { method: "POST", body: details }),
  updateCheckout: (slug, id, details) =>
    call(slug, `checkout/${id}/`, { method: "PATCH", body: details }),
  completeCheckout: (slug, id, paymentMethod = "cod") =>
    call(slug, `checkout/${id}/complete/`, {
      method: "POST",
      body: { payment_method: paymentMethod },
    }),
  orders: (slug) => call(slug, "orders/"),
  cancelOrder: (slug, id) => call(slug, `orders/${id}/cancel/`, { method: "POST" }),
};
