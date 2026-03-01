import { useEffect, useState, useCallback } from "react";
import { getProducts, createOrder, getOrders, getShipments } from "../api/api";
import { useGeolocation } from "../hooks/useGeolocation";
import { useSocket, useSocketEvent } from "../hooks/useSocket";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";
import DashboardLayout from "../components/DashboardLayout";
import Toast from "../components/Toast";
import LiveMap from "../components/LiveMap";
import OrderHistory from "../components/OrderHistory";
import "../styles/Buyer.css";

export default function Buyer() {
  const { user } = useAuth();
  const { toasts, removeToast, success, error, warning } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deliveryLat, setDeliveryLat] = useState("");
  const [deliveryLng, setDeliveryLng] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [driverNearby, setDriverNearby] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<"shop" | "orders" | "history">("shop");

  const socket = useSocket("buyer", user?.id || "");
  const geoLocation = useGeolocation({ watch: true }); // Enable auto-tracking

  // Manual location request function
  const requestLocation = () => {
    if (!navigator.geolocation) {
      error("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeliveryLat(position.coords.latitude.toString());
        setDeliveryLng(position.coords.longitude.toString());
        success("Location detected successfully! 📍");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          error("Location permission denied. Please enable it in browser settings.");
        } else {
          error("Unable to get location. Please try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (geoLocation.latitude && geoLocation.longitude) {
      setDeliveryLat(geoLocation.latitude.toString());
      setDeliveryLng(geoLocation.longitude.toString());
    }
  }, [geoLocation.latitude, geoLocation.longitude]);

  // WebSocket listeners
  useSocketEvent(socket, "order:created", useCallback((order: any) => {
    setOrders(prev => [order, ...prev]);
    fetchOrderDetails(order.id);
  }, []));

  useSocketEvent(socket, "order:confirmed", useCallback((data: any) => {
    setOrders(prev => prev.map(o => o.id === data.order.id ? data.order : o));
    setShipments(prev => [data.shipment, ...prev]);
  }, []));

  useSocketEvent(socket, "shipment:updated", useCallback((shipment: any) => {
    setShipments(prev => prev.map(s => s.id === shipment.id ? shipment : s));
  }, []));

  useSocketEvent(socket, "driver:nearby", useCallback((data: any) => {
    setDriverNearby(data.order_id);
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Driver Nearby!", { body: data.message });
    }
  }, []));

  useSocketEvent(socket, "otp:generated", useCallback((data: any) => {
    const updatedShipments = shipments.map(s => 
      s.id === data.shipment_id ? { ...s, otp_code: data.otp } : s
    );
    setShipments(updatedShipments);
  }, [shipments]));

  useEffect(() => {
    loadData();
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  async function loadData() {
    try {
      const [productsData, ordersData, shipmentsData] = await Promise.all([
        getProducts(),
        getOrders(),
        getShipments()
      ]);
      
      setProducts(productsData);
      setOrders(ordersData.filter((o: any) => o.buyer_id === user?.id));
      setShipments(shipmentsData);

      for (const order of ordersData) {
        await fetchOrderDetails(order.id);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
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

  function addToCart(product: any) {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product_id: product.id, quantity: 1, product }]);
    }
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter(item => item.product_id !== productId));
  }

  function updateQuantity(productId: string, delta: number) {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  }

  async function placeOrder() {
    if (cart.length === 0) {
      warning("Your cart is empty! Add some products first.");
      return;
    }

    if (!deliveryLat || !deliveryLng) {
      error("Please provide delivery location coordinates");
      return;
    }

    if (!deliveryAddress.trim()) {
      error("Please enter your delivery address");
      return;
    }

    setLoading(true);
    try {
      // Get seller_id from products (assuming all products in cart are from same seller)
      // In a real app, you'd fetch this from the product data or have user select seller
      const seller_id = products[0]?.seller_id || "c319182e-b86a-4a13-b2e2-1c01a8f64f54"; // Fallback to default
      
      await createOrder({
        buyer_id: user?.id!,
        seller_id: seller_id,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        })),
        delivery_lat: Number(deliveryLat),
        delivery_lng: Number(deliveryLng),
        delivery_address: deliveryAddress
      });

      setCart([]);
      success("Order placed successfully! 🎉");
      loadData();
    } catch (err) {
      console.error("❌ Order placement error:", err);
      error("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <DashboardLayout title="Buyer Portal" icon="🛒">
      {/* Toast Notifications */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#FFE5B4" }}>📦</div>
          <div className="stat-value">{orders.length}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#BBDEFB" }}>🚚</div>
          <div className="stat-value">{shipments.length}</div>
          <div className="stat-label">Active Shipments</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#FFD4A3" }}>🛍️</div>
          <div className="stat-value">{cartCount}</div>
          <div className="stat-label">Cart Items</div>
        </div>
      </div>

      {/* Location Detection */}
      {geoLocation.latitude && geoLocation.longitude && (
        <div className="location-banner">
          <span className="location-icon">📍</span>
          <div>
            <strong>Delivery Location Detected</strong>
            <p>{geoLocation.latitude.toFixed(6)}, {geoLocation.longitude.toFixed(6)}</p>
          </div>
        </div>
      )}

      {/* Driver Nearby Alert */}
      {driverNearby && (
        <div className="alert-banner">
          <span className="alert-icon">🚨</span>
          <div className="alert-content">
            <h3>Driver Nearby!</h3>
            <p>Your delivery driver is approaching your location</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === "shop" ? "active" : ""}`}
          onClick={() => setActiveTab("shop")}
        >
          🛍️ Shop Products
        </button>
        <button 
          className={`tab ${activeTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          📦 My Orders
        </button>
        <button 
          className={`tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          📊 Order History
        </button>
      </div>

      {activeTab === "history" ? (
        <OrderHistory 
          orders={orders}
          onOrderClick={(orderId) => {
            setActiveTab("orders");
            // Scroll to the order
            setTimeout(() => {
              const orderElement = document.getElementById(`order-${orderId}`);
              orderElement?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 100);
          }}
        />
      ) : activeTab === "shop" ? (
        <>
          {/* Products Grid */}
          <div className="section-header">
            <h2 className="section-title">
              <span>🏪</span> Available Products
            </h2>
          </div>

          <div className="products-grid">
            {products.map(p => (
              <div key={p.id} className="product-card">
                <div className="product-header">
                  <h3>{p.name}</h3>
                  <span className="product-stock">
                    {p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : "Out of stock"}
                  </span>
                </div>
                <div className="product-price">₹{p.price.toLocaleString()}</div>
                <button 
                  className="btn btn-primary"
                  onClick={() => addToCart(p)}
                  disabled={p.stock_quantity === 0}
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="cart-section">
              <h2 className="section-title">
                <span>🛒</span> Shopping Cart
              </h2>
              
              {cart.map(item => (
                <div key={item.product_id} className="cart-item">
                  <div className="cart-item-info">
                    <h4>{item.product.name}</h4>
                    <p>₹{item.product.price} × {item.quantity}</p>
                  </div>
                  <div className="cart-item-actions">
                    <button onClick={() => updateQuantity(item.product_id, -1)}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product_id, 1)}>+</button>
                    <button 
                      className="remove-btn"
                      onClick={() => removeFromCart(item.product_id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}

              <div className="cart-total">
                <h3>Total: ₹{cartTotal.toLocaleString()}</h3>
              </div>

              <div className="delivery-location">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h4 style={{ margin: 0 }}>📍 Delivery Location</h4>
                  {!geoLocation.latitude && !geoLocation.loading && (
                    <button 
                      className="btn btn-secondary"
                      onClick={requestLocation}
                      style={{ 
                        padding: '8px 16px', 
                        fontSize: '0.9rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      📍 Detect My Location
                    </button>
                  )}
                </div>
                
                {/* Location Status */}
                {geoLocation.loading && (
                  <div className="location-status detecting">
                    <span>📍</span> Detecting your location...
                  </div>
                )}
                
                {geoLocation.error && (
                  <div className="location-status error">
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span>⚠️</span>
                        <strong>{geoLocation.error}</strong>
                      </div>
                      <div style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
                        <p style={{ margin: '5px 0' }}>
                          <strong>To enable location access:</strong>
                        </p>
                        <ol style={{ margin: '5px 0 5px 20px', padding: 0 }}>
                          <li>Click the 🔒 lock icon in your browser's address bar</li>
                          <li>Find "Location" permissions</li>
                          <li>Change it to "Allow"</li>
                          <li>Refresh the page</li>
                        </ol>
                        <p style={{ margin: '5px 0', fontStyle: 'italic' }}>
                          Or enter coordinates manually below
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {geoLocation.latitude && geoLocation.longitude && (
                  <div className="location-status success">
                    <span>✅</span> Location detected successfully!
                    <p style={{ fontSize: '0.85rem', marginTop: '5px' }}>
                      {geoLocation.latitude.toFixed(6)}, {geoLocation.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
                
                <div className="address-input-group">
                  <label>Delivery Address</label>
                  <textarea
                    className="address-input"
                    placeholder="Enter your complete delivery address (House/Flat No, Street, Area, Landmark)"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="location-inputs">
                  <input
                    type="number"
                    placeholder="Latitude"
                    value={deliveryLat}
                    onChange={(e) => setDeliveryLat(e.target.value)}
                    step="0.000001"
                  />
                  <input
                    type="number"
                    placeholder="Longitude"
                    value={deliveryLng}
                    onChange={(e) => setDeliveryLng(e.target.value)}
                    step="0.000001"
                  />
                </div>
              </div>

              <button 
                className="btn btn-primary checkout-btn"
                onClick={placeOrder}
                disabled={loading}
              >
                {loading ? "Placing Order..." : "Place Order"}
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Orders List */}
          <div className="section-header">
            <h2 className="section-title">
              <span>📦</span> My Orders
            </h2>
          </div>

          {orders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>No orders yet</h3>
              <p>Start shopping to place your first order!</p>
            </div>
          ) : (
            orders.map(order => {
              const details = orderDetails[order.id];
              const items = details?.order_items || [];
              const shipment = shipments.find(s => s.order_id === order.id);

              return (
                <div key={order.id} className="order-card">
                  <div className="card-header">
                    <span className="card-id">#{order.id.slice(0, 8)}</span>
                    <span className={`badge badge-${order.status.toLowerCase()}`}>
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="card-body">
                    {items.length > 0 && (
                      <div className="order-items">
                        {items.map((item: any, idx: number) => (
                          <div key={idx} className="order-item">
                            <span className="item-name">{item.products?.name}</span>
                            <span className="item-qty">×{item.quantity}</span>
                            <span className="item-price">₹{item.price_at_purchase}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {shipment && (
                      <div className="shipment-info">
                        <div className="info-row">
                          <span className="info-icon">🚚</span>
                          <span>Status: {shipment.status}</span>
                        </div>

                        {/* Live Map Tracking */}
                        {shipment && order.status !== "PENDING_CONFIRMATION" && (
                          <div className="live-tracking-section">
                            <h4 className="tracking-title">
                              <span>🗺️</span> Live Tracking
                            </h4>
                            <LiveMap
                              driverLocation={
                                shipment.current_lat && shipment.current_lng
                                  ? { lat: shipment.current_lat, lng: shipment.current_lng }
                                  : null
                              }
                              deliveryLocation={
                                order.delivery_lat && order.delivery_lng
                                  ? { lat: order.delivery_lat, lng: order.delivery_lng }
                                  : null
                              }
                              pickupLocation={
                                shipment.pickup_lat && shipment.pickup_lng
                                  ? { lat: shipment.pickup_lat, lng: shipment.pickup_lng }
                                  : null
                              }
                              showDeliveryZone={shipment.status === "IN_TRANSIT" || shipment.status === "DELIVERED"}
                              deliveryZoneRadius={500}
                            />
                          </div>
                        )}

                        {shipment.otp_code && (
                          <div className="otp-display">
                            <h4>🔐 Delivery OTP</h4>
                            <div className="otp-code">{shipment.otp_code}</div>
                            <p>Share this code with the driver</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}
    </DashboardLayout>
  );
}
