import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "buyer" | "seller" | "driver" | "admin";
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone: string, role: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  impersonate: (targetUserId: string, targetRole: "seller" | "driver") => Promise<void>;
  exitImpersonation: () => void;
  isImpersonating: boolean;
  impersonationInfo: { adminId: string; adminName: string; targetRole: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonationInfo, setImpersonationInfo] = useState<{ adminId: string; adminName: string; targetRole: string } | null>(null);
  const location = useLocation();

  // Load user from localStorage on mount and when path changes
  useEffect(() => {
    try {
      // Check for impersonation first
      const impInfo = localStorage.getItem("impersonation_info");
      if (impInfo) {
        const parsedImpInfo = JSON.parse(impInfo);
        setImpersonationInfo(parsedImpInfo);
        setIsImpersonating(true);
      }
      
      // Determine which role to load based on current URL
      const path = location.pathname;
      let roleToLoad: "buyer" | "seller" | "driver" | "admin" | null = null;
      
      // Use exact path matching to avoid confusion
      if (path === "/buyer" || path.startsWith("/buyer/")) {
        roleToLoad = "buyer";
      } else if (path === "/seller" || path.startsWith("/seller/")) {
        roleToLoad = "seller";
      } else if (path === "/driver" || path.startsWith("/driver/")) {
        roleToLoad = "driver";
      } else if (path === "/admin" || path.startsWith("/admin/")) {
        roleToLoad = "admin";
      }
      
      // If we're on a role-specific page, load that role's user ONLY
      if (roleToLoad) {
        const storageKey = `user_${roleToLoad}`;
        const storedUser = localStorage.getItem(storageKey);
        
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } else {
          setUser(null);
        }
        setLoading(false);
        return;
      }
      
      // For non-role-specific pages (landing, login, register), clear user
      setUser(null);
    } catch (err) {
      console.error("Failed to load user from localStorage:", err);
      localStorage.removeItem("user_buyer");
      localStorage.removeItem("user_seller");
      localStorage.removeItem("user_driver");
      localStorage.removeItem("user_admin");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [location.pathname]);

  const login = async (email: string, password: string, role: string) => {
    const response = await fetch("http://localhost:5000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Login failed");
    }
    
    setUser(data.user);
    
    // Save user data and tokens to role-specific keys
    localStorage.setItem(`user_${data.user.role}`, JSON.stringify(data.user));
    localStorage.setItem(`token_${data.user.role}`, data.accessToken);
    localStorage.setItem(`refreshToken_${data.user.role}`, data.refreshToken);
  };

  const register = async (name: string, email: string, password: string, phone: string, role: string) => {
    const response = await fetch("http://localhost:5000/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, phone, role })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Registration failed");
    }

    setUser(data.user);
    
    // Save user data and tokens to role-specific keys
    localStorage.setItem(`user_${data.user.role}`, JSON.stringify(data.user));
    localStorage.setItem(`token_${data.user.role}`, data.accessToken);
    localStorage.setItem(`refreshToken_${data.user.role}`, data.refreshToken);
  };

  const logout = () => {
    if (user) {
      localStorage.removeItem(`user_${user.role}`);
      localStorage.removeItem(`token_${user.role}`);
      localStorage.removeItem(`refreshToken_${user.role}`);
    }
    // Clear impersonation data
    localStorage.removeItem("impersonation_info");
    setIsImpersonating(false);
    setImpersonationInfo(null);
    setUser(null);
  };

  const impersonate = async (targetUserId: string, targetRole: "seller" | "driver") => {
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can impersonate");
    }

    const response = await fetch("http://localhost:5000/impersonation/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminId: user.id,
        targetUserId,
        targetRole
      })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Impersonation failed");
    }

    // Get current admin token before switching
    const adminToken = localStorage.getItem("token_admin");
    const adminRefreshToken = localStorage.getItem("refreshToken_admin");

    // Save impersonation info including admin tokens
    const impInfo = {
      adminId: user.id,
      adminName: user.name,
      targetRole,
      originalAdminData: user,
      adminToken,
      adminRefreshToken
    };
    
    localStorage.setItem("impersonation_info", JSON.stringify(impInfo));
    setImpersonationInfo(impInfo);
    setIsImpersonating(true);

    // Set target user as current user
    setUser(data.targetUser);
    localStorage.setItem(`user_${targetRole}`, JSON.stringify(data.targetUser));
    localStorage.setItem(`token_${targetRole}`, data.impersonationToken);
  };

  const exitImpersonation = async () => {
    const impInfo = localStorage.getItem("impersonation_info");
    if (!impInfo) return;

    const { adminId, targetRole, originalAdminData, adminToken, adminRefreshToken } = JSON.parse(impInfo);

    // Notify backend
    try {
      await fetch("http://localhost:5000/impersonation/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId,
          targetUserId: user?.id,
          targetRole
        })
      });
    } catch (err) {
      console.error("Failed to notify backend:", err);
    }

    // Clean up impersonated user data
    localStorage.removeItem("impersonation_info");
    localStorage.removeItem(`user_${targetRole}`);
    localStorage.removeItem(`token_${targetRole}`);
    
    // Restore admin data in localStorage
    localStorage.setItem("user_admin", JSON.stringify(originalAdminData));
    if (adminToken) {
      localStorage.setItem("token_admin", adminToken);
    }
    if (adminRefreshToken) {
      localStorage.setItem("refreshToken_admin", adminRefreshToken);
    }

    // Restore admin user in state
    setUser(originalAdminData);
    setIsImpersonating(false);
    setImpersonationInfo(null);
  };

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#2B1E14",
        color: "#FFF3E6",
        fontSize: "1.5rem"
      }}>
        Loading...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      isAuthenticated: !!user,
      impersonate,
      exitImpersonation,
      isImpersonating,
      impersonationInfo
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
