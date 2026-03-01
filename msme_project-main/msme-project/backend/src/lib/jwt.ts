import jwt, { SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d";

export interface JWTPayload {
  userId: string;
  email: string;
  role: "buyer" | "seller" | "driver" | "admin";
}

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(payload: JWTPayload): string {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as any,
    issuer: "msme-logistics"
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken(payload: JWTPayload): string {
  const options: SignOptions = {
    expiresIn: JWT_REFRESH_EXPIRES_IN as any,
    issuer: "msme-logistics"
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: "msme-logistics"
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}
