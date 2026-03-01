import express, { Request, Response } from "express";
import { createServer } from "http";
import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

// Initialize Socket.IO
import { initializeSocket } from "./lib/socket";

// Security middleware
import { securityHeaders, configureCORS, securityLogger, preventParameterPollution, requestSizeLimiter } from "./middleware/security";

// Routes
import authRoutes from "./routes/authRoutes";
import orderRoutes from "./routes/orderRoutes";
import shipmentRoutes from "./routes/shipmentRoutes";
import buyersRoutes from "./routes/buyersRoutes";
import productRoutes from "./routes/productRoutes";
import orderItemRoutes from "./routes/orderItemRoutes";
import driversRoutes from "./routes/driversRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import impersonationRoutes from "./routes/impersonationRoutes";
import notificationRoutes from "./routes/notificationRoutes";

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocket(httpServer);

// ===================================
// SECURITY MIDDLEWARE (Applied First)
// ===================================

// 1. Security headers (Helmet)
app.use(securityHeaders);

// 2. Request logging for security monitoring
app.use(securityLogger);

// 3. Request size limiter (DoS prevention)
app.use(requestSizeLimiter);

// 4. CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",");
app.use(configureCORS(allowedOrigins));

// 5. Parameter pollution prevention
app.use(preventParameterPollution);

// 6. Rate limiting - REMOVED global limiter, using route-specific limiters instead
// Route-specific limiters are applied in individual route files for better control

// 7. JSON body parser with size limit
app.use(express.json({ limit: "10mb" }));

// ===================================
// ROUTES
// ===================================

app.use("/auth", authRoutes);
app.use("/buyers", buyersRoutes);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);
app.use("/order-items", orderItemRoutes);
app.use("/shipments", shipmentRoutes);
app.use("/drivers", driversRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/impersonation", impersonationRoutes);
app.use("/notifications", notificationRoutes);

// Health check (no rate limiting)
app.get("/", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    message: "MSME Backend Running 🚚",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development"
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found"
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error("❌ Server Error:", err);
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === "production" 
      ? "Internal server error" 
      : err.message
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔌 WebSocket server ready`);
  console.log(`🔒 Security: Enabled`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🚦 Rate limiting: Route-specific (Read: 100/min, Write: varies)`);
});