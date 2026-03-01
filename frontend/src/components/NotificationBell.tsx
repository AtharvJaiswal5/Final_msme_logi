import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/NotificationBell.css";

const BASE_URL = "http://localhost:5000";

interface Notification {
  id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  metadata?: any;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Only show for sellers and drivers
  if (!user || !["seller", "driver"].includes(user.role)) {
    return null;
  }

  useEffect(() => {
    loadNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadNotifications() {
    if (!user) return;
    
    try {
      const res = await fetch(`${BASE_URL}/notifications/${user.id}/${user.role}?limit=10`);
      const data = await res.json();
      
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.filter((n: Notification) => !n.is_read).length);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      await fetch(`${BASE_URL}/notifications/${notificationId}/read`, {
        method: "PATCH"
      });
      loadNotifications();
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  }

  async function markAllAsRead() {
    if (!user) return;
    
    setLoading(true);
    try {
      await fetch(`${BASE_URL}/notifications/mark-all-read/${user.id}/${user.role}`, {
        method: "PATCH"
      });
      loadNotifications();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteNotification(notificationId: string) {
    try {
      await fetch(`${BASE_URL}/notifications/${notificationId}`, {
        method: "DELETE"
      });
      loadNotifications();
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  }

  function formatTime(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button 
        className="notification-bell-btn"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read-btn"
                onClick={markAllAsRead}
                disabled={loading}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <span className="no-notif-icon">📭</span>
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`notification-item ${!notif.is_read ? "unread" : ""}`}
                >
                  <div className="notif-content" onClick={() => !notif.is_read && markAsRead(notif.id)}>
                    <div className="notif-icon">
                      {notif.type === "admin_action" ? "👑" : "📢"}
                    </div>
                    <div className="notif-text">
                      <p className="notif-message">{notif.message}</p>
                      <span className="notif-time">{formatTime(notif.created_at)}</span>
                    </div>
                  </div>
                  <button 
                    className="delete-notif-btn"
                    onClick={() => deleteNotification(notif.id)}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
