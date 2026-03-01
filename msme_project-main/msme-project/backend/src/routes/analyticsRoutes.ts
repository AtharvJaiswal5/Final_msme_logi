import express, { Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { readLimiter } from "../middleware/rateLimiter";

const router = express.Router();

/* -----------------------------------------------------
   📊 DASHBOARD OVERVIEW STATS
----------------------------------------------------- */
router.get("/overview", readLimiter, async (req: Request, res: Response) => {
  try {
    // Get counts from separate tables
    const [orders, buyers, sellers, drivers, products, shipments] = await Promise.all([
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("buyers").select("*", { count: "exact", head: true }),
      supabase.from("sellers").select("*", { count: "exact", head: true }),
      supabase.from("drivers").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("shipments").select("*", { count: "exact", head: true })
    ]);

    const totalUsers = (buyers.count || 0) + (sellers.count || 0) + (drivers.count || 0);

    // Get today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayOrders } = await supabase
      .from("orders")
      .select("*")
      .gte("created_at", today.toISOString());

    // Get completed orders
    const { data: completedOrders } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "COMPLETED");

    // Calculate total revenue (from completed orders)
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("price_at_purchase, quantity, order_id")
      .in("order_id", completedOrders?.map(o => o.id) || []);

    const totalRevenue = orderItems?.reduce((sum, item) => 
      sum + (item.price_at_purchase * item.quantity), 0) || 0;

    res.json({
      totalOrders: orders.count || 0,
      totalUsers,
      totalBuyers: buyers.count || 0,
      totalSellers: sellers.count || 0,
      totalDrivers: drivers.count || 0,
      totalProducts: products.count || 0,
      totalShipments: shipments.count || 0,
      todayOrders: todayOrders?.length || 0,
      completedOrders: completedOrders?.length || 0,
      totalRevenue
    });
  } catch (err) {
    console.error("Analytics overview error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

/* -----------------------------------------------------
   📈 ORDERS OVER TIME
----------------------------------------------------- */
router.get("/orders-timeline", readLimiter, async (req: Request, res: Response) => {
  try {
    const { period = "week" } = req.query; // day, week, month, year
    
    const { data: orders } = await supabase
      .from("orders")
      .select("created_at, status")
      .order("created_at", { ascending: true });

    // Group by date
    const grouped: Record<string, number> = {};
    
    orders?.forEach(order => {
      const date = new Date(order.created_at);
      let key: string;
      
      if (period === "day") {
        key = date.toISOString().split("T")[0]; // YYYY-MM-DD
      } else if (period === "week") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else if (period === "month") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else {
        key = String(date.getFullYear());
      }
      
      grouped[key] = (grouped[key] || 0) + 1;
    });

    const timeline = Object.entries(grouped).map(([date, count]) => ({
      date,
      count
    }));

    res.json(timeline);
  } catch (err) {
    console.error("Orders timeline error:", err);
    res.status(500).json({ error: "Failed to fetch timeline" });
  }
});

/* -----------------------------------------------------
   🏆 TOP SELLING PRODUCTS
----------------------------------------------------- */
router.get("/top-products", readLimiter, async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("product_id, quantity, products(name, price)");

    // Group by product
    const productSales: Record<string, any> = {};
    
    orderItems?.forEach(item => {
      const productId = item.product_id;
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      if (!productSales[productId]) {
        productSales[productId] = {
          product_id: productId,
          name: product?.name || "Unknown",
          price: product?.price || 0,
          totalQuantity: 0,
          totalRevenue: 0
        };
      }
      productSales[productId].totalQuantity += item.quantity;
      productSales[productId].totalRevenue += item.quantity * (product?.price || 0);
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, Number(limit));

    res.json(topProducts);
  } catch (err) {
    console.error("Top products error:", err);
    res.status(500).json({ error: "Failed to fetch top products" });
  }
});

/* -----------------------------------------------------
   📊 ORDER STATUS DISTRIBUTION
----------------------------------------------------- */
router.get("/order-status", readLimiter, async (req: Request, res: Response) => {
  try {
    const { data: orders } = await supabase
      .from("orders")
      .select("status");

    const statusCount: Record<string, number> = {};
    
    orders?.forEach(order => {
      statusCount[order.status] = (statusCount[order.status] || 0) + 1;
    });

    const distribution = Object.entries(statusCount).map(([status, count]) => ({
      status,
      count
    }));

    res.json(distribution);
  } catch (err) {
    console.error("Order status error:", err);
    res.status(500).json({ error: "Failed to fetch order status" });
  }
});

/* -----------------------------------------------------
   👥 USER STATISTICS BY ROLE
----------------------------------------------------- */
router.get("/users-by-role", readLimiter, async (req: Request, res: Response) => {
  try {
    const [buyers, sellers, drivers] = await Promise.all([
      supabase.from("buyers").select("*", { count: "exact", head: true }),
      supabase.from("sellers").select("*", { count: "exact", head: true }),
      supabase.from("drivers").select("*", { count: "exact", head: true })
    ]);

    const distribution = [
      { role: "Buyers", count: buyers.count || 0 },
      { role: "Sellers", count: sellers.count || 0 },
      { role: "Drivers", count: drivers.count || 0 }
    ];

    res.json(distribution);
  } catch (err) {
    console.error("Users by role error:", err);
    res.status(500).json({ error: "Failed to fetch user statistics" });
  }
});

/* -----------------------------------------------------
   💰 REVENUE OVER TIME
----------------------------------------------------- */
router.get("/revenue-timeline", readLimiter, async (req: Request, res: Response) => {
  try {
    const { period = "month" } = req.query;
    
    const { data: completedOrders } = await supabase
      .from("orders")
      .select("id, created_at")
      .eq("status", "COMPLETED");

    const { data: orderItems } = await supabase
      .from("order_items")
      .select("order_id, price_at_purchase, quantity, orders(created_at)")
      .in("order_id", completedOrders?.map(o => o.id) || []);

    // Group by date
    const grouped: Record<string, number> = {};
    
    orderItems?.forEach(item => {
      const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
      const date = new Date(order?.created_at);
      let key: string;
      
      if (period === "day") {
        key = date.toISOString().split("T")[0];
      } else if (period === "month") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else {
        key = String(date.getFullYear());
      }
      
      const revenue = item.price_at_purchase * item.quantity;
      grouped[key] = (grouped[key] || 0) + revenue;
    });

    const timeline = Object.entries(grouped).map(([date, revenue]) => ({
      date,
      revenue
    }));

    res.json(timeline);
  } catch (err) {
    console.error("Revenue timeline error:", err);
    res.status(500).json({ error: "Failed to fetch revenue timeline" });
  }
});

export default router;
