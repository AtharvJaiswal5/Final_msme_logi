import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: "buyer" | "seller" | "driver" | "admin";
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();

  console.log("ProtectedRoute check:", { user, isAuthenticated, requiredRole });

  if (!isAuthenticated) {
    console.log("Not authenticated, redirecting to login");
    return <Navigate to={`/login/${requiredRole}`} replace />;
  }

  if (user?.role !== requiredRole) {
    console.log("Wrong role, redirecting to home");
    return <Navigate to="/" replace />;
  }

  console.log("Access granted");
  return <>{children}</>;
}
