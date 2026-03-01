interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export default function Loading({ message = "Loading...", fullScreen = false }: LoadingProps) {
  const containerStyle: React.CSSProperties = fullScreen ? {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg-dark)",
    zIndex: 9999
  } : {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px"
  };

  return (
    <div style={containerStyle}>
      <div className="loading-spinner"></div>
      <p style={{
        marginTop: "20px",
        color: "var(--text-secondary)",
        fontSize: "1rem"
      }}>
        {message}
      </p>
      
      <style>{`
        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255, 159, 28, 0.2);
          border-top-color: var(--orange);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
