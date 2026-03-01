import { body, param, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

/**
 * OWASP: Input validation prevents injection attacks and data corruption
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("❌ Validation failed:", JSON.stringify(errors.array(), null, 2));
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : 'unknown',
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * UUID validation helper
 */
const isValidUUID = (value: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Validation rules for order creation
 */
export const validateCreateOrder = [
  body("buyer_id")
    .trim()
    .notEmpty().withMessage("Buyer ID is required")
    .custom(isValidUUID).withMessage("Invalid buyer ID format"),
  
  body("seller_id")
    .trim()
    .notEmpty().withMessage("Seller ID is required")
    .custom(isValidUUID).withMessage("Invalid seller ID format"),
  
  body("items")
    .isArray({ min: 1 }).withMessage("Items must be a non-empty array")
    .custom((items) => {
      if (items.length > 50) {
        throw new Error("Maximum 50 items per order");
      }
      return true;
    }),
  
  body("items.*.product_id")
    .trim()
    .notEmpty().withMessage("Product ID is required")
    .custom(isValidUUID).withMessage("Invalid product ID format"),
  
  body("items.*.quantity")
    .isInt({ min: 1, max: 1000 }).withMessage("Quantity must be between 1 and 1000"),
  
  body("delivery_lat")
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage("Invalid latitude"),
  
  body("delivery_lng")
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage("Invalid longitude"),
  
  body("delivery_address")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 500 }).withMessage("Delivery address must be less than 500 characters"),
  
  handleValidationErrors
];

/**
 * Validation rules for order confirmation
 */
export const validateConfirmOrder = [
  param("order_id")
    .trim()
    .custom(isValidUUID).withMessage("Invalid order ID format"),
  
  body("driver_id")
    .trim()
    .notEmpty().withMessage("Driver ID is required")
    .custom(isValidUUID).withMessage("Invalid driver ID format"),
  
  body("pickup_lat")
    .isFloat({ min: -90, max: 90 }).withMessage("Invalid pickup latitude"),
  
  body("pickup_lng")
    .isFloat({ min: -180, max: 180 }).withMessage("Invalid pickup longitude"),
  
  body("pickup_address")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("Pickup address must be less than 500 characters"),
  
  body("drop_lat")
    .isFloat({ min: -90, max: 90 }).withMessage("Invalid drop latitude"),
  
  body("drop_lng")
    .isFloat({ min: -180, max: 180 }).withMessage("Invalid drop longitude"),
  
  body("drop_address")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("Drop address must be less than 500 characters"),
  
  handleValidationErrors
];

/**
 * Validation rules for location update
 */
export const validateLocationUpdate = [
  body("shipment_id")
    .trim()
    .notEmpty().withMessage("Shipment ID is required")
    .custom(isValidUUID).withMessage("Invalid shipment ID format"),
  
  body("lat")
    .isFloat({ min: -90, max: 90 }).withMessage("Invalid latitude"),
  
  body("lng")
    .isFloat({ min: -180, max: 180 }).withMessage("Invalid longitude"),
  
  handleValidationErrors
];

/**
 * Validation rules for OTP verification
 */
export const validateOTPVerification = [
  body("shipment_id")
    .trim()
    .notEmpty().withMessage("Shipment ID is required")
    .custom(isValidUUID).withMessage("Invalid shipment ID format"),
  
  body("otp")
    .trim()
    .notEmpty().withMessage("OTP is required")
    .isLength({ min: 4, max: 4 }).withMessage("OTP must be 4 digits")
    .isNumeric().withMessage("OTP must contain only numbers"),
  
  handleValidationErrors
];

/**
 * Validation rules for UUID parameters
 */
export const validateUUIDParam = (paramName: string) => [
  param(paramName)
    .trim()
    .custom(isValidUUID).withMessage(`Invalid ${paramName} format`),
  
  handleValidationErrors
];

/**
 * Sanitize request body to prevent unexpected fields
 * OWASP: Mass assignment prevention
 */
export const sanitizeBody = (allowedFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const sanitized: any = {};
    
    for (const field of allowedFields) {
      if (req.body.hasOwnProperty(field)) {
        sanitized[field] = req.body[field];
      }
    }
    
    req.body = sanitized;
    next();
  };
};
