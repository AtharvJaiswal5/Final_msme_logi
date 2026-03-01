import rateLimit from "express-rate-limit";

/**
 * OWASP: Rate limiting prevents brute force attacks and API abuse
 * Default: 100 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    const resetTime = (req as any).rateLimit?.resetTime || Date.now() + 900000;
    res.status(429).json({
      success: false,
      error: "Too many requests. Please try again later.",
      retryAfter: Math.ceil(resetTime / 1000)
    });
  }
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on OTP verification
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    error: "Too many authentication attempts, please try again later.",
    retryAfter: "15 minutes"
  },
  handler: (req, res) => {
    console.warn(`⚠️ Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    const resetTime = (req as any).rateLimit?.resetTime || Date.now() + 900000;
    res.status(429).json({
      success: false,
      error: "Too many authentication attempts. Please try again in 15 minutes.",
      retryAfter: Math.ceil(resetTime / 1000)
    });
  }
});

/**
 * Moderate rate limiter for order creation
 * Prevents spam orders
 */
export const orderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 orders per minute
  message: {
    error: "Too many orders created, please slow down.",
    retryAfter: "1 minute"
  },
  handler: (req, res) => {
    const resetTime = (req as any).rateLimit?.resetTime || Date.now() + 60000;
    res.status(429).json({
      success: false,
      error: "You're creating orders too quickly. Please wait a moment.",
      retryAfter: Math.ceil(resetTime / 1000)
    });
  }
});

/**
 * Location update limiter for drivers
 * Prevents excessive location updates
 */
export const locationLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 5, // 5 updates per 10 seconds
  message: {
    error: "Location updates too frequent",
    retryAfter: "10 seconds"
  },
  handler: (req, res) => {
    const resetTime = (req as any).rateLimit?.resetTime || Date.now() + 10000;
    res.status(429).json({
      success: false,
      error: "Please wait before updating location again.",
      retryAfter: Math.ceil(resetTime / 1000)
    });
  }
});

/**
 * Lenient read limiter for GET endpoints
 * Allows frequent reads for real-time dashboards
 * Development: Very high limits to prevent blocking during testing
 */
export const readLimiter = rateLimit({
  windowMs: 15 * 1000, // 15 seconds window
  max: 1000, // 1000 requests per 15 seconds (extremely lenient for dev)
  message: {
    error: "Too many requests",
    retryAfter: "15 seconds"
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  // Skip rate limiting in development if needed
  skip: (req) => {
    // Optionally skip for localhost in development
    return process.env.NODE_ENV === "development" && req.ip === "::1" || req.ip === "::ffff:127.0.0.1" || req.ip === "127.0.0.1";
  }
});
