import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import { supabase } from "../lib/supabase";
import { generateAccessToken, generateRefreshToken } from "../lib/jwt";
import { readLimiter } from "../middleware/rateLimiter";
import { body, validationResult } from "express-validator";

const router = express.Router();

/**
 * Authentication Routes
 * Handles login/register for Buyer, Seller, Driver roles
 */

// Validation middleware
const validateLogin = [
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("role").isIn(["buyer", "seller", "driver", "admin"])
];

const validateRegister = [
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("name").trim().isLength({ min: 2, max: 100 }),
  body("phone").optional({ values: "falsy" }).isMobilePhone("any"),
  body("role").isIn(["buyer", "seller", "driver", "admin"])
];

/* -----------------------------------------------------
   🔐 LOGIN (All Roles)
----------------------------------------------------- */
router.post("/login", readLimiter, validateLogin, async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password, role } = req.body;

  try {
    // Query the appropriate table based on role
    const tableName = role === "buyer" ? "buyers" 
                    : role === "seller" ? "sellers" 
                    : role === "driver" ? "drivers"
                    : "admins";
    
    const { data: user, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Generate JWT tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: role as "buyer" | "seller" | "driver" | "admin"
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: role as "buyer" | "seller" | "driver" | "admin"
    });

    // Return user data with tokens
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: role
      },
      accessToken,
      refreshToken,
      message: "Login successful"
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/* -----------------------------------------------------
   📝 REGISTER (All Roles)
----------------------------------------------------- */
router.post("/register", readLimiter, validateRegister, async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("Validation errors:", errors.array());
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password, name, phone, role } = req.body;

  console.log("Registration attempt:", { email, name, role });

  try {
    // Check if user already exists
    const tableName = role === "buyer" ? "buyers" 
                    : role === "seller" ? "sellers" 
                    : role === "driver" ? "drivers"
                    : "admins";
    
    const { data: existing } = await supabase
      .from(tableName)
      .select("id")
      .eq("email", email)
      .single();

    if (existing) {
      console.log("Email already exists:", email);
      return res.status(400).json({
        success: false,
        message: "Email already registered"
      });
    }

    // Hash password with bcrypt (10 salt rounds)
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Password hashed successfully");

    // Create new user
    const { data: newUser, error } = await supabase
      .from(tableName)
      .insert([{
        name,
        email,
        password: hashedPassword,
        phone: phone || null
      }])
      .select()
      .single();

    if (error) {
      console.error("Registration error:", error);
      return res.status(400).json({
        success: false,
        message: "Registration failed",
        error: error.message
      });
    }

    console.log("User registered successfully:", newUser.id);

    // Generate JWT tokens
    const accessToken = generateAccessToken({
      userId: newUser.id,
      email: newUser.email,
      role: role as "buyer" | "seller" | "driver" | "admin"
    });

    const refreshToken = generateRefreshToken({
      userId: newUser.id,
      email: newUser.email,
      role: role as "buyer" | "seller" | "driver" | "admin"
    });

    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: role
      },
      accessToken,
      refreshToken,
      message: "Registration successful"
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/* -----------------------------------------------------
   👤 GET USER PROFILE
----------------------------------------------------- */
router.get("/profile/:role/:user_id", readLimiter, async (req: Request, res: Response) => {
  const { role, user_id } = req.params;
  
  const roleStr = Array.isArray(role) ? role[0] : role;

  if (!["buyer", "seller", "driver"].includes(roleStr)) {
    return res.status(400).json({ success: false, message: "Invalid role" });
  }

  const tableName = roleStr === "buyer" ? "buyers" : roleStr === "seller" ? "sellers" : "drivers";

  const { data: user, error } = await supabase
    .from(tableName)
    .select("id, name, email, phone, created_at")
    .eq("id", user_id)
    .single();

  if (error || !user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  res.json({
    success: true,
    user: { ...user, role: roleStr }
  });
});

export default router;
