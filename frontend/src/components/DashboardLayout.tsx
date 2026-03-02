import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import NotificationBell from "./NotificationBell";
import "../styles/Dashboard.css";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  icon: string;
}

export default function DashboardLayout({ children, title, icon }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="dashboard-title">
              <span className="title-icon">{icon}</span>
              {title}
            </h1>
            <p className="user-name">{user?.name}</p>
          </div>
          <div className="header-actions">
            <NotificationBell />
            <button onClick={handleLogout} className="logout-btn">
              <span>🚪</span> Logout
            </button>
          </div>
        </div>
      </header>
      
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
}
