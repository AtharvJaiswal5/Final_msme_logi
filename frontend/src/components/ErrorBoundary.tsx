import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--bg-dark)",
          color: "var(--cream)",
          padding: "20px",
          textAlign: "center"
        }}>
          <div style={{
            maxWidth: "600px",
            background: "rgba(255, 255, 255, 0.05)",
            padding: "40px",
            borderRadius: "16px",
            border: "2px solid rgba(255, 159, 28, 0.3)"
          }}>
            <h1 style={{ fontSize: "3rem", marginBottom: "20px" }}>😕</h1>
            <h2 style={{ marginBottom: "15px", color: "var(--orange)" }}>
              Oops! Something went wrong
            </h2>
            <p style={{ marginBottom: "10px", color: "var(--text-secondary)" }}>
              We're sorry for the inconvenience. The application encountered an unexpected error.
            </p>
            {this.state.error && (
              <details style={{
                marginTop: "20px",
                padding: "15px",
                background: "rgba(0, 0, 0, 0.3)",
                borderRadius: "8px",
                textAlign: "left",
                fontSize: "0.9rem"
              }}>
                <summary style={{ cursor: "pointer", marginBottom: "10px", fontWeight: "600" }}>
                  Error Details
                </summary>
                <code style={{ color: "#ff6b6b" }}>
                  {this.state.error.toString()}
                </code>
              </details>
            )}
            <button
              onClick={this.handleReset}
              style={{
                marginTop: "30px",
                padding: "12px 30px",
                background: "var(--orange)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              🏠 Go to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
