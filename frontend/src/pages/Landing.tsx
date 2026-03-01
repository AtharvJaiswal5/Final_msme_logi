import { Link } from "react-router-dom";
import "../styles/Landing.css";

export default function Landing() {
  return (
    <div className="landing-container">
      <div className="landing-content">
        <div className="hero-section">
          <h1 className="hero-title">
            <span className="gradient-text">MSME Logistics</span>
          </h1>
          <p className="hero-subtitle">
            Seamless delivery management for buyers, sellers, and drivers
          </p>
        </div>

        <div className="role-cards">
          <Link to="/login/buyer" className="role-card buyer-card">
            <div className="role-icon">🛒</div>
            <h2>Buyer Portal</h2>
            <p>Browse products, place orders, and track deliveries in real-time</p>
            <button className="role-button">Login as Buyer</button>
          </Link>

          <Link to="/login/seller" className="role-card seller-card">
            <div className="role-icon">🏭</div>
            <h2>Seller Portal</h2>
            <p>Manage products, confirm orders, and coordinate deliveries</p>
            <button className="role-button">Login as Seller</button>
          </Link>

          <Link to="/login/driver" className="role-card driver-card">
            <div className="role-icon">🚚</div>
            <h2>Driver Portal</h2>
            <p>View assignments, update location, and complete deliveries</p>
            <button className="role-button">Login as Driver</button>
          </Link>

          <Link to="/login/admin" className="role-card admin-card">
            <div className="role-icon">👑</div>
            <h2>Admin Portal</h2>
            <p>Analytics, reports, and complete system overview</p>
            <button className="role-button">Login as Admin</button>
          </Link>
        </div>

        <div className="features-section">
          <div className="feature">
            <span className="feature-icon">⚡</span>
            <span>Real-time Tracking</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🔒</span>
            <span>Secure OTP Verification</span>
          </div>
          <div className="feature">
            <span className="feature-icon">📍</span>
            <span>Auto Geolocation</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🔔</span>
            <span>Instant Notifications</span>
          </div>
        </div>
      </div>
    </div>
  );
}
