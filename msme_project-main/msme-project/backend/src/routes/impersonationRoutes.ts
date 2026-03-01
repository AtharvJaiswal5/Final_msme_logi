import express, { Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { generateAccessToken } from "../lib/jwt";
import { readLimiter } from "../middleware/rateLimiter";

const router = express.Router();

/* -----------------------------------------------------
   👤 IMPERSONATE USER (Admin Only)
----------------------------------------------------- */
router.post("/start", readLimiter, async (req: Request, res: Response) => {
  try {
    const { adminId, targetUserId, targetRole } = req.body;

    // Validate role (only seller and driver allowed)
    if (!["seller", "driver"].includes(targetRole)) {
      return res.status(400).json({
        success: false,
        message: "Can only impersonate sellers and drivers"
      });
    }

    // Verify admin exists
    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("*")
      .eq("id", adminId)
      .single();

    if (adminError || !admin) {
      return res.status(403).json({
        success: false,
        message: "Admin not found"
      });
    }

    // Get target user
    const tableName = targetRole === "seller" ? "sellers" : "drivers";
    const { data: targetUser, error: targetError } = await supabase
      .from(tableName)
      .select("*")
      .eq("id", targetUserId)
      .single();

    if (targetError || !targetUser) {
      return res.status(404).json({
        success: false,
        message: `${targetRole} not found`
      });
    }

    // Generate impersonation token
    const impersonationToken = generateAccessToken({
      userId: targetUser.id,
      email: targetUser.email,
      role: targetRole as "seller" | "driver" | "buyer" | "admin"
    });

    // Log impersonation start
    await supabase.from("notifications").insert({
      user_id: targetUserId,
      user_role: targetRole,
      message: `Admin (${admin.name}) started viewing your account`,
      type: "admin_action",
      metadata: {
        admin_id: adminId,
        admin_name: admin.name,
        action: "impersonation_start"
      }
    });

    res.json({
      success: true,
      impersonationToken,
      targetUser: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        phone: targetUser.phone,
        role: targetRole
      },
      adminInfo: {
        id: admin.id,
        name: admin.name
      }
    });
  } catch (err) {
    console.error("Impersonation start error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to start impersonation"
    });
  }
});

/* -----------------------------------------------------
   🔚 END IMPERSONATION
----------------------------------------------------- */
router.post("/end", readLimiter, async (req: Request, res: Response) => {
  try {
    const { adminId, targetUserId, targetRole } = req.body;

    // Log impersonation end
    const { data: admin } = await supabase
      .from("admins")
      .select("name")
      .eq("id", adminId)
      .single();

    await supabase.from("notifications").insert({
      user_id: targetUserId,
      user_role: targetRole,
      message: `Admin (${admin?.name || "Unknown"}) stopped viewing your account`,
      type: "admin_action",
      metadata: {
        admin_id: adminId,
        admin_name: admin?.name,
        action: "impersonation_end"
      }
    });

    res.json({
      success: true,
      message: "Impersonation ended"
    });
  } catch (err) {
    console.error("Impersonation end error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to end impersonation"
    });
  }
});

/* -----------------------------------------------------
   📝 LOG ADMIN ACTION (During Impersonation)
----------------------------------------------------- */
router.post("/log-action", readLimiter, async (req: Request, res: Response) => {
  try {
    const { adminId, adminName, targetUserId, targetRole, action, details } = req.body;

    await supabase.from("notifications").insert({
      user_id: targetUserId,
      user_role: targetRole,
      message: `Admin (${adminName}) ${action}`,
      type: "admin_action",
      metadata: {
        admin_id: adminId,
        admin_name: adminName,
        action,
        details
      }
    });

    res.json({
      success: true,
      message: "Action logged"
    });
  } catch (err) {
    console.error("Action logging error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to log action"
    });
  }
});

/* -----------------------------------------------------
   📋 GET USERS LIST (For Impersonation Selection)
----------------------------------------------------- */
router.get("/users/:role", readLimiter, async (req: Request, res: Response) => {
  try {
    const { role } = req.params;

    if (!["seller", "driver"].includes(role as string)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role"
      });
    }

    const tableName = role === "seller" ? "sellers" : "drivers";
    const { data: users, error } = await supabase
      .from(tableName)
      .select("id, name, email, phone")
      .order("name");

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      users: users || []
    });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users"
    });
  }
});

export default router;
