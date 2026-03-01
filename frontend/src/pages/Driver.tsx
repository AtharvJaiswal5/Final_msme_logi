import { useEffect, useState, useCallback } from "react";
import { useGeolocation } from "../hooks/useGeolocation";
import { useSocket, useSocketEvent } from "../hooks/useSocket";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../components/DashboardLayout";
import Toast from "../components/Toast";
import "../styles/Driver.css";

const BASE_URL = "http://localhost:5000";

export default function Driver() {
  const { user } = useAuth();
  const { toasts, removeToast, success, error, warning } = useToast();
  const DRIVER_ID = user?.id || "eaed5bc9-c85d-4bb6-9c76-f8f1db6e67eb";

  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [shipments, setShipments] = useState<any[]>([]);
  const [historyShipments, setHistoryShipments] = useState<any[]>([]);
  const [orderDetails, setOrderDetails] = useState<Record<string, any>>({});
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [verifyingShipment, setVerifyingShipment] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  
  const socket = useSocket("driver", DRIVER_ID);
  const geoLocation = useGeolocation({ watch: true });

  // Statistics
  const totalDeliveries = historyShipments.filter(s => s.status === "COMPLETED").length;
  const activeDeliveries = shipments.length; // Count all active shipments (not completed/cancelled)
  
  const today = new Date().toDateString();
  console.log("📅 Today's date:", today);
  
  const completedToday = historyShipments.filter(s => {
    if (s.status !== "COMPLETED") return false;
    
    // Check otp_verified_at first, then updated_at, then created_at as fallback
    const completionDate = s.otp_verified_at || s.updated_at || s.created_at;
    
    if (!completionDate) {
      console.log(`⚠️ Shipment ${s.id?.slice(0, 8)} has no date fields`);
      return false;
    }
    
    const shipmentDate = new Date(completionDate).toDateString();
    
    console.log(`📦 Shipment ${s.id?.slice(0, 8)}:`, {
      status: s.status,
      otp_verified_at: s.otp_verified_at,
      updated_at: s.updated_at,
      created_at: s.created_at,
      completionDate,
      shipmentDate,
      isToday: shipmentDate === today
    });
    
    return shipmentDate === today;
  }).length;
  
  console.log("✅ Completed Today Count:", completedToday);

  useSocketEvent(socket, "shipment:assigned", useCallback((shipment: any) => {
    console.log("📦 New shipment assigned:", shipment);
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("New Delivery!", {
        body: `Shipment ${shipment.id.slice(0, 8)} assigned to you`,
        icon: "/vite.svg"
      });
    }
    setShipments(prev => [shipment, ...prev]);
    if (shipment.order_id) {
      fetchOrderDetails(shipment.order_id);
    }
  }, []));

  useSocketEvent(socket, "shipment:updated", useCallback((shipment: any) => {
    console.log("🔄 Shipment updated:", shipment);
    setShipments(prev => prev.map(s => s.id === shipment.id ? shipment : s));
    setHistoryShipments(prev => prev.map(s => s.id === shipment.id ? shipment : s));
  }, []));

  useSocketEvent(socket, "delivery:completed", useCallback((data: any) => {
    console.log("✅ Delivery completed:", data);
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Delivery Completed!", {
        body: data.message,
        icon: "/vite.svg"
      });
    }
    // Reload shipments after completion
    fetch(`${BASE_URL}/shipments/driver/${DRIVER_ID}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const active = data.filter(s => s.status !== "COMPLETED" && s.status !== "CANCELLED");
          const history = data.filter(s => s.status === "COMPLETED" || s.status === "CANCELLED");
          setShipments(active);
          setHistoryShipments(history);
        }
      })
      .catch(err => console.error("Failed to reload shipments:", err));
  }, [DRIVER_ID]));

  async function loadShipments() {
    console.log("🔍 Loading shipments for driver:", DRIVER_ID);
    try {
      const res = await fetch(`${BASE_URL}/shipments/driver/${DRIVER_ID}`);
      console.log("📡 Response status:", res.status);
      
      if (!res.ok) {
        if (res.status === 429) {
          console.warn("Rate limit hit, will retry via WebSocket updates");
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      console.log("📦 Received shipments data:", data);
      
      if (!Array.isArray(data)) {
        console.error("Invalid response format:", data);
        return;
      }
      
      // Separate active and completed shipments
      const active = data.filter(s => s.status !== "COMPLETED" && s.status !== "CANCELLED");
      const history = data.filter(s => s.status === "COMPLETED" || s.status === "CANCELLED");
      
      console.log("✅ Active shipments:", active.length);
      console.log("📜 History shipments:", history.length);
      
      setShipments(active);
      setHistoryShipments(history);
      
      for (const shipment of data) {
        if (shipment.order_id) {
          await fetchOrderDetails(shipment.order_id);
        }
      }
    } catch (err) {
      console.error("Failed to load shipments:", err);
    }
  }

  async function fetchOrderDetails(orderId: string) {
    try {
      const res = await fetch(`${BASE_URL}/orders/${orderId}`);
      const data = await res.json();
      setOrderDetails(prev => ({ ...prev, [orderId]: data }));
    } catch (err) {
      console.error("Failed to fetch order details:", err);
    }
  }

  async function updateLocation(shipment_id: string) {
    if (!geoLocation.latitude || !geoLocation.longitude) {
      warning("Location not available. Please enable location services.");
      return;
    }

    try {
      await fetch(`${BASE_URL}/shipments/location`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipment_id,
          lat: geoLocation.latitude,
          lng: geoLocation.longitude
        })
      });
      success("Location updated successfully! 📍");
      loadShipments();
    } catch (err) {
      error("Failed to update location");
      console.error(err);
    }
  }

  async function markAsDelivered(shipment_id: string) {
    try {
      const res = await fetch(`${BASE_URL}/shipments/${shipment_id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DELIVERED" })
      });
      if (res.ok) {
        success("Marked as delivered! Now enter OTP to complete. 🎉");
        loadShipments();
      } else {
        error("Failed to mark as delivered");
      }
    } catch (err) {
      error("Failed to mark as delivered");
      console.error(err);
    }
  }

  async function verifyOtp(shipment_id: string) {
    const otp = otpInputs[shipment_id];
    if (!otp || otp.length !== 4) {
      warning("Please enter a valid 4-digit OTP");
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/shipments/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipment_id, otp })
      });
      const data = await res.json();
      
      if (res.ok) {
        success(data.message || "Delivery completed successfully! 🎉");
        setOtpInputs(prev => ({ ...prev, [shipment_id]: "" }));
        setVerifyingShipment(null);
        loadShipments();
      } else {
        error(data.message || "Invalid OTP. Please try again.");
      }
    } catch (err) {
      error("Failed to verify OTP. Please check your connection.");
      console.error(err);
    }
  }

  function handleOtpChange(shipment_id: string, value: string) {
    const numericValue = value.replace(/\D/g, '').slice(0, 4);
    setOtpInputs(prev => ({ ...prev, [shipment_id]: numericValue }));
  }

  // Filter history shipments
  const filteredHistory = historyShipments.filter(s => {
    const matchesSearch = s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.order_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== "all") {
      const shipmentDate = new Date(s.updated_at);
      const today = new Date();
      
      if (dateFilter === "today") {
        matchesDate = shipmentDate.toDateString() === today.toDateString();
      } else if (dateFilter === "week") {
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = shipmentDate >= weekAgo;
      } else if (dateFilter === "month") {
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = shipmentDate >= monthAgo;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  useEffect(() => {
    loadShipments();
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Debug logging
  console.log("🚚 Driver Component Rendering");
  console.log("📊 Stats:", { activeDeliveries, totalDeliveries, completedToday });
  console.log("📦 Shipments:", shipments.length);
  console.log("📜 History:", historyShipments.length);
  console.log("🗂️ Active Tab:", activeTab);

  return (
    <DashboardLayout title="Driver Portal" icon="🚚">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#FFE5B4" }}>🚚</div>
          <div className="stat-value">{activeDeliveries}</div>
          <div className="stat-label">Active Deliveries</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#C8E6C9" }}>✅</div>
          <div className="stat-value">{totalDeliveries}</div>
          <div className="stat-label">Total Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#BBDEFB" }}>📦</div>
          <div className="stat-value">{completedToday}</div>
          <div className="stat-label">Completed Today</div>
        </div>
      </div>

      {/* Location Status */}
      <div className={`location-status ${geoLocation.error ? 'error' : 'tracking'}`}>
        {geoLocation.loading && <p>📍 Detecting your location...</p>}
        {geoLocation.error && (
          <>
            <h3>⚠️ Location Error</h3>
            <p>{geoLocation.error}</p>
          </>
        )}
        {geoLocation.latitude && geoLocation.longitude && (
          <>
            <h3>✅ Location Tracking Active</h3>
            <p className="location-coords">
              {geoLocation.latitude.toFixed(6)}, {geoLocation.longitude.toFixed(6)}
            </p>
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Location updates automatically
            </small>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="driver-tabs">
        <button 
          className={`tab-btn ${activeTab === "active" ? "active" : ""}`}
          onClick={() => setActiveTab("active")}
        >
          🚚 Active Deliveries
        </button>
        <button 
          className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          📊 Delivery History
        </button>
      </div>

      {activeTab === "active" ? (
        <div className="shipments-grid">
          {shipments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>No active deliveries</h3>
              <p>New shipments will appear here when assigned</p>
            </div>
          ) : (
            shipments.map((s, index) => {
              const details = orderDetails[s.order_id];
              const items = details?.order_items || [];
              
              return (
                <div 
                  key={s.id} 
                  className="shipment-card"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="shipment-header">
                    <span className="shipment-id">#{s.id.slice(0, 8)}</span>
                    <span className={`shipment-status ${s.status === "IN_TRANSIT" ? "in-transit" : "delivered"}`}>
                      {s.status.replace("_", " ")}
                    </span>
                  </div>
                  
                  <div className="shipment-info">
                    <p><strong>Order ID:</strong> {s.order_id.slice(0, 8)}...</p>
                    <p><strong>Current Status:</strong> {s.status}</p>
                  </div>
                  
                  {items.length > 0 && (
                    <div className="location-info">
                      <h4>📦 Delivering</h4>
                      {items.map((item: any, idx: number) => (
                        <div key={idx} style={{ 
                          padding: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          marginBottom: '6px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--glass-border)',
                          color: 'var(--text-secondary)',
                          fontSize: '0.9rem'
                        }}>
                          <strong style={{ color: 'var(--text-primary)' }}>
                            {item.products?.name || "Product"}
                          </strong>
                          {' × '}{item.quantity}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Pickup Location */}
                  {s.pickup_lat && s.pickup_lng && (
                    <div className="location-info" style={{ background: 'rgba(139, 92, 246, 0.1)', borderColor: '#8b5cf6' }}>
                      <h4>🏭 Pickup Location</h4>
                      {s.pickup_address && (
                        <p style={{ 
                          color: 'var(--text-primary)', 
                          fontSize: '0.95rem', 
                          marginBottom: '10px',
                          padding: '10px',
                          background: 'white',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid rgba(139, 92, 246, 0.2)'
                        }}>
                          {s.pickup_address}
                        </p>
                      )}
                      <p className="location-coords-small">
                        📍 {s.pickup_lat}, {s.pickup_lng}
                      </p>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${s.pickup_lat},${s.pickup_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="navigation-btn"
                        style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}
                      >
                        🗺️ Navigate to Pickup
                      </a>
                    </div>
                  )}
                  
                  {/* Drop Location */}
                  {s.drop_lat && s.drop_lng && (
                    <div className="location-info" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981' }}>
                      <h4>📍 Delivery Location</h4>
                      {s.drop_address && (
                        <p style={{ 
                          color: 'var(--text-primary)', 
                          fontSize: '0.95rem', 
                          marginBottom: '10px',
                          padding: '10px',
                          background: 'white',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}>
                          {s.drop_address}
                        </p>
                      )}
                      <p className="location-coords-small">
                        📍 {s.drop_lat}, {s.drop_lng}
                      </p>
                      
                      {s.entered_delivery_zone_at && (
                        <div className="delivery-zone-badge">
                          🎯 Inside Delivery Zone
                        </div>
                      )}
                      
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${s.drop_lat},${s.drop_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="navigation-btn"
                        style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}
                      >
                        🗺️ Navigate to Delivery
                      </a>
                    </div>
                  )}

                  {s.status !== "COMPLETED" && (
                    <div style={{ marginTop: '15px' }}>
                      <button 
                        className="update-location-btn" 
                        onClick={() => updateLocation(s.id)}
                      >
                        📍 Update My Location
                      </button>

                      {s.status !== "DELIVERED" && (
                        <button 
                          className="mark-delivered-btn" 
                          onClick={() => markAsDelivered(s.id)}
                        >
                          ✅ Mark as Delivered
                        </button>
                      )}
                    </div>
                  )}

                  {s.status === "DELIVERED" && (
                    <div className="otp-section">
                      <h4>🔐 Verify Delivery</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}>
                        Enter the 4-digit OTP from the customer to complete delivery
                      </p>
                      <div className="otp-input-group">
                        <input
                          type="text"
                          className="otp-input"
                          placeholder="0000"
                          value={otpInputs[s.id] || ""}
                          onChange={(e) => handleOtpChange(s.id, e.target.value)}
                          maxLength={4}
                        />
                      </div>
                      <button 
                        className="verify-btn" 
                        onClick={() => verifyOtp(s.id)}
                        disabled={!otpInputs[s.id] || otpInputs[s.id].length !== 4}
                      >
                        {verifyingShipment === s.id ? "Verifying..." : "Verify OTP"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="history-section">
          {/* History Statistics */}
          <div className="history-stats">
            <div className="stat-card">
              <div className="stat-value">{totalDeliveries}</div>
              <div className="stat-label">Total Deliveries</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{completedToday}</div>
              <div className="stat-label">Today</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {historyShipments.filter(s => {
                  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                  return s.status === "COMPLETED" && new Date(s.updated_at) >= weekAgo;
                }).length}
              </div>
              <div className="stat-label">This Week</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {historyShipments.filter(s => s.status === "CANCELLED").length}
              </div>
              <div className="stat-label">Cancelled</div>
            </div>
          </div>

          {/* Filters */}
          <div className="history-filters">
            <input
              type="text"
              className="filter-search"
              placeholder="🔍 Search by Order ID or Shipment ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select 
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select 
              className="filter-select"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* History Grid */}
          <div className="history-grid">
            {filteredHistory.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>No delivery history</h3>
                <p>Completed deliveries will appear here</p>
              </div>
            ) : (
              filteredHistory.map((s, index) => {
                const details = orderDetails[s.order_id];
                const items = details?.order_items || [];
                
                return (
                  <div 
                    key={s.id} 
                    className="history-card"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="history-card-header">
                      <span className="shipment-id">#{s.id.slice(0, 8)}</span>
                      <span className={`status-badge status-${s.status.toLowerCase()}`}>
                        {s.status}
                      </span>
                    </div>
                    
                    <div className="history-card-body">
                      <div className="history-info-row">
                        <span className="info-label">Order ID</span>
                        <span className="info-value">{s.order_id.slice(0, 8)}</span>
                      </div>
                      
                      <div className="history-info-row">
                        <span className="info-label">Completed</span>
                        <span className="info-value">
                          {new Date(s.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {items.length > 0 && (
                        <div className="history-items">
                          <div className="items-title">📦 Items Delivered</div>
                          {items.slice(0, 3).map((item: any, idx: number) => (
                            <div key={idx} className="history-item">
                              <span>{item.products?.name || "Product"}</span>
                              <span>×{item.quantity}</span>
                            </div>
                          ))}
                          {items.length > 3 && (
                            <div className="more-items">
                              +{items.length - 3} more items
                            </div>
                          )}
                        </div>
                      )}
                      
                      {s.status === "COMPLETED" && s.otp_verified_at && (
                        <div className="verified-badge">
                          ✅ OTP Verified
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
