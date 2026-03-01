import { useEffect, useState, useCallback } from "react";
import {
  getProducts,
  createOrder,
  getOrders,
  getShipments,
} from "../api/api";

import StatusBadge from "../components/StatusBadge";
import OrderTimeline from "../components/OrderTimeline";
import { useGeolocation } from "../hooks/useGeolocation";
import { useSocket, useSocketEvent } from "../hooks/useSocket";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";

export default function Buyer() {
  const { toasts, removeToast, success, error, warning } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deliveryLat, setDeliveryLat] = useState("");
  const [deliveryLng, setDeliveryLng] = useState("");
  const [driverNearby, setDriverNearby] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<Record<string, any>>({});

  const BUYER_ID = "96d6f8b0-c504-40f6-8a31-b0b160fb7a4e";
  const SELLER_ID = "c319182e-b86a-4a13-b2e2-1c01a8f64f54";

  // Initialize WebSocket connection
  const socket = useSocket("buyer", BUYER_ID);

  // Auto-detect buyer's location for delivery
  const geoLocation = useGeolocation({ watch: false });

  // Auto-fill delivery location when detected
  useEffect(() => {
    if (geoLocation.latitude && geoLocation.longitude) {
      setDeliveryLat(geoLocation.latitude.toString());
      setDeliveryLng(geoLocation.longitude.toString());
    }
  }, [geoLocation.latitude, geoLocation.longitude]);

  /* ===============================
     WEBSOCKET EVENT LISTENERS
  =============================== */
  
  // Listen for new orders
  useSocketEvent(socket, "order:created", useCallback((order: any) => {
    console.log("📦 New order created:", order);
    setOrders(prev => [order, ...prev]);
    fetchOrderDetails(order.id);
  }, []));

  // Listen for order confirmations
  useSocketEvent(socket, "order:confirmed", useCallback((data: any) => {
    console.log("✅ Order confirmed:", data);
    setOrders(prev => prev.map(o => o.id === data.order.id ? data.order : o));
    setShipments(prev => [data.shipment, ...prev]);
  }, []));

  // Listen for shipment updates
  useSocketEvent(socket, "shipment:updated", useCallback((shipment: any) => {
    console.log("🚚 Shipment updated:", shipment);
    setShipments(prev => prev.map(s => s.id === shipment.id ? shipment : s));
  }, []));

  // Listen for driver nearby alerts
  useSocketEvent(socket, "driver:nearby", useCallback((data: any) => {
    console.log("🚨 Driver nearby!", data);
    setDriverNearby(data.order_id);
    
    // Show browser notification if permitted
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Driver Nearby!", {
        body: data.message,
        icon: "/vite.svg"
      });
    }
  }, []));

  // Listen for OTP generation
  useSocketEvent(socket, "otp:generated", useCallback((data: any) => {
    console.log("🔐 OTP generated:", data);
    // Update shipment with OTP
    setShipments(prev => prev.map(s => 
      s.id === data.shipment_id ? { ...s, otp_code: data.otp } : s
    ));
  }, []));

  // Listen for delivery completion
  useSocketEvent(socket, "delivery:completed", useCallback((data: any) => {
    console.log("✅ Delivery completed:", data);
    setDriverNearby(null);
    
    // Update order and shipment status
    setOrders(prev => prev.map(o => 
      o.id === data.order_id ? { ...o, status: "COMPLETED" } : o
    ));
    setShipments(prev => prev.map(s => 
      s.order_id === data.order_id ? { ...s, status: "COMPLETED", otp_verified: true } : s
    ));
  }, []));

  /* ===============================
     GEOFENCING: Check if driver is nearby
  =============================== */
  useEffect(() => {
    // Check each shipment for nearby driver
    shipments.forEach((shipment) => {
      if (shipment.entered_delivery_zone_at && shipment.status !== "COMPLETED") {
        setDriverNearby(shipment.order_id);
      }
    });
  }, [shipments]);

  /* ===============================
     LOAD INITIAL DATA (No more polling!)
  =============================== */
  useEffect(() => {
    loadData();
    
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  async function loadData() {
    try {
      const productsData = await getProducts();
      setProducts(productsData);

      const ordersData = await getOrders();
      setOrders(ordersData);

      const shipmentData = await getShipments();
      setShipments(shipmentData);
      
      // Fetch details for buyer's orders
      for (const order of ordersData.filter((o: any) => o.buyer_id === BUYER_ID)) {
        await fetchOrderDetails(order.id);
      }
    } catch {
      alert("Failed to load data");
    }
  }

  async function fetchOrderDetails(orderId: string) {
    try {
      const res = await fetch(`http://localhost:5000/orders/${orderId}`);
      const data = await res.json();
      setOrderDetails(prev => ({ ...prev, [orderId]: data }));
    } catch (err) {
      console.error("Failed to fetch order details:", err);
    }
  }

  /* ===============================
     CART LOGIC
  =============================== */
  function addToCart(product: any) {
    setCart((prev) => {
      const found = prev.find((p) => p.product_id === product.id);

      if (found) {
        return prev.map((p) =>
          p.product_id === product.id
            ? { ...p, quantity: p.quantity + 1 }
            : p
        );
      }

      return [...prev, { product_id: product.id, quantity: 1 }];
    });
  }

  async function placeOrder() {
    if (cart.length === 0) return alert("Cart is empty");
    
    if (!deliveryLat || !deliveryLng) {
      return alert("Please allow location access or enter delivery address manually");
    }

    setLoading(true);

    try {
      await createOrder({
        buyer_id: BUYER_ID,
        seller_id: SELLER_ID,
        items: cart,
        delivery_lat: Number(deliveryLat),
        delivery_lng: Number(deliveryLng),
      });

      alert("Order placed successfully");
      setCart([]);

      const updatedOrders = await getOrders();
      setOrders(updatedOrders);
    } catch {
      alert("Order failed");
    }

    setLoading(false);
  }

  /* ===============================
     UI
  =============================== */
  return (
    <div style={{ padding: 20 }}>
      {/* Toast Notifications */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      <h2>🛒 Buyer Portal</h2>

      {/* DRIVER NEARBY ALERT */}
      {driverNearby && (
        <div style={{
          background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
          color: "white",
          padding: 20,
          marginBottom: 20,
          borderRadius: 12,
          textAlign: "center",
          animation: "pulse 2s infinite",
          boxShadow: "0 4px 20px rgba(220, 38, 38, 0.4)"
        }}>
          <h2 style={{ margin: 0, fontSize: "1.8rem", marginBottom: 8 }}>
            🚨 DRIVER NEARBY!
          </h2>
          <p style={{ margin: 0, fontSize: "1.1rem", opacity: 0.95 }}>
            Your delivery driver has entered your area. Please be ready to receive your order!
          </p>
        </div>
      )}

      {/* LOCATION STATUS */}
      {geoLocation.error && (
        <div style={{ background: "#fee", padding: 10, marginBottom: 15, borderRadius: 5 }}>
          ⚠️ {geoLocation.error}
        </div>
      )}

      {geoLocation.latitude && geoLocation.longitude && (
        <div style={{ background: "#efe", padding: 10, marginBottom: 15, borderRadius: 5 }}>
          ✅ <b>Delivery Location Detected:</b> {geoLocation.latitude.toFixed(6)}, {geoLocation.longitude.toFixed(6)}
          <br />
          <small>This will be used as your delivery address</small>
        </div>
      )}

      {/* PRODUCTS */}
      <h3>Products</h3>
      {products.map((p) => (
        <div
          key={p.id}
          style={{
            border: "1px solid #ddd",
            margin: 10,
            padding: 12,
            borderRadius: 10,
            background: "#fafafa",
          }}
        >
          <h4>{p.name}</h4>
          <p>₹{p.price}</p>
          <p>Stock: {p.stock_quantity}</p>
          <button onClick={() => addToCart(p)}>Add</button>
        </div>
      ))}

      <hr />

      {/* CART */}
      <h3>Cart</h3>
      {cart.length === 0 && <p>No items in cart</p>}

      {cart.map((c) => {
        const product = products.find(p => p.id === c.product_id);
        return (
          <p key={c.product_id}>
            {product?.name || c.product_id} × {c.quantity} = ₹{(product?.price || 0) * c.quantity}
          </p>
        );
      })}

      {cart.length > 0 && (
        <div style={{ marginTop: 15, padding: 15, background: "#f9f9f9", borderRadius: 8 }}>
          <h4>📍 Delivery Address</h4>
          <input
            placeholder="Delivery Latitude"
            value={deliveryLat}
            onChange={(e) => setDeliveryLat(e.target.value)}
            style={{ marginRight: 10, padding: 8, width: 200 }}
          />
          <input
            placeholder="Delivery Longitude"
            value={deliveryLng}
            onChange={(e) => setDeliveryLng(e.target.value)}
            style={{ padding: 8, width: 200 }}
          />
          <p style={{ fontSize: 12, color: "#666", margin: "5px 0" }}>
            Auto-filled from your current location (you can edit if needed)
          </p>
        </div>
      )}

      <button onClick={placeOrder} disabled={loading}>
        {loading ? "Placing..." : "Place Order"}
      </button>

      <hr />

      {/* ORDERS */}
      <h3>📦 My Orders</h3>

      {orders.filter((o) => o.buyer_id === BUYER_ID).length === 0 && (
        <p>No orders yet</p>
      )}

      {orders
        .filter((o) => o.buyer_id === BUYER_ID)
        .map((order) => {
          const details = orderDetails[order.id];
          const items = details?.order_items || [];
          
          return (
            <div
              key={order.id}
              style={{
                border: "1px solid #ddd",
                margin: 15,
                padding: 15,
                borderRadius: 12,
                background: "#ffffff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              }}
            >
              <p>
                <strong>Order ID:</strong> {order.id.slice(0, 8)}...
              </p>

              <StatusBadge status={order.status} />

              {/* Order Items */}
              {items.length > 0 && (
                <div style={{ 
                  marginTop: 10, 
                  padding: 10, 
                  background: "#f9f9f9",
                  borderRadius: 5 
                }}>
                  <p style={{ fontWeight: "bold", marginBottom: 8, fontSize: "0.9rem" }}>
                    📦 Items in this order:
                  </p>
                  {items.map((item: any, idx: number) => (
                    <div key={idx} style={{ 
                      padding: 6, 
                      background: "#fff",
                      marginBottom: 4,
                      borderRadius: 4,
                      fontSize: "0.85rem"
                    }}>
                      <span style={{ fontWeight: "600" }}>
                        {item.products?.name || "Product"}
                      </span>
                      <span> × {item.quantity}</span>
                      <span style={{ float: "right" }}>₹{item.price_at_purchase * item.quantity}</span>
                    </div>
                  ))}
                  <div style={{ 
                    marginTop: 8, 
                    paddingTop: 8, 
                    borderTop: "1px solid #ddd",
                    fontWeight: "bold"
                  }}>
                    <span>Total:</span>
                    <span style={{ float: "right" }}>
                      ₹{items.reduce((sum: number, item: any) => sum + (item.quantity * item.price_at_purchase), 0)}
                    </span>
                  </div>
                </div>
              )}

              <OrderTimeline status={order.status} />

            {/* DRIVER LOCATION */}
            {shipments
              .filter((s) => s.order_id === order.id)
              .map((shipment) => {
                // Calculate distance to delivery
                let distanceText = "Calculating...";
                if (shipment.current_lat && shipment.current_lng && shipment.drop_lat && shipment.drop_lng) {
                  const latDiff = Math.abs(shipment.drop_lat - shipment.current_lat);
                  const lngDiff = Math.abs(shipment.drop_lng - shipment.current_lng);
                  const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
                  const distanceKm = (distance * 111).toFixed(2);
                  distanceText = `${distanceKm} km away`;
                  
                  if (distance < 0.005) {
                    distanceText = "Driver is nearby! (~500m)";
                  }
                }

                return (
                  <div
                    key={shipment.id}
                    style={{
                      marginTop: 12,
                      padding: 10,
                      background: "#f4f6f8",
                      borderRadius: 8,
                    }}
                  >
                    <strong>📍 Driver Location:</strong>
                    <p>
                      Lat: {shipment.current_lat ?? "—"} | Lng:{" "}
                      {shipment.current_lng ?? "—"}
                    </p>
                    
                    {shipment.current_lat && shipment.current_lng && (
                      <p style={{ 
                        margin: "8px 0 0 0", 
                        fontSize: "0.9rem",
                        color: shipment.entered_delivery_zone_at ? "#dc2626" : "#666",
                        fontWeight: shipment.entered_delivery_zone_at ? "bold" : "normal"
                      }}>
                        📏 {distanceText}
                      </p>
                    )}
                    
                    {/* OTP Display for Buyer */}
                    {shipment.status === "DELIVERED" && shipment.otp_code && (
                      <div style={{
                        marginTop: 10,
                        padding: 15,
                        background: "#fff3cd",
                        border: "2px solid #ffc107",
                        borderRadius: 8,
                        textAlign: "center"
                      }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: "bold" }}>
                          🔐 Your Delivery OTP
                        </p>
                        <p style={{ 
                          margin: "10px 0 5px 0", 
                          fontSize: 32, 
                          fontWeight: "bold",
                          color: "#d32f2f",
                          letterSpacing: 8
                        }}>
                          {shipment.otp_code}
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: "#666" }}>
                          Share this OTP with the driver to complete delivery
                        </p>
                      </div>
                    )}
                    
                    {shipment.otp_verified && (
                      <div style={{
                        marginTop: 10,
                        padding: 10,
                        background: "#d4edda",
                        border: "1px solid #28a745",
                        borderRadius: 5,
                        textAlign: "center"
                      }}>
                        ✅ <strong>Delivery Completed!</strong>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}
