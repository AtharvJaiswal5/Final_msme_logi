import { useState, useMemo } from "react";
import "../styles/OrderHistory.css";

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  order_items?: any[];
}

interface OrderHistoryProps {
  orders: Order[];
  onOrderClick?: (orderId: string) => void;
}

export default function OrderHistory({ orders, onOrderClick }: OrderHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(order => 
        new Date(order.created_at) >= filterDate
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "date") {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === "amount") {
        comparison = (a.total_amount || 0) - (b.total_amount || 0);
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [orders, searchTerm, statusFilter, dateFilter, sortBy, sortOrder]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === "PENDING").length;
    const confirmed = orders.filter(o => o.status === "CONFIRMED").length;
    const completed = orders.filter(o => o.status === "COMPLETED").length;
    const totalSpent = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    return { total, pending, confirmed, completed, totalSpent };
  }, [orders]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "#FFB84D",
      CONFIRMED: "#4FC3F7",
      IN_TRANSIT: "#AB47BC",
      DELIVERED: "#66BB6A",
      COMPLETED: "#10B981",
      CANCELLED: "#EF5350"
    };
    return colors[status] || "#8B7D72";
  };

  return (
    <div className="order-history-container">
      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Orders</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">₹{stats.totalSpent.toFixed(2)}</div>
            <div className="stat-label">Total Spent</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-container">
        <div className="filter-group">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Search by Order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="filter-group">
          <select
            className="filter-select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>

        <div className="filter-group">
          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "date" | "amount")}
          >
            <option value="date">Sort by Date</option>
            <option value="amount">Sort by Amount</option>
          </select>
        </div>

        <button
          className="sort-toggle-btn"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          title={sortOrder === "asc" ? "Ascending" : "Descending"}
        >
          {sortOrder === "asc" ? "↑" : "↓"}
        </button>
      </div>

      {/* Results Count */}
      <div className="results-info">
        Showing {filteredOrders.length} of {orders.length} orders
      </div>

      {/* Orders List */}
      <div className="orders-list">
        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No orders found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="history-order-card"
              onClick={() => onOrderClick?.(order.id)}
            >
              <div className="order-header">
                <div className="order-id">
                  <span className="order-label">Order ID:</span>
                  <span className="order-value">#{order.id.slice(0, 8)}</span>
                </div>
                <div
                  className="order-status-badge"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {order.status}
                </div>
              </div>

              <div className="order-details">
                <div className="order-detail-item">
                  <span className="detail-icon">📅</span>
                  <span className="detail-text">{formatDate(order.created_at)}</span>
                </div>
                <div className="order-detail-item">
                  <span className="detail-icon">💰</span>
                  <span className="detail-text">₹{order.total_amount?.toFixed(2) || "0.00"}</span>
                </div>
                {order.order_items && order.order_items.length > 0 && (
                  <div className="order-detail-item">
                    <span className="detail-icon">📦</span>
                    <span className="detail-text">{order.order_items.length} items</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
