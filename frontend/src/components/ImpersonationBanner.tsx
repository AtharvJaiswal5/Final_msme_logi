import { useAuth } from "../context/AuthContext";
import "../styles/ImpersonationBanner.css";

export default function ImpersonationBanner() {
  const { isImpersonating, impersonationInfo, exitImpersonation, user } = useAuth();

  if (!isImpersonating || !impersonationInfo) return null;

  const handleExit = async () => {
    await exitImpersonation();
    // Force full page reload to admin dashboard
    window.location.href = "/admin";
  };

  return (
    <div className="impersonation-banner">
      <div className="impersonation-content">
        <span className="impersonation-icon">👤</span>
        <span className="impersonation-text">
          Viewing as <strong>{user?.name}</strong> ({impersonationInfo.targetRole})
        </span>
        <span className="impersonation-admin">
          Admin: {impersonationInfo.adminName}
        </span>
      </div>
      <button onClick={handleExit} className="exit-impersonation-btn">
        Exit Impersonation
      </button>
    </div>
  );
}
