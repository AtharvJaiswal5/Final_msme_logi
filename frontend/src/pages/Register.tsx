import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Auth.css";

export default function Register() {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const roleConfig = {
    buyer: { icon: "🛒", title: "Buyer", color: "#FF9F1C" },
    seller: { icon: "🏭", title: "Seller", color: "#FF9F1C" },
    driver: { icon: "🚚", title: "Driver", color: "#FF9F1C" },
    admin: { icon: "👑", title: "Admin", color: "#FF9F1C" }
  };

  const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.buyer;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(name, email, password, phone, role!);
      navigate(`/${role}`);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header" style={{ borderColor: config.color }}>
          <div className="auth-icon" style={{ background: config.color }}>
            {config.icon}
          </div>
          <h1>{config.title} Registration</h1>
          <p>Create your account to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              autoFocus
              minLength={2}
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number (Optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
            <small>Minimum 6 characters</small>
          </div>

          <button
            type="submit"
            className="auth-button"
            style={{ background: config.color }}
            disabled={loading}
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{" "}
            <Link to={`/login/${role}`} style={{ color: config.color }}>
              Login here
            </Link>
          </p>
          <Link to="/" className="back-link">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
