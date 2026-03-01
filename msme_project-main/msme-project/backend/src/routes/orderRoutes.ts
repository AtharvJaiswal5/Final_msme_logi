import express, { Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { emitOrderCreated, emitOrderConfirmed } from "../lib/socket";
import { validateCreateOrder, validateConfirmOrder, validateUUIDParam, sanitizeBody } from "../middleware/validation";
import { orderLimiter, readLimiter } from "../middleware/rateLimiter";

const router = express.Router();

/* -----------------------------------------------------
   🧾 CREATE ORDER WITH ITEMS (Buyer)
   Security: Rate limited, input validated, sanitized
----------------------------------------------------- */
router.post(
  "/",
  (req, res, next) => {
    console.log("🔵 POST /orders - Request received!");
    console.log("🔵 Raw body:", JSON.stringify(req.body, null, 2));
    next();
  },
  orderLimiter, // Specific rate limit for order creation
  sanitizeBody(["buyer_id", "seller_id", "items", "delivery_lat", "delivery_lng", "delivery_address"]),
  (req, res, next) => {
    console.log("🟢 After sanitizeBody:", JSON.stringify(req.body, null, 2));
    next();
  },
  validateCreateOrder,
  async (req: Request, res: Response) => {

  console.log("📥 Incoming Order Payload:", req.body);

  const { buyer_id, seller_id, items, delivery_lat, delivery_lng, delivery_address } = req.body;

  if (!buyer_id || !seller_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).send({
      message: "Invalid order payload",
      received: req.body
    });
  }

  // 1️⃣ Create Order with delivery location
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert([
      {
        buyer_id,
        seller_id,
        status: "PENDING_CONFIRMATION",
        delivery_lat: delivery_lat || null,
        delivery_lng: delivery_lng || null,
        delivery_address: delivery_address || null
      }
    ])
    .select()
    .single();

  if (orderError || !order) {
    console.error("❌ Order creation failed:", orderError);
    return res.status(400).send(orderError);
  }

  console.log("✅ Order created:", order.id);

  // 2️⃣ Process each item
  for (const item of items) {
    console.log("Processing item:", item);

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, price, stock_quantity")
      .eq("id", item.product_id)
      .single();

    if (productError || !product) {
      console.error("❌ Product fetch failed:", productError);
      return res.status(400).send({
        message: "Product not found",
        product_id: item.product_id
      });
    }

    console.log("✅ Product found:", product.id, product.price);

    // Stock check
    if (product.stock_quantity < item.quantity) {
      return res.status(400).send({
        message: "Insufficient stock",
        available: product.stock_quantity,
        requested: item.quantity
      });
    }

    // Insert order item
    console.log("Inserting order item:", { order_id: order.id, product_id: item.product_id, quantity: item.quantity });
    const { error: itemError } = await supabase
      .from("order_items")
      .insert([
        {
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price_at_purchase: product.price
        }
      ]);

    if (itemError) {
      console.error("❌ Order item insert failed:", itemError);
      return res.status(400).send(itemError);
    }

    console.log("✅ Order item inserted");

    // Deduct inventory
    const newStock = product.stock_quantity - item.quantity;

    const { error: stockError } = await supabase
      .from("products")
      .update({ stock_quantity: newStock })
      .eq("id", item.product_id);

    if (stockError) {
      console.error("❌ Inventory update failed:", stockError);
      return res.status(400).send(stockError);
    }
    
    console.log("✅ Inventory updated");
  }

  // Emit real-time event to seller and buyer
  emitOrderCreated(order);

  res.send({
    message: "Order placed successfully",
    order_id: order.id
  });
});

/* -----------------------------------------------------
   🧾 GET ALL ORDERS (Admin / Seller / Buyer)
   Security: Lenient rate limit for dashboard reads
----------------------------------------------------- */
router.get("/", readLimiter, async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(400).send(error);
  }

  res.send(data);
});

/* -----------------------------------------------------
   🧾 GET SINGLE ORDER (With Items + Product Details)
   Security: UUID validation, lenient rate limit
----------------------------------------------------- */
router.get(
  "/:order_id",
  readLimiter, // Lenient rate limit for frequent reads
  validateUUIDParam("order_id"),
  async (req: Request, res: Response) => {
  const { order_id } = req.params;

  console.log("🔍 Fetching order:", order_id);

  // Fetch order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", order_id)
    .single();

  if (orderError || !order) {
    console.error("❌ Order fetch error:", orderError);
    return res.status(400).send(orderError);
  }

  console.log("✅ Order found");

  // Fetch order items
  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order_id);

  console.log("📦 Order items count:", orderItems?.length || 0);
  console.log("📦 Order items data:", JSON.stringify(orderItems));

  if (itemsError) {
    console.error("❌ Error fetching order items:", itemsError);
    return res.status(400).send(itemsError);
  }

  // Fetch product details for each item
  const itemsWithProducts = await Promise.all(
    (orderItems || []).map(async (item: any) => {
      const { data: product } = await supabase
        .from("products")
        .select("id, name, price, stock_quantity")
        .eq("id", item.product_id)
        .single();

      return {
        ...item,
        products: product
      };
    })
  );

  console.log("✅ Sending response with", itemsWithProducts.length, "items");

  res.send({
    ...order,
    order_items: itemsWithProducts
  });
});

/* -----------------------------------------------------
   ✅ SELLER CONFIRMS ORDER → AUTO CREATE SHIPMENT
   Security: Input validated, sanitized
----------------------------------------------------- */
router.patch(
  "/:order_id/confirm",
  sanitizeBody(["driver_id", "pickup_lat", "pickup_lng", "pickup_address", "drop_lat", "drop_lng", "drop_address"]),
  validateConfirmOrder,
  async (req: Request, res: Response) => {
  const { order_id } = req.params;
  const { driver_id, pickup_lat, pickup_lng, pickup_address, drop_lat, drop_lng, drop_address } = req.body;

  // 1️⃣ Update order status
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .update({ status: "CONFIRMED" })
    .eq("id", order_id)
    .select()
    .single();

  if (orderError || !order) {
    return res.status(400).send(orderError);
  }

  // 2️⃣ Generate geofence zone ID for delivery location
  const geofenceZoneId = `zone_${order_id.slice(0, 8)}_${Date.now()}`;

  // 3️⃣ Auto-create shipment with geofence and addresses
  const { data: shipment, error: shipmentError } = await supabase
    .from("shipments")
    .insert([
      {
        order_id: order.id,
        driver_id,
        pickup_lat,
        pickup_lng,
        pickup_address: pickup_address || null,
        drop_lat,
        drop_lng,
        drop_address: drop_address || null,
        status: "CREATED",
        geofence_zone_id: geofenceZoneId
      }
    ])
    .select()
    .single();

  if (shipmentError) {
    return res.status(400).send(shipmentError);
  }

  // Emit real-time event to buyer and driver
  emitOrderConfirmed(order, shipment);

  res.send({
    message: "Order confirmed & shipment created with geofence",
    order,
    shipment
  });
});

export default router;