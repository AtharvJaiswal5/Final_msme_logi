import express, { Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { readLimiter } from "../middleware/rateLimiter";

const router = express.Router();

/* -----------------------------------------------------
   📬 GET USER NOTIFICATIONS
----------------------------------------------------- */
router.get("/:userId/:role", readLimiter, async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.params;
    const { limit = 20, unreadOnly = false } = req.query;

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("user_role", role)
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (unreadOnly === "true") {
      query = query.eq("is_read", false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      notifications: notifications || []
    });
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications"
    });
  }
});

/* -----------------------------------------------------
   ✅ MARK NOTIFICATION AS READ
----------------------------------------------------- */
router.patch("/:notificationId/read", readLimiter, async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: "Notification marked as read"
    });
  } catch (err) {
    console.error("Mark notification read error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read"
    });
  }
});

/* -----------------------------------------------------
   ✅ MARK ALL NOTIFICATIONS AS READ
----------------------------------------------------- */
router.patch("/mark-all-read/:userId/:role", readLimiter, async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.params;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("user_role", role)
      .eq("is_read", false);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: "All notifications marked as read"
    });
  } catch (err) {
    console.error("Mark all read error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to mark all as read"
    });
  }
});

/* -----------------------------------------------------
   🗑️ DELETE NOTIFICATION
----------------------------------------------------- */
router.delete("/:notificationId", readLimiter, async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: "Notification deleted"
    });
  } catch (err) {
    console.error("Delete notification error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification"
    });
  }
});

export default router;
