import express, { Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { readLimiter } from "../middleware/rateLimiter";

const router = express.Router();

/**
 * Get all drivers
 * Used by sellers to select a driver when confirming orders
 */
router.get("/", readLimiter, async (req: Request, res: Response) => {
  try {
    const { data: drivers, error } = await supabase
      .from("drivers")
      .select("id, name, email, phone")
      .order("name");

    if (error) {
      console.error("Error fetching drivers:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch drivers"
      });
    }

    res.json(drivers || []);
  } catch (err) {
    console.error("Error fetching drivers:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/**
 * Get an available driver for auto-assignment
 * Returns the first available driver (can be enhanced with load balancing)
 */
router.get("/available", readLimiter, async (req: Request, res: Response) => {
  try {
    // Get all drivers
    const { data: drivers, error: driversError } = await supabase
      .from("drivers")
      .select("id, name, email, phone");

    if (driversError || !drivers || drivers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No drivers available"
      });
    }

    // Get active shipments count for each driver
    const { data: shipments, error: shipmentsError } = await supabase
      .from("shipments")
      .select("driver_id, status")
      .in("status", ["PENDING", "IN_TRANSIT", "DELIVERED"]);

    if (shipmentsError) {
      console.error("Error fetching shipments:", shipmentsError);
    }

    // Count active shipments per driver
    const driverLoad: Record<string, number> = {};
    if (shipments) {
      shipments.forEach((shipment: any) => {
        driverLoad[shipment.driver_id] = (driverLoad[shipment.driver_id] || 0) + 1;
      });
    }

    // Find driver with least load
    let selectedDriver = drivers[0];
    let minLoad = driverLoad[selectedDriver.id] || 0;

    for (const driver of drivers) {
      const load = driverLoad[driver.id] || 0;
      if (load < minLoad) {
        minLoad = load;
        selectedDriver = driver;
      }
    }

    console.log(`🚚 Auto-assigned driver: ${selectedDriver.name} (Load: ${minLoad})`);

    res.json(selectedDriver);
  } catch (err) {
    console.error("Error getting available driver:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/**
 * Get driver by ID
 */
router.get("/:id", readLimiter, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data: driver, error } = await supabase
      .from("drivers")
      .select("id, name, email, phone")
      .eq("id", id)
      .single();

    if (error || !driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    res.json(driver);
  } catch (err) {
    console.error("Error fetching driver:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

export default router;
