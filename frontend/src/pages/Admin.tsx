import { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import "../styles/Admin.css";

const BASE_URL = "http://localhost:5000";

const COLORS = ["#FF9F1C", "#FFB84D", "#10B981", "#3B82F6", "#8B5CF6", "#EF4444"];

export default function Admin() {
  const { impersonate } = useAuth();
  const [overview, setOverview] = useState<any>(null);
  const [ordersTimeline, setOrdersTimeline] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [orderStatus, setOrderStatus] = useState<any[]>([]);
  const [usersByRole, setUsersByRole] = useState<any[]>([]);
  const [revenueTimeline, setRevenueTimeline] = useState<any[]>([]);
  const [timelinePeriod, setTimelinePeriod] = useState("week");
  const [loading, setLoading] = useState(true);
  const [showImpersonation, setShowImpersonation] = useState(false);
  const [impersonationRole, setImpersonationRole] = useState<"seller" | "driver">("seller");
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [timelinePeriod]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const [overviewRes, timelineRes, productsRes, statusRes, usersRes, revenueRes] = await Promise.all([
        fetch(`${BASE_URL}/analytics/overview`),
        fetch(`${BASE_URL}/analytics/orders-timeline?period=${timelinePeriod}`),
        fetch(`${BASE_URL}/analytics/top-products?limit=10`),
        fetch(`${BASE_URL}/analytics/order-status`),
        fetch(`${BASE_URL}/analytics/users-by-role`),
        fetch(`${BASE_URL}/analytics/revenue-timeline?period=${timelinePeriod}`)
      ]);

      const [overviewData, timelineData, productsData, statusData, usersData, revenueData] = await Promise.all([
        overviewRes.json(),
        timelineRes.json(),
        productsRes.json(),
        statusRes.json(),
        usersRes.json(),
        revenueRes.json()
      ]);

      setOverview(overviewData);
      setOrdersTimeline(timelineData);
      setTopProducts(productsData);
      setOrderStatus(statusData);
      setUsersByRole(usersData);
      setRevenueTimeline(revenueData);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsersForImpersonation(role: "seller" | "driver") {
    try {
      const res = await fetch(`${BASE_URL}/impersonation/users/${role}`);
      const data = await res.json();
      if (data.success) {
        setAvailableUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  }

  async function handleImpersonate(userId: string) {
    try {
      await impersonate(userId, impersonationRole);
      window.location.href = `/${impersonationRole}`;
    } catch (err: any) {
      alert(err.message || "Impersonation failed");
    }
  }

  function openImpersonationModal(role: "seller" | "driver") {
    setImpersonationRole(role);
    setShowImpersonation(true);
    loadUsersForImpersonation(role);
  }

  if (loading) {
    return (
      <DashboardLayout title="Admin Dashboard" icon="👑">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Admin Dashboard" icon="👑">
      {/* Overview Stats */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: "#FFE5B4" }}>📦</div>
          <div className="stat-value">{overview?.totalOrders || 0}</div>
          <div className="stat-label">Total Orders</div>
          <div className="stat-sub">{overview?.todayOrders || 0} today</div>
        </div>
        
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: "#C8E6C9" }}>💰</div>
          <div className="stat-value">₹{(overview?.totalRevenue || 0).toLocaleString()}</div>
          <div className="stat-label">Total Revenue</div>
          <div className="stat-sub">{overview?.completedOrders || 0} completed</div>
        </div>
        
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: "#BBDEFB" }}>👥</div>
          <div className="stat-value">{overview?.totalUsers || 0}</div>
          <div className="stat-label">Total Users</div>
        </div>
        
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: "#E1BEE7" }}>🚚</div>
          <div className="stat-value">{overview?.totalShipments || 0}</div>
          <div className="stat-label">Total Shipments</div>
        </div>
        
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: "#FFCCBC" }}>📦</div>
          <div className="stat-value">{overview?.totalProducts || 0}</div>
          <div className="stat-label">Total Products</div>
        </div>
      </div>

      {/* Impersonation Section */}
      <div className="impersonation-section">
        <h3>👤 Impersonate User</h3>
        <p>View and manage accounts as a seller or driver</p>
        <div className="impersonation-buttons">
          <button 
            className="impersonate-btn seller-btn"
            onClick={() => openImpersonationModal("seller")}
          >
            <span className="btn-icon">🏭</span>
            <span>Impersonate Seller</span>
          </button>
          <button 
            className="impersonate-btn driver-btn"
            onClick={() => openImpersonationModal("driver")}
          >
            <span className="btn-icon">🚚</span>
            <span>Impersonate Driver</span>
          </button>
        </div>
      </div>

      {/* Impersonation Modal */}
      {showImpersonation && (
        <div className="modal-overlay" onClick={() => setShowImpersonation(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select {impersonationRole === "seller" ? "Seller" : "Driver"} to Impersonate</h3>
              <button className="modal-close" onClick={() => setShowImpersonation(false)}>×</button>
            </div>
            <div className="modal-body">
              {availableUsers.length === 0 ? (
                <p className="no-users">No {impersonationRole}s found</p>
              ) : (
                <div className="users-list">
                  {availableUsers.map((user) => (
                    <div key={user.id} className="user-item">
                      <div className="user-info">
                        <div className="user-name">{user.name}</div>
                        <div className="user-email">{user.email}</div>
                      </div>
                      <button 
                        className="impersonate-user-btn"
                        onClick={() => handleImpersonate(user.id)}
                      >
                        Impersonate
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Period Selector */}
      <div className="period-selector">
        <button 
          className={timelinePeriod === "day" ? "active" : ""}
          onClick={() => setTimelinePeriod("day")}
        >
          Daily
        </button>
        <button 
          className={timelinePeriod === "week" ? "active" : ""}
          onClick={() => setTimelinePeriod("week")}
        >
          Weekly
        </button>
        <button 
          className={timelinePeriod === "month" ? "active" : ""}
          onClick={() => setTimelinePeriod("month")}
        >
          Monthly
        </button>
        <button 
          className={timelinePeriod === "year" ? "active" : ""}
          onClick={() => setTimelinePeriod("year")}
        >
          Yearly
        </button>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Orders Timeline */}
        <div className="chart-card">
          <h3>📈 Orders Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={ordersTimeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#FF9F1C" strokeWidth={2} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Timeline */}
        <div className="chart-card">
          <h3>💰 Revenue Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueTimeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue (₹)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="chart-card">
          <h3>🏆 Top Selling Products</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalQuantity" fill="#FF9F1C" name="Quantity Sold" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Distribution */}
        <div className="chart-card">
          <h3>📊 Order Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={orderStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.status}: ${entry.count}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {orderStatus.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Users by Role */}
        <div className="chart-card">
          <h3>👥 Users by Role</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={usersByRole}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="role" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3B82F6" name="Users" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="data-table-card">
        <h3>📋 Top Products Details</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Quantity Sold</th>
              <th>Price</th>
              <th>Total Revenue</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map((product, index) => (
              <tr key={index}>
                <td>{product.name}</td>
                <td>{product.totalQuantity}</td>
                <td>₹{product.price.toLocaleString()}</td>
                <td>₹{product.totalRevenue.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
