import helmet from "helmet";
import { Request, Response, NextFunction } from "express";

/**
 * OWASP: Security headers prevent common web vulnerabilities
 * Helmet sets various HTTP headers for security
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: "deny" // Prevent clickjacking
  },
  noSniff: true, // Prevent MIME type sniffing
  xssFilter: true, // Enable XSS filter
});

/**
 * OWASP: CORS configuration prevents unauthorized cross-origin requests
 */
export const configureCORS = (allowedOrigins: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
    
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    
    next();
  };
};

/**
 * Request logging for security monitoring
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.socket.remoteAddress;
  const method = req.method;
  const path = req.path;
  
  console.log(`[${timestamp}] ${method} ${path} - IP: ${ip}`);
  
  // Log suspicious activity
  if (req.path.includes("..") || req.path.includes("<script>")) {
    console.warn(`⚠️ SUSPICIOUS REQUEST from ${ip}: ${path}`);
  }
  
  next();
};

/**
 * Prevent parameter pollution
 * OWASP: HPP (HTTP Parameter Pollution) prevention
 */
export const preventParameterPollution = (req: Request, res: Response, next: NextFunction) => {
  // Ensure query parameters are not arrays (unless expected)
  for (const key in req.query) {
    if (Array.isArray(req.query[key])) {
      req.query[key] = (req.query[key] as string[])[0];
    }
  }
  next();
};

/**
 * Request size limiter to prevent DoS attacks
 */
export const requestSizeLimiter = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.headers["content-length"] || "0");
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      error: "Request payload too large. Maximum size is 10MB."
    });
  }
  
  next();
};
