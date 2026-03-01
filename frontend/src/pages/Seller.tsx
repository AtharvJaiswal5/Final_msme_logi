import { useEffect, useState, useCallback } from "react";
import { getOrders, confirmOrder } from "../api/api";
import { useGeolocation } from "../hooks/useGeolocation";
import { useSocket, useSocketEvent } from "../hooks/useSocket";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import Toast from "../components/Toast";
import LiveMap from "../components/LiveMap";
import NotificationBell from "../components/NotificationBell";
import "../styles/Seller.css";

export default function Seller() {
  const { user } = useAuth();
  const { toasts, removeToast, success, error } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [orderDetails, setOrderDetails] = useState<Record<string, any>>({});
  const [pickupLat, setPickupLat] = useState("");
  const [pickupLng, setPickupLng] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropLat, setDropLat] = useState("");
  const [dropLng, setDropLng] = useState("");
  const [dropAddress, setDropAddress] = useState("");
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  
  // Product Management State
  const [activeTab, setActiveTab] = useState<"orders" | "products" | "tracking">("orders");
  const [products, setProducts] = useState<any[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    price: "",
    stock_quantity: ""
  });
  
  // Driver Management State
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  
  // Driver Tracking State
  const [driverTracking, setDriverTracking] = useState<Record<string, any>>({});
  const [warehouseLocation, setWarehouseLocation] = useState({ lat: 0, lng: 0 });
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<any | null>(null);
  const [showShipmentDetails, setShowShipmentDetails] = useState(false);
  
  // Tracking Filters
  const [driverSearchQuery, setDriverSearchQuery] = useState("");
  const [driverStatusFilter, setDriverStatusFilter] = useState<"all" | "active" | "pending" | "free">("all");
  const [sortBy, setSortBy] = useState<"name" | "assigned" | "completed">("name");
  
  // Initialize WebSocket connection
  const socket = useSocket("seller", user?.id || "");
  
  // Auto-detect seller's location for pickup
  const geoLocation = useGeolocation({ watch: false });

  // Auto-fill pickup location when detected and set as warehouse
  useEffect(() => {
    if (geoLocation.latitude && geoLocation.longitude) {
      setPickupLat(geoLocation.latitude.toString());
      setPickupLng(geoLocation.longitude.toString());
      // Set warehouse location to seller's location
      setWarehouseLocation({
        lat: geoLocation.latitude,
        lng: geoLocation.longitude
      });
    }
  }, [geoLocation.latitude, geoLocation.longitude]);

  /* ===============================
     WEBSOCKET EVENT LISTENERS
  =============================== */
  
  // Listen for new orders (real-time!)
  useSocketEvent(socket, "order:created", useCallback((order: any) => {
    console.log("📦 New order received:", order);
    
    // Show browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("New Order!", {
        body: `Order ${order.id.slice(0, 8)} received`,
        icon: "/vite.svg"
      });
    }
    
    setOrders(prev => [order, ...prev]);
    fetchOrderDetails(order.id);
  }, []));

  // Listen for driver location updates
  useSocketEvent(socket, "driver:location", useCallback((data: any) => {
    console.log("📍 Driver location update:", data);
    setDriverTracking(prev => ({
      ...prev,
      [data.driver_id]: {
        ...prev[data.driver_id],
        latitude: data.latitude,
        longitude: data.longitude,
        lastUpdate: new Date()
      }
    }));
  }, []));

  // Listen for shipment status updates
  useSocketEvent(socket, "shipment:updated", useCallback((data: any) => {
    console.log("📦 Shipment updated:", data);
    loadDriverTracking();
  }, []));

  useEffect(() => {
    loadOrders();
    loadProducts();
    loadDrivers();
    loadDriverTracking();
    
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    
    // Refresh driver tracking every 30 seconds
    const trackingInterval = setInterval(() => {
      if (activeTab === "tracking") {
        loadDriverTracking();
      }
    }, 30000);
    
    return () => clearInterval(trackingInterval);
  }, [activeTab]);

  async function loadDrivers() {
    try {
      const res = await fetch("http://localhost:5000/drivers");
      if (res.ok) {
        const data = await res.json();
        setDrivers(data);
      }
    } catch (err) {
      console.error("Failed to load drivers:", err);
    }
  }

  async function loadDriverTracking() {
    try {
      // Get all shipments
      const res = await fetch("http://localhost:5000/shipments");
      
      if (res.ok) {
        const allShipments = await res.json();
        
        // Filter shipments created today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayShipments = allShipments.filter((s: any) => {
          const shipmentDate = new Date(s.created_at);
          shipmentDate.setHours(0, 0, 0, 0);
          return shipmentDate.getTime() === today.getTime();
        });
        
        // Group shipments by driver
        const trackingData: Record<string, any> = {};
        
        for (const shipment of todayShipments) {
          const driverId = shipment.driver_id;
          
          if (!trackingData[driverId]) {
            trackingData[driverId] = {
              driver: drivers.find(d => d.id === driverId),
              assignedToday: [],
              completed: [],
              inProgress: null,
              latitude: shipment.current_lat,
              longitude: shipment.current_lng,
              lastUpdate: new Date()
            };
          }
          
          if (shipment.status === "COMPLETED") {
            trackingData[driverId].completed.push(shipment);
          } else {
            trackingData[driverId].assignedToday.push(shipment);
            if (shipment.status === "IN_TRANSIT" || shipment.status === "DELIVERED") {
              trackingData[driverId].inProgress = shipment;
              trackingData[driverId].latitude = shipment.current_lat;
              trackingData[driverId].longitude = shipment.current_lng;
            }
          }
        }
        
        setDriverTracking(trackingData);
      }
    } catch (err) {
      console.error("Failed to load driver tracking:", err);
    }
  }

  // Calculate distance using Haversine formula
  function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Calculate ETA (assuming 30 km/h average speed)
  function calculateETA(distance: number): string {
    const avgSpeed = 30; // km/h
    const hours = distance / avgSpeed;
    const minutes = Math.round(hours * 60);
    
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hrs}h ${mins}m`;
    }
  }

  async function viewShipmentDetails(shipmentId: string) {
    try {
      // Fetch shipment details
      const shipmentRes = await fetch(`http://localhost:5000/shipments`);
      if (shipmentRes.ok) {
        const shipments = await shipmentRes.json();
        const shipment = shipments.find((s: any) => s.id === shipmentId);
        
        if (shipment) {
          // Fetch order details
          const orderRes = await fetch(`http://localhost:5000/orders/${shipment.order_id}`);
          if (orderRes.ok) {
            const orderData = await orderRes.json();
            setSelectedShipment({
              ...shipment,
              order: orderData
            });
            setShowShipmentDetails(true);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load shipment details:", err);
      error("Failed to load order details");
    }
  }

  function closeShipmentDetails() {
    setShowShipmentDetails(false);
    setSelectedShipment(null);
  }

  // Filter and sort drivers
  function getFilteredAndSortedDrivers() {
    let driverEntries = Object.entries(driverTracking);

    // Apply search filter
    if (driverSearchQuery.trim()) {
      driverEntries = driverEntries.filter(([driverId]: [string, any]) => {
        const driver = drivers.find(d => d.id === driverId);
        const searchLower = driverSearchQuery.toLowerCase();
        return (
          driver?.name.toLowerCase().includes(searchLower) ||
          driver?.email.toLowerCase().includes(searchLower) ||
          driverId.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply status filter
    if (driverStatusFilter !== "all") {
      driverEntries = driverEntries.filter(([_, tracking]: [string, any]) => {
        if (driverStatusFilter === "active") {
          return tracking.inProgress !== null;
        } else if (driverStatusFilter === "pending") {
          return tracking.assignedToday.length > 0 && !tracking.inProgress;
        } else if (driverStatusFilter === "free") {
          return tracking.assignedToday.length === 0;
        }
        return true;
      });
    }

    // Apply sorting
    driverEntries.sort(([aId, aTracking]: [string, any], [bId, bTracking]: [string, any]) => {
      if (sortBy === "name") {
        const aDriver = drivers.find(d => d.id === aId);
        const bDriver = drivers.find(d => d.id === bId);
        return (aDriver?.name || "").localeCompare(bDriver?.name || "");
      } else if (sortBy === "assigned") {
        return bTracking.assignedToday.length - aTracking.assignedToday.length;
      } else if (sortBy === "completed") {
        return bTracking.completed.length - aTracking.completed.length;
      }
      return 0;
    });

    return driverEntries;
  }

  // Calculate statistics
  function getTrackingStatistics() {
    const allDrivers = Object.values(driverTracking);
    return {
      totalDrivers: allDrivers.length,
      activeDrivers: allDrivers.filter((t: any) => t.inProgress !== null).length,
      totalAssigned: allDrivers.reduce((sum: number, t: any) => sum + t.assignedToday.length, 0),
      totalCompleted: allDrivers.reduce((sum: number, t: any) => sum + t.completed.length, 0)
    };
  }

  async function loadProducts() {
    try {
      const res = await fetch("http://localhost:5000/products");
      if (res.ok) {
        const data = await res.json();
        // Filter products by seller if needed
        setProducts(data);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  }

  async function handleProductSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!productForm.name || !productForm.price || !productForm.stock_quantity) {
      error("Please fill in all fields");
      return;
    }

    try {
      const url = editingProduct
        ? `http://localhost:5000/products/${editingProduct.id}`
        : "http://localhost:5000/products";

      const method = editingProduct ? "PUT" : "POST";

      const body = editingProduct
        ? {
            name: productForm.name,
            price: Number(productForm.price),
            stock_quantity: Number(productForm.stock_quantity)
          }
        : {
            seller_id: user?.id,
            name: productForm.name,
            price: Number(productForm.price),
            stock_quantity: Number(productForm.stock_quantity)
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        success(editingProduct ? "Product updated! ✅" : "Product added! 🎉");
        setShowProductForm(false);
        setEditingProduct(null);
        setProductForm({ name: "", price: "", stock_quantity: "" });
        loadProducts();
      } else {
        error("Failed to save product");
      }
    } catch (err) {
      error("Failed to save product");
      console.error(err);
    }
  }

  async function handleDeleteProduct(productId: string) {
    if (!confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/products/${productId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        success("Product deleted! 🗑️");
        loadProducts();
      } else {
        error("Failed to delete product");
      }
    } catch (err) {
      error("Failed to delete product");
      console.error(err);
    }
  }

  function startEditProduct(product: any) {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: product.price.toString(),
      stock_quantity: product.stock_quantity.toString()
    });
    setShowProductForm(true);
  }

  function cancelProductForm() {
    setShowProductForm(false);
    setEditingProduct(null);
    setProductForm({ name: "", price: "", stock_quantity: "" });
  }

  async function loadOrders() {
    try {
      const ordersData = await getOrders();
      setOrders(ordersData);
      
      // Fetch details for each order
      for (const order of ordersData) {
        await fetchOrderDetails(order.id);
      }
    } catch {
      error("Failed to load orders. Please refresh the page.");
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

  async function confirm(orderId: string) {
    if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
      error("Please fill in all location coordinates");
      return;
    }

    if (!pickupAddress.trim() || !dropAddress.trim()) {
      error("Please fill in both pickup and delivery addresses");
      return;
    }

    if (!selectedDriverId) {
      error("Please select a driver to assign this order");
      return;
    }

    try {
      await confirmOrder(orderId, {
        driver_id: selectedDriverId,
        pickup_lat: Number(pickupLat),
        pickup_lng: Number(pickupLng),
        pickup_address: pickupAddress,
        drop_lat: Number(dropLat),
        drop_lng: Number(dropLng),
        drop_address: dropAddress
      });

      const assignedDriver = drivers.find(d => d.id === selectedDriverId);
      success(`Order confirmed! Assigned to driver: ${assignedDriver?.name || "Driver"} 🎉`);
      setConfirmingOrderId(null);
      setSelectedDriverId("");
      
      // Update order status in state instead of reloading
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: "CONFIRMED" } : o
      ));
      
      // Reload orders to get fresh data
      loadOrders();
    } catch (err) {
      error("Failed to confirm order. Please try again.");
      console.error(err);
    }
  }

  function startConfirm(orderId: string) {
    setConfirmingOrderId(orderId);
    setSelectedDriverId(""); // Reset driver selection
    
    // Auto-fill drop location from order's delivery location
    const order = orders.find(o => o.id === orderId);
    if (order) {
      // Auto-fill delivery location and address from buyer's order
      if (order.delivery_lat && order.delivery_lng) {
        setDropLat(order.delivery_lat.toString());
        setDropLng(order.delivery_lng.toString());
      }
      if (order.delivery_address) {
        setDropAddress(order.delivery_address);
      }
    }
  }

  function cancelConfirm() {
    setConfirmingOrderId(null);
    setSelectedDriverId("");
  }

  return (
    <div className="seller-container">
      {/* Toast Notifications */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      <div className="seller-content">
        <div className="seller-header">
          <div className="header-left">
            <h2>🏭 Seller Portal</h2>
            <p className="user-name">Welcome, {user?.name || user?.email}</p>
          </div>
          
          <div className="header-actions">
            <NotificationBell />
            <button 
              className="logout-btn"
              onClick={() => {
                localStorage.removeItem(`token_${user?.role}`);
                window.location.href = "/";
              }}
            >
              🚪 Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="seller-tabs">
          <button 
            className={`tab-btn ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            📦 Orders
          </button>
          <button 
            className={`tab-btn ${activeTab === "products" ? "active" : ""}`}
            onClick={() => setActiveTab("products")}
          >
            🛍️ Products
          </button>
          <button 
            className={`tab-btn ${activeTab === "tracking" ? "active" : ""}`}
            onClick={() => setActiveTab("tracking")}
          >
            🚚 Track Drivers
          </button>
        </div>

        {/* DRIVER TRACKING TAB */}
        {activeTab === "tracking" && (
          <div className="tracking-section">
            <div className="tracking-header">
              <h3>🚚 Driver Tracking - Real-Time</h3>
              <button 
                className="btn-refresh"
                onClick={loadDriverTracking}
              >
                🔄 Refresh
              </button>
            </div>

            {Object.keys(driverTracking).length === 0 ? (
              <div className="empty-state">
                <p>No active drivers today. Assign orders to see driver tracking.</p>
              </div>
            ) : (
              <>
                {/* Statistics Cards */}
                <div className="tracking-stats-overview">
                  <div className="stat-overview-card">
                    <div className="stat-overview-icon">👥</div>
                    <div className="stat-overview-content">
                      <div className="stat-overview-value">{getTrackingStatistics().totalDrivers}</div>
                      <div className="stat-overview-label">Total Drivers</div>
                    </div>
                  </div>
                  <div className="stat-overview-card">
                    <div className="stat-overview-icon">🚚</div>
                    <div className="stat-overview-content">
                      <div className="stat-overview-value">{getTrackingStatistics().activeDrivers}</div>
                      <div className="stat-overview-label">Active Now</div>
                    </div>
                  </div>
                  <div className="stat-overview-card">
                    <div className="stat-overview-icon">📦</div>
                    <div className="stat-overview-content">
                      <div className="stat-overview-value">{getTrackingStatistics().totalAssigned}</div>
                      <div className="stat-overview-label">Assigned Today</div>
                    </div>
                  </div>
                  <div className="stat-overview-card">
                    <div className="stat-overview-icon">✅</div>
                    <div className="stat-overview-content">
                      <div className="stat-overview-value">{getTrackingStatistics().totalCompleted}</div>
                      <div className="stat-overview-label">Completed</div>
                    </div>
                  </div>
                </div>

                {/* Filters */}
                <div className="tracking-filters">
                  <div className="filter-group">
                    <input
                      type="text"
                      className="filter-search"
                      placeholder="🔍 Search by driver name or email..."
                      value={driverSearchQuery}
                      onChange={(e) => setDriverSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="filter-group">
                    <select
                      className="filter-select"
                      value={driverStatusFilter}
                      onChange={(e) => setDriverStatusFilter(e.target.value as any)}
                    >
                      <option value="all">All Status</option>
                      <option value="active">🚚 Active</option>
                      <option value="pending">⏳ Pending</option>
                      <option value="free">✅ Free</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <select
                      className="filter-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                    >
                      <option value="name">Sort by Name</option>
                      <option value="assigned">Sort by Assigned</option>
                      <option value="completed">Sort by Completed</option>
                    </select>
                  </div>
                </div>

                <div className="tracking-layout">
                  {/* Driver List - Compact View */}
                  <div className="drivers-list-compact">
                    {getFilteredAndSortedDrivers().length === 0 ? (
                      <div className="no-results">
                        <p>No drivers match your filters</p>
                      </div>
                    ) : (
                      getFilteredAndSortedDrivers().map(([driverId, tracking]: [string, any]) => {
                        const driver = drivers.find(d => d.id === driverId);
                        const isSelected = selectedDriver === driverId;
                        
                        return (
                          <div 
                            key={driverId} 
                            className={`driver-compact-card ${isSelected ? "selected" : ""}`}
                            onClick={() => setSelectedDriver(isSelected ? null : driverId)}
                          >
                            <div className="driver-compact-header">
                          <div className="driver-compact-info">
                            <h4>🚗 {driver?.name || "Unknown Driver"}</h4>
                            <p className="driver-email-small">{driver?.email}</p>
                          </div>
                          <div className="driver-compact-status">
                            {tracking.inProgress ? (
                              <span className="status-badge-small in-transit">🚚 Active</span>
                            ) : tracking.assignedToday.length > 0 ? (
                              <span className="status-badge-small pending">⏳ Pending</span>
                            ) : (
                              <span className="status-badge-small available">✅ Free</span>
                            )}
                          </div>
                        </div>

                        <div className="driver-compact-stats">
                          <div className="stat-compact">
                            <span className="stat-compact-value">{tracking.assignedToday.length}</span>
                            <span className="stat-compact-label">Assigned</span>
                          </div>
                          <div className="stat-compact">
                            <span className="stat-compact-value">{tracking.completed.length}</span>
                            <span className="stat-compact-label">Done</span>
                          </div>
                          <div className="stat-compact">
                            <span className="stat-compact-value">{tracking.assignedToday.length - tracking.completed.length}</span>
                            <span className="stat-compact-label">Pending</span>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isSelected && (
                          <div className="driver-expanded-details">
                            {tracking.latitude && tracking.longitude && (
                              <div className="location-info-compact">
                                <div className="location-row-compact">
                                  <span className="location-label-compact">📍 Location:</span>
                                  <span className="location-value-compact">
                                    {tracking.latitude.toFixed(4)}, {tracking.longitude.toFixed(4)}
                                  </span>
                                </div>
                                <div className="location-row-compact">
                                  <span className="location-label-compact">🏭 To Warehouse:</span>
                                  <span className="location-value-compact">
                                    {calculateDistance(tracking.latitude, tracking.longitude, warehouseLocation.lat || tracking.latitude, warehouseLocation.lng || tracking.longitude).toFixed(2)} km
                                  </span>
                                </div>
                                <div className="location-row-compact">
                                  <span className="location-label-compact">⏱️ ETA:</span>
                                  <span className="location-value-compact">
                                    {calculateETA(calculateDistance(tracking.latitude, tracking.longitude, warehouseLocation.lat || tracking.latitude, warehouseLocation.lng || tracking.longitude))}
                                  </span>
                                </div>
                              </div>
                            )}

                            {tracking.inProgress && (
                              <div className="current-delivery-compact">
                                <h5>🎯 Current Delivery</h5>
                                <p>#{tracking.inProgress.id.slice(0, 8)} - {tracking.inProgress.status}</p>
                              </div>
                            )}

                            {tracking.assignedToday.length > 0 && (
                              <div className="orders-section-compact">
                                <h5>📋 Assigned ({tracking.assignedToday.length})</h5>
                                <div className="orders-list-compact">
                                  {tracking.assignedToday.map((shipment: any) => (
                                    <div 
                                      key={shipment.id} 
                                      className="order-chip clickable"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        viewShipmentDetails(shipment.id);
                                      }}
                                      title="Click to view details"
                                    >
                                      #{shipment.id.slice(0, 6)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {tracking.completed.length > 0 && (
                              <div className="orders-section-compact">
                                <h5>✅ Completed ({tracking.completed.length})</h5>
                                <div className="orders-list-compact">
                                  {tracking.completed.slice(0, 5).map((shipment: any) => (
                                    <div 
                                      key={shipment.id} 
                                      className="order-chip completed clickable"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        viewShipmentDetails(shipment.id);
                                      }}
                                      title="Click to view details"
                                    >
                                      #{shipment.id.slice(0, 6)}
                                    </div>
                                  ))}
                                  {tracking.completed.length > 5 && (
                                    <span className="more-chip">+{tracking.completed.length - 5}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

                  {/* Map View */}
                  <div className="tracking-map-container">
                  {selectedDriver && driverTracking[selectedDriver]?.latitude && driverTracking[selectedDriver]?.longitude ? (
                    <LiveMap
                      driverLocation={{
                        lat: driverTracking[selectedDriver].latitude,
                        lng: driverTracking[selectedDriver].longitude
                      }}
                      pickupLocation={warehouseLocation.lat && warehouseLocation.lng ? warehouseLocation : null}
                      deliveryLocation={
                        driverTracking[selectedDriver].inProgress?.drop_lat && driverTracking[selectedDriver].inProgress?.drop_lng
                          ? {
                              lat: driverTracking[selectedDriver].inProgress.drop_lat,
                              lng: driverTracking[selectedDriver].inProgress.drop_lng
                            }
                          : null
                      }
                    />
                  ) : (
                    <div className="map-placeholder">
                      <div className="map-placeholder-content">
                        <h3>📍 Select a Driver</h3>
                        <p>Click on a driver from the list to see their live location on the map</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
            )}
          </div>
        )}

        {/* SHIPMENT DETAILS MODAL */}
        {showShipmentDetails && selectedShipment && (
          <div className="shipment-modal-overlay" onClick={closeShipmentDetails}>
            <div className="shipment-modal" onClick={(e) => e.stopPropagation()}>
              <div className="shipment-modal-header">
                <h3>📦 Shipment Details</h3>
                <button className="modal-close-btn" onClick={closeShipmentDetails}>✕</button>
              </div>

              <div className="shipment-modal-content">
                {/* Shipment Info */}
                <div className="detail-section">
                  <h4>🚚 Shipment Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Shipment ID:</span>
                      <span className="detail-value">#{selectedShipment.id.slice(0, 8)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status:</span>
                      <span className={`status-badge-modal ${selectedShipment.status.toLowerCase()}`}>
                        {selectedShipment.status}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Created:</span>
                      <span className="detail-value">
                        {new Date(selectedShipment.created_at).toLocaleString()}
                      </span>
                    </div>
                    {selectedShipment.otp_code && (
                      <div className="detail-item">
                        <span className="detail-label">OTP Code:</span>
                        <span className="detail-value otp-code">{selectedShipment.otp_code}</span>
                      </div>
                    )}
                    {selectedShipment.otp_verified && (
                      <div className="detail-item">
                        <span className="detail-label">OTP Verified:</span>
                        <span className="detail-value success">✅ Yes</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location Info */}
                <div className="detail-section">
                  <h4>📍 Location Details</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Pickup:</span>
                      <span className="detail-value">
                        {selectedShipment.pickup_lat?.toFixed(4)}, {selectedShipment.pickup_lng?.toFixed(4)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Delivery:</span>
                      <span className="detail-value">
                        {selectedShipment.drop_lat?.toFixed(4)}, {selectedShipment.drop_lng?.toFixed(4)}
                      </span>
                    </div>
                    {selectedShipment.current_lat && selectedShipment.current_lng && (
                      <div className="detail-item">
                        <span className="detail-label">Current:</span>
                        <span className="detail-value">
                          {selectedShipment.current_lat.toFixed(4)}, {selectedShipment.current_lng.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                {selectedShipment.order?.order_items && selectedShipment.order.order_items.length > 0 && (
                  <div className="detail-section">
                    <h4>🛍️ Order Items</h4>
                    <div className="order-items-list">
                      {selectedShipment.order.order_items.map((item: any, idx: number) => (
                        <div key={idx} className="order-item-detail">
                          <div className="item-detail-row">
                            <span className="item-name">{item.products?.name || "Product"}</span>
                            <span className="item-price">₹{item.price_at_purchase}</span>
                          </div>
                          <div className="item-detail-row">
                            <span className="item-quantity">Quantity: {item.quantity}</span>
                            <span className="item-total">Total: ₹{item.quantity * item.price_at_purchase}</span>
                          </div>
                        </div>
                      ))}
                      <div className="order-total-detail">
                        <span>Total Amount:</span>
                        <span className="total-amount">
                          ₹{selectedShipment.order.order_items.reduce(
                            (sum: number, item: any) => sum + (item.quantity * item.price_at_purchase), 
                            0
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Driver Info */}
                <div className="detail-section">
                  <h4>🚗 Driver Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Driver ID:</span>
                      <span className="detail-value">
                        {drivers.find(d => d.id === selectedShipment.driver_id)?.name || "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                {selectedShipment.status === "COMPLETED" && (
                  <div className="detail-section">
                    <h4>✅ Delivery Completed</h4>
                    <p className="completion-message">
                      This order has been successfully delivered and verified.
                    </p>
                  </div>
                )}
              </div>

              <div className="shipment-modal-footer">
                <button className="btn-modal-close" onClick={closeShipmentDetails}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === "products" && (
          <div className="products-section">
            <div className="products-header">
              <h3>📦 My Products</h3>
              <button 
                className="btn-add-product"
                onClick={() => setShowProductForm(true)}
              >
                + Add Product
              </button>
            </div>

            {/* Product Form Modal */}
            {showProductForm && (
              <div className="product-form-overlay">
                <div className="product-form-modal">
                  <h3>{editingProduct ? "✏️ Edit Product" : "➕ Add New Product"}</h3>
                  <form onSubmit={handleProductSubmit}>
                    <div className="form-group">
                      <label>Product Name</label>
                      <input
                        type="text"
                        placeholder="Enter product name"
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Price (₹)</label>
                      <input
                        type="number"
                        placeholder="Enter price"
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="form-group">
                      <label>Stock Quantity</label>
                      <input
                        type="number"
                        placeholder="Enter stock quantity"
                        value={productForm.stock_quantity}
                        onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                        required
                        min="0"
                      />
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn-submit">
                        {editingProduct ? "Update" : "Add"} Product
                      </button>
                      <button type="button" className="btn-cancel" onClick={cancelProductForm}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Products Grid */}
            <div className="products-grid">
              {products.length === 0 ? (
                <div className="empty-state">
                  <p>No products yet. Add your first product!</p>
                </div>
              ) : (
                products
                  .filter(p => p.seller_id === user?.id)
                  .map((product, index) => (
                    <div 
                      key={product.id} 
                      className="product-card"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="product-header">
                        <h4>{product.name}</h4>
                        <span className={`stock-badge ${product.stock_quantity > 0 ? "in-stock" : "out-of-stock"}`}>
                          {product.stock_quantity > 0 ? "In Stock" : "Out of Stock"}
                        </span>
                      </div>
                      
                      <div className="product-details">
                        <p className="product-price">₹{product.price}</p>
                        <p className="product-stock">Stock: {product.stock_quantity} units</p>
                      </div>

                      <div className="product-actions">
                        <button 
                          className="btn-edit"
                          onClick={() => startEditProduct(product)}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className="btn-delete"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <>
            {geoLocation.error && (
              <div className="location-alert error">
                ⚠️ {geoLocation.error}
              </div>
            )}

            {geoLocation.latitude && geoLocation.longitude && (
              <div className="location-alert success">
                ✅ <strong>Your Location Detected:</strong> {geoLocation.latitude.toFixed(6)}, {geoLocation.longitude.toFixed(6)}
              </div>
            )}
          </>
        )}

        {activeTab === "orders" && confirmingOrderId && (
          <div className="confirm-panel">
            <h3>📍 Confirm Order Location Details</h3>
            
            {/* Driver Selection */}
            <div className="driver-selector">
              <label>🚗 Select Driver {drivers.length > 0 && <span style={{ color: "var(--success)", fontSize: "0.9rem" }}>({drivers.length} available)</span>}</label>
              <select
                className="driver-select"
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                required
              >
                <option value="">-- Choose a driver --</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name} - {driver.email}
                  </option>
                ))}
              </select>
              {drivers.length === 0 && (
                <p className="location-hint" style={{ color: "var(--danger)" }}>
                  ⚠️ No drivers available. Please add drivers first.
                </p>
              )}
              {selectedDriverId && (
                <p className="location-hint" style={{ color: "var(--success)" }}>
                  ✅ Driver selected: {drivers.find(d => d.id === selectedDriverId)?.name}
                </p>
              )}
            </div>
            
            <div className="location-section">
              <h4>Pickup Location (Your Store)</h4>
              
              <div className="address-input-group">
                <label>Pickup Address</label>
                <textarea
                  className="address-input"
                  placeholder="Enter your store address (Shop No, Building, Street, Area)"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="location-inputs">
                <input
                  className="location-input"
                  placeholder="Pickup Latitude"
                  value={pickupLat}
                  onChange={(e) => setPickupLat(e.target.value)}
                />
                <input
                  className="location-input"
                  placeholder="Pickup Longitude"
                  value={pickupLng}
                  onChange={(e) => setPickupLng(e.target.value)}
                />
              </div>
              <p className="location-hint">
                Auto-filled from your current location
              </p>
            </div>

            <div className="location-section">
              <h4>Drop Location (Customer Address)</h4>
              
              <div className="address-input-group">
                <label>Delivery Address (From Buyer)</label>
                <textarea
                  className="address-input readonly-input"
                  placeholder="Buyer's delivery address will appear here"
                  value={dropAddress}
                  readOnly
                  rows={2}
                  style={{ 
                    backgroundColor: '#f0f9ff', 
                    cursor: 'not-allowed',
                    border: '2px solid #10B981'
                  }}
                />
              </div>

              <div className="location-inputs">
                <input
                  className="location-input readonly-input"
                  placeholder="Drop Latitude"
                  value={dropLat}
                  readOnly
                  style={{ 
                    backgroundColor: '#f0f9ff', 
                    cursor: 'not-allowed' 
                  }}
                />
                <input
                  className="location-input readonly-input"
                  placeholder="Drop Longitude"
                  value={dropLng}
                  readOnly
                  style={{ 
                    backgroundColor: '#f0f9ff', 
                    cursor: 'not-allowed' 
                  }}
                />
              </div>
              <p className="location-hint" style={{ color: '#10B981', fontWeight: 600 }}>
                ✅ Auto-filled from buyer's delivery location
              </p>
            </div>

            <div className="confirm-actions">
              <button className="btn-confirm" onClick={() => confirm(confirmingOrderId)}>
                ✅ Confirm Order
              </button>
              <button className="btn-cancel" onClick={cancelConfirm}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="orders-grid">
            {orders.map((o, index) => {
              const details = orderDetails[o.id];
              const items = details?.order_items || [];
              
              return (
                <div 
                  key={o.id} 
                  className="order-card"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="order-header">
                    <span className="order-id">#{o.id.slice(0, 8)}</span>
                    <span className={`order-status ${o.status === "PENDING_CONFIRMATION" ? "pending" : "confirmed"}`}>
                      {o.status.replace("_", " ")}
                    </span>
                  </div>
                  
                  <div className="order-info">
                    <p><strong>Created:</strong> {new Date(o.created_at).toLocaleString()}</p>
                  </div>
                  
                  {items.length > 0 && (
                    <div className="order-items">
                      <p className="order-items-title">📦 Order Items</p>
                      {items.map((item: any, idx: number) => (
                        <div key={idx} className="order-item">
                          <p className="item-name">
                            {item.products?.name || "Product"}
                          </p>
                          <p className="item-details">
                            Quantity: {item.quantity} × ₹{item.price_at_purchase} = ₹{item.quantity * item.price_at_purchase}
                          </p>
                        </div>
                      ))}
                      <p className="order-total">
                        Total Items: {items.reduce((sum: number, item: any) => sum + item.quantity, 0)} | 
                        Total: ₹{items.reduce((sum: number, item: any) => sum + (item.quantity * item.price_at_purchase), 0)}
                      </p>
                    </div>
                  )}

                  {o.status === "PENDING_CONFIRMATION" && !confirmingOrderId && (
                    <button className="btn-confirm-order" onClick={() => startConfirm(o.id)}>
                      Confirm Order
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}