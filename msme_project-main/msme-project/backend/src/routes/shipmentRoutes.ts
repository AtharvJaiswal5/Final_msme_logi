import express, { Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { emitShipmentUpdate, emitOTPGenerated, emitDeliveryCompleted } from "../lib/socket";
import { validateLocationUpdate, validateOTPVerification, validateUUIDParam } from "../middleware/validation";
import { locationLimiter, authLimiter, readLimiter } from "../middleware/rateLimiter";

const router = express.Router();
/* -----------------------------------------------------
   🚚 GET ALL SHIPMENTS (For Buyer Tracking)
----------------------------------------------------- */
router.get("/", readLimiter, async (_req: Request, res: Response) => {

  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(400).send(error);
  }

  res.send(data);
});

/* -----------------------------------------------------
   🚚 DRIVER: Get assigned shipments
   Security: UUID validation, lenient rate limit for dashboard
----------------------------------------------------- */
router.get(
  "/driver/:driver_id",
  readLimiter, // Lenient rate limit for frequent dashboard reads
  validateUUIDParam("driver_id"),
  async (req: Request, res: Response) => {
  const { driver_id } = req.params;

  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .eq("driver_id", driver_id)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).send(error);
  res.send(data);
});

/* -----------------------------------------------------
   📍 DRIVER: Update live location + auto OTP + GEOFENCING
   Security: Rate limited, input validated
----------------------------------------------------- */
router.patch(
  "/location",
  locationLimiter, // Prevent excessive location updates
  validateLocationUpdate,
  async (req: Request, res: Response) => {
  const { shipment_id, lat, lng } = req.body;

  if (!shipment_id || lat == null || lng == null) {
    return res.status(400).json({
      message: "shipment_id, lat, lng required"
    });
  }

  /* --------------------------------------------------
     1️⃣ Fetch shipment FIRST (for validation)
  -------------------------------------------------- */
  const { data: shipment, error: fetchError } = await supabase
    .from("shipments")
    .select("*")
    .eq("id", shipment_id)
    .single() as any;

  if (fetchError || !shipment) {
    return res.status(400).send(fetchError);
  }

  // 🔒 Block if already completed
  if (shipment.status === "COMPLETED") {
    return res.status(400).json({
      message: "Shipment already completed"
    });
  }

  /* --------------------------------------------------
     2️⃣ GEOFENCING: Check if driver is near delivery zone
  -------------------------------------------------- */
  const DELIVERY_ZONE_RADIUS = 0.005; // ~500 meters (0.005 degrees ≈ 500m)
  let isInDeliveryZone = false;
  let distanceToDelivery = null;

  if (shipment.drop_lat !== null && shipment.drop_lng !== null) {
    // Calculate distance using Haversine formula approximation
    const latDiff = Math.abs(shipment.drop_lat - lat);
    const lngDiff = Math.abs(shipment.drop_lng - lng);
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
    
    distanceToDelivery = distance;
    isInDeliveryZone = distance < DELIVERY_ZONE_RADIUS;

    // 🚨 First time entering delivery zone
    if (isInDeliveryZone && !shipment.entered_delivery_zone_at) {
      await supabase
        .from("shipments")
        .update({
          entered_delivery_zone_at: new Date().toISOString()
        })
        .eq("id", shipment_id);

      console.log("🚨 DRIVER ENTERED DELIVERY ZONE:", {
        shipment_id,
        distance: (distance * 111).toFixed(0) + "km",
        zone_id: shipment.geofence_zone_id
      });
    }
  }

  /* --------------------------------------------------
     3️⃣ Update live location
  -------------------------------------------------- */
  await supabase
    .from("shipments")
    .update({
      current_lat: lat,
      current_lng: lng
    })
    .eq("id", shipment_id);

  console.log("📍 LOCATION UPDATE:", {
    shipment_id,
    lat,
    lng,
    pickup: [shipment.pickup_lat, shipment.pickup_lng],
    drop: [shipment.drop_lat, shipment.drop_lng],
    current_status: shipment.status,
    in_delivery_zone: isInDeliveryZone
  });

  let newStatus = shipment.status;

  /* --------------------------------------------------
     4️⃣ Geofencing logic
  -------------------------------------------------- */

  // 🏭 AT PICKUP
  if (
    shipment.pickup_lat !== null &&
    shipment.pickup_lng !== null &&
    Math.abs(shipment.pickup_lat - lat) < 0.02 &&
    Math.abs(shipment.pickup_lng - lng) < 0.02
  ) {
    newStatus = "AT_PICKUP";
  }

  // 🚚 IN TRANSIT
  if (
    shipment.status === "AT_PICKUP" &&
    (
      Math.abs(shipment.pickup_lat - lat) > 0.03 ||
      Math.abs(shipment.pickup_lng - lng) > 0.03
    )
  ) {
    newStatus = "IN_TRANSIT";
  }

  // 📦 DELIVERED (force-safe)
  if (
    shipment.drop_lat !== null &&
    shipment.drop_lng !== null &&
    Math.abs(shipment.drop_lat - lat) < 0.03 &&
    Math.abs(shipment.drop_lng - lng) < 0.03
  ) {
    newStatus = "DELIVERED";
  }

  console.log("🧠 STATUS DEBUG:", {
    old_status: shipment.status,
    computed_new_status: newStatus
  });

  /* --------------------------------------------------
     5️⃣ OTP RECOVERY MODE (idempotent)
  -------------------------------------------------- */
  if (
    shipment.status === "DELIVERED" &&
    (!shipment.otp_code || shipment.otp_code === "")
  ) {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    await supabase
      .from("shipments")
      .update({ otp_code: otp })
      .eq("id", shipment_id);

    console.log("🔥 OTP AUTO GENERATED (RECOVERY MODE):", otp);
  }

  /* --------------------------------------------------
     6️⃣ Status change handler + OTP generation
  -------------------------------------------------- */
  if (newStatus !== shipment.status) {

    const updatePayload: any = { status: newStatus };

    // 🔐 Auto OTP on delivery
    if (newStatus === "DELIVERED") {
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      updatePayload.otp_code = otp;

      console.log("🔥 OTP AUTO GENERATED:", otp);
    }

    await supabase
      .from("shipments")
      .update(updatePayload)
      .eq("id", shipment_id);

    // 🔄 Sync order status
    const orderStatusMap: Record<string, string> = {
      AT_PICKUP: "READY_FOR_PICKUP",
      IN_TRANSIT: "DISPATCHED",
      DELIVERED: "OUT_FOR_DELIVERY"
    };

    if (orderStatusMap[newStatus]) {
      await supabase
        .from("orders")
        .update({ status: orderStatusMap[newStatus] })
        .eq("id", shipment.order_id);
    }
  }

  // Fetch order to get buyer_id for Socket.IO
  const { data: order } = await supabase
    .from("orders")
    .select("buyer_id")
    .eq("id", shipment.order_id)
    .single();

  // Emit real-time shipment update
  if (order) {
    const updatedShipment = {
      ...shipment,
      status: newStatus,
      current_lat: lat,
      current_lng: lng,
      entered_delivery_zone_at: isInDeliveryZone && !shipment.entered_delivery_zone_at 
        ? new Date().toISOString() 
        : shipment.entered_delivery_zone_at
    };
    
    emitShipmentUpdate(updatedShipment, shipment.order_id, order.buyer_id);
    
    // If OTP was generated, emit OTP event
    if (newStatus === "DELIVERED" && newStatus !== shipment.status) {
      // Fetch updated shipment with OTP
      const { data: shipmentWithOTP } = await supabase
        .from("shipments")
        .select("otp_code")
        .eq("id", shipment_id)
        .single();
      
      if (shipmentWithOTP?.otp_code) {
        emitOTPGenerated({ ...updatedShipment, otp_code: shipmentWithOTP.otp_code }, order.buyer_id);
      }
    }
  }

  res.send({
    shipment_id,
    status: newStatus,
    geofencing: {
      in_delivery_zone: isInDeliveryZone,
      distance_to_delivery: distanceToDelivery ? (distanceToDelivery * 111).toFixed(2) + " km" : null,
      zone_id: shipment.geofence_zone_id
    }
  });
});

/* -----------------------------------------------------
   🔐 VERIFY OTP → COMPLETE DELIVERY
   Security: Rate limited (brute force protection), input validated
----------------------------------------------------- */
router.post(
  "/verify-otp",
  authLimiter, // Strict rate limit for OTP verification
  validateOTPVerification,
  async (req: Request, res: Response) => {
  const { shipment_id, otp } = req.body;

  if (!shipment_id || !otp) {
    return res.status(400).json({
      message: "shipment_id and otp required"
    });
  }

  const { data: shipment, error } = await supabase
    .from("shipments")
    .select("*")
    .eq("id", shipment_id)
    .single() as any;

  if (error || !shipment) return res.status(400).send(error);

  if (shipment.otp_verified) {
    return res.status(400).json({
      message: "OTP already verified"
    });
  }

  if (shipment.otp_code !== otp) {
    return res.status(400).json({
      message: "Invalid OTP"
    });
  }

  await supabase
    .from("shipments")
    .update({
      status: "COMPLETED",
      otp_verified: true,
      otp_verified_at: new Date().toISOString()
    })
    .eq("id", shipment_id);

  await supabase
    .from("orders")
    .update({
      status: "COMPLETED"
    })
    .eq("id", shipment.order_id);

  // Fetch order to get buyer_id
  const { data: order } = await supabase
    .from("orders")
    .select("buyer_id")
    .eq("id", shipment.order_id)
    .single();

  // Emit real-time delivery completed event
  if (order) {
    emitDeliveryCompleted(
      { ...shipment, status: "COMPLETED", otp_verified: true },
      shipment.order_id,
      order.buyer_id
    );
  }

  res.send({
    message: "Shipment & Order completed successfully"
  });
});

/* -----------------------------------------------------
   📦 DRIVER: Manually mark shipment as DELIVERED
   Security: Rate limited, UUID validated
----------------------------------------------------- */
router.patch(
  "/:shipment_id/status",
  authLimiter,
  validateUUIDParam("shipment_id"),
  async (req: Request, res: Response) => {
    const { shipment_id } = req.params;
    const { status } = req.body;

    if (status !== "DELIVERED") {
      return res.status(400).json({
        message: "Only DELIVERED status is allowed"
      });
    }

    // Fetch shipment
    const { data: shipment, error: fetchError } = await supabase
      .from("shipments")
      .select("*")
      .eq("id", shipment_id)
      .single() as any;

    if (fetchError || !shipment) {
      return res.status(400).send(fetchError);
    }

    // Generate OTP (4 digits)
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Update shipment
    await supabase
      .from("shipments")
      .update({
        status: "DELIVERED",
        otp_code: otp
      })
      .eq("id", shipment_id);

    // Update order status
    await supabase
      .from("orders")
      .update({ status: "OUT_FOR_DELIVERY" })
      .eq("id", shipment.order_id);

    // Fetch order to get buyer_id
    const { data: order } = await supabase
      .from("orders")
      .select("buyer_id")
      .eq("id", shipment.order_id)
      .single();

    // Emit real-time updates
    if (order) {
      const updatedShipment = {
        ...shipment,
        status: "DELIVERED",
        otp_code: otp
      };
      
      emitShipmentUpdate(updatedShipment, shipment.order_id, order.buyer_id);
      emitOTPGenerated(updatedShipment, order.buyer_id);
    }

    res.send({
      message: "Marked as delivered. OTP generated.",
      otp
    });
  }
);

export default router;