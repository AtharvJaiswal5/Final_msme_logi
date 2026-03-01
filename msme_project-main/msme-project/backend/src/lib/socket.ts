import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer;

/**
 * Initialize Socket.IO server
 * Real-time communication for order updates, driver location, and notifications
 */
export const initializeSocket = (httpServer: HTTPServer) => {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",");
  
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true
    },
    // Connection settings
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on("connection", (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Join room based on user role and ID
    socket.on("join", (data: { role: string; userId: string }) => {
      const { role, userId } = data;
      
      // Join role-specific room
      socket.join(`${role}:${userId}`);
      
      // Join general role room
      socket.join(role);
      
      console.log(`👤 User ${userId} joined as ${role}`);
      
      socket.emit("joined", {
        success: true,
        message: `Connected as ${role}`,
        socketId: socket.id
      });
    });

    // Driver location updates
    socket.on("driver:location", (data: { driverId: string; lat: number; lng: number }) => {
      console.log(`📍 Driver ${data.driverId} location update`);
      
      // Broadcast to all buyers and sellers
      socket.broadcast.emit("driver:location:update", data);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  console.log("🔌 Socket.IO initialized");
  return io;
};

/**
 * Get Socket.IO instance
 */
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initializeSocket first.");
  }
  return io;
};

/**
 * Emit order created event
 */
export const emitOrderCreated = (order: any) => {
  if (!io) return;
  
  // Notify seller
  io.to(`seller:${order.seller_id}`).emit("order:created", order);
  
  // Notify buyer
  io.to(`buyer:${order.buyer_id}`).emit("order:created", order);
  
  console.log(`📢 Order created event emitted: ${order.id}`);
};

/**
 * Emit order confirmed event
 */
export const emitOrderConfirmed = (order: any, shipment: any) => {
  if (!io) return;
  
  // Notify buyer
  io.to(`buyer:${order.buyer_id}`).emit("order:confirmed", { order, shipment });
  
  // Notify driver
  io.to(`driver:${shipment.driver_id}`).emit("shipment:assigned", shipment);
  
  console.log(`📢 Order confirmed event emitted: ${order.id}`);
};

/**
 * Emit shipment status update
 */
export const emitShipmentUpdate = (shipment: any, orderId: string, buyerId: string) => {
  if (!io) return;
  
  // Notify buyer
  io.to(`buyer:${buyerId}`).emit("shipment:updated", shipment);
  
  // Notify driver
  io.to(`driver:${shipment.driver_id}`).emit("shipment:updated", shipment);
  
  // If driver entered delivery zone, send special alert
  if (shipment.entered_delivery_zone_at) {
    io.to(`buyer:${buyerId}`).emit("driver:nearby", {
      shipment_id: shipment.id,
      order_id: orderId,
      message: "Your driver is nearby!"
    });
  }
  
  console.log(`📢 Shipment update emitted: ${shipment.id}`);
};

/**
 * Emit OTP generated event
 */
export const emitOTPGenerated = (shipment: any, buyerId: string) => {
  if (!io) return;
  
  // Notify buyer with OTP
  io.to(`buyer:${buyerId}`).emit("otp:generated", {
    shipment_id: shipment.id,
    otp: shipment.otp_code,
    message: "Share this OTP with the driver"
  });
  
  console.log(`📢 OTP generated event emitted for shipment: ${shipment.id}`);
};

/**
 * Emit delivery completed event
 */
export const emitDeliveryCompleted = (shipment: any, orderId: string, buyerId: string) => {
  if (!io) return;
  
  // Notify buyer
  io.to(`buyer:${buyerId}`).emit("delivery:completed", {
    shipment_id: shipment.id,
    order_id: orderId,
    message: "Delivery completed successfully!"
  });
  
  // Notify driver
  io.to(`driver:${shipment.driver_id}`).emit("delivery:completed", {
    shipment_id: shipment.id,
    order_id: orderId
  });
  
  console.log(`📢 Delivery completed event emitted: ${shipment.id}`);
};
