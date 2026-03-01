import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import ImpersonationBanner from "./components/ImpersonationBanner";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Buyer from "./pages/BuyerNew";
import Seller from "./pages/Seller";
import Driver from "./pages/Driver";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ImpersonationBanner />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login/:role" element={<Login />} />
          <Route path="/register/:role" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/buyer"
            element={
              <ProtectedRoute requiredRole="buyer">
                <Buyer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller"
            element={
              <ProtectedRoute requiredRole="seller">
                <Seller />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver"
            element={
              <ProtectedRoute requiredRole="driver">
                <Driver />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <Admin />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}
