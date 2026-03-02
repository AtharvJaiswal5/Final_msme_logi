// frontend/src/api/api.ts

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/* =====================================================
   🛒 PRODUCTS
===================================================== */
export async function getProducts() {
  const res = await fetch(`${BASE_URL}/products`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

/* =====================================================
   🧾 ORDERS
===================================================== */
export async function getOrders() {
  const res = await fetch(`${BASE_URL}/orders`);
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

export async function createOrder(payload: {
  buyer_id: string;
  seller_id: string;
  items: { product_id: string; quantity: number }[];
  delivery_lat?: number;
  delivery_lng?: number;
  delivery_address?: string;
}) {
  console.log("🔵 Sending order payload:", JSON.stringify(payload, null, 2));
  
  const res = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("❌ Order creation failed:", errorData);
    throw new Error(errorData.error || "Failed to place order");
  }
  return res.json();
}

export async function confirmOrder(
  orderId: string,
  payload: {
    driver_id: string;
    pickup_lat: number;
    pickup_lng: number;
    pickup_address?: string;
    drop_lat: number;
    drop_lng: number;
    drop_address?: string;
  }
) {
  const res = await fetch(
    `${BASE_URL}/orders/${orderId}/confirm`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) throw new Error("Failed to confirm order");
  return res.json();
}

/* =====================================================
   🚚 SHIPMENTS
===================================================== */
export async function getShipments() {
  const res = await fetch(`${BASE_URL}/shipments`);
  if (!res.ok) throw new Error("Failed to fetch shipments");
  return res.json();
}