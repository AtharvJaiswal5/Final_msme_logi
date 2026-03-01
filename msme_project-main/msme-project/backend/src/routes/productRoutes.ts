import express, { Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { readLimiter } from "../middleware/rateLimiter";

const router = express.Router();


// 🛒 GET ALL PRODUCTS (Buyer View)
// Security: Lenient rate limit for frequent catalog browsing
router.get("/", readLimiter, async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(400).send(error);
  }

  res.send(data);
});


// ➕ CREATE PRODUCT (Seller)
router.post("/", async (req: Request, res: Response) => {

  console.log("Incoming Product Body:", req.body); // 🔍 DEBUG LINE

  const seller_id = req.body.seller_id;
  const name = req.body.name;
  const price = req.body.price;
  const stock_quantity = req.body.stock_quantity;

  // 🔐 Hard validation
  if (
    seller_id === undefined ||
    name === undefined ||
    price === undefined ||
    stock_quantity === undefined
  ) {
    return res.status(400).send({
      message: "seller_id, name, price, stock_quantity are required",
      received: req.body
    });
  }

  const { data, error } = await supabase
    .from("products")
    .insert([
      {
        seller_id,
        name,
        price,
        stock_quantity
      }
    ])
    .select()
    .single();

  if (error) {
    console.error("Supabase Insert Error:", error);
    return res.status(400).send(error);
  }

  res.send(data);
});

// 📝 UPDATE PRODUCT (Seller)
router.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, price, stock_quantity } = req.body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (price !== undefined) updateData.price = price;
  if (stock_quantity !== undefined) updateData.stock_quantity = stock_quantity;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      success: false,
      message: "No fields to update"
    });
  }

  const { data, error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Product update error:", error);
    return res.status(400).json({
      success: false,
      message: "Failed to update product",
      error: error.message
    });
  }

  res.json({
    success: true,
    product: data
  });
});

// 🗑️ DELETE PRODUCT (Seller)
router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Product delete error:", error);
    return res.status(400).json({
      success: false,
      message: "Failed to delete product",
      error: error.message
    });
  }

  res.json({
    success: true,
    message: "Product deleted successfully"
  });
});

export default router;