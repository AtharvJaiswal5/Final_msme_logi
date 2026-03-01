# 🔒 Security Implementation Guide

## Overview
This document outlines the security measures implemented in the MSME Logistics Platform backend, following OWASP best practices.

## ✅ Implemented Security Features

### 1. **Rate Limiting**
Prevents API abuse and brute force attacks.

**General API Rate Limit:**
- 100 requests per 15 minutes per IP
- Applies to all endpoints globally
- Returns 429 status with retry-after header

**Authentication Rate Limit (OTP Verification):**
- 5 attempts per 15 minutes
- Prevents brute force attacks on OTP
- Skips counting successful requests

**Order Creation Rate Limit:**
- 10 orders per minute
- Prevents spam orders

**Location Update Rate Limit:**
- 5 updates per 10 seconds
- Prevents excessive location tracking

### 2. **Input Validation & Sanitization**

**Validation Rules:**
- UUID format validation for all IDs
- Latitude: -90 to 90
- Longitude: -180 to 180
- Quantity: 1 to 1000
- OTP: 4-6 numeric digits
- Maximum 50 items per order

**Sanitization:**
- Removes unexpected fields from requests
- Prevents mass assignment vulnerabilities
- Type checking on all inputs

### 3. **Secure API Key Handling**

**Environment Variables:**
- Supabase URL and keys moved to `.env`
- No hardcoded credentials in code
- `.env` added to `.gitignore`
- `.env.example` provided for setup

**Key Rotation:**
- Keys can be rotated by updating `.env`
- No code changes required

### 4. **Security Headers (Helmet)**

**Implemented Headers:**
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options (Clickjacking protection)
- X-Content-Type-Options (MIME sniffing protection)
- X-XSS-Protection

### 5. **CORS Configuration**

**Features:**
- Whitelist-based origin validation
- Configurable via environment variables
- Credentials support
- Preflight request handling

### 6. **Request Security**

**Protections:**
- Request size limiting (10MB max)
- Parameter pollution prevention
- Security logging for monitoring
- Suspicious request detection

### 7. **Error Handling**

**Features:**
- Graceful error responses
- No sensitive data in error messages
- Different messages for dev/production
- Structured error format

## 📋 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Server Configuration
PORT=5000
NODE_ENV=development

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Production Recommendations

1. **Set NODE_ENV=production**
   - Hides detailed error messages
   - Enables production optimizations

2. **Use HTTPS**
   - Required for HSTS to work
   - Protects data in transit

3. **Rotate Keys Regularly**
   - Update Supabase keys monthly
   - Use different keys for dev/prod

4. **Monitor Rate Limits**
   - Adjust based on traffic patterns
   - Set up alerts for excessive 429s

5. **Enable Database RLS**
   - Row Level Security on all tables
   - Restrict access by role

## 🚨 Security Endpoints

### Rate Limit Response (429)
```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "retryAfter": 1234567890
}
```

### Validation Error (400)
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "buyer_id",
      "message": "Invalid buyer ID format"
    }
  ]
}
```

## 🔍 Security Monitoring

**Logged Events:**
- All requests (timestamp, IP, method, path)
- Rate limit violations
- Suspicious requests (path traversal, XSS attempts)
- Validation failures

**Log Format:**
```
[2026-02-24T00:00:00.000Z] GET /orders - IP: 127.0.0.1
⚠️ SUSPICIOUS REQUEST from 127.0.0.1: /orders/../admin
⚠️ Rate limit exceeded for IP: 127.0.0.1 on /shipments/verify-otp
```

## 🛡️ OWASP Top 10 Coverage

1. **Injection** ✅ - Input validation, parameterized queries
2. **Broken Authentication** ✅ - Rate limiting, OTP validation
3. **Sensitive Data Exposure** ✅ - Environment variables, no hardcoded keys
4. **XML External Entities** ✅ - JSON only, no XML parsing
5. **Broken Access Control** ✅ - Database RLS policies
6. **Security Misconfiguration** ✅ - Security headers, CORS
7. **XSS** ✅ - Input sanitization, CSP headers
8. **Insecure Deserialization** ✅ - JSON validation
9. **Using Components with Known Vulnerabilities** ✅ - Regular npm audit
10. **Insufficient Logging & Monitoring** ✅ - Security logging

## 📝 Testing Security

### Test Rate Limiting
```bash
# Send 101 requests quickly
for i in {1..101}; do curl http://localhost:5000/orders; done
# Should return 429 after 100 requests
```

### Test Input Validation
```bash
# Invalid UUID
curl -X POST http://localhost:5000/orders \
  -H "Content-Type: application/json" \
  -d '{"buyer_id":"invalid","seller_id":"test","items":[]}'
# Should return 400 with validation error
```

### Test CORS
```bash
# Request from unauthorized origin
curl -H "Origin: http://evil.com" http://localhost:5000/orders
# Should not include Access-Control-Allow-Origin header
```

## 🔄 Maintenance

### Regular Tasks
- [ ] Review logs weekly for suspicious activity
- [ ] Update dependencies monthly (`npm audit fix`)
- [ ] Rotate API keys quarterly
- [ ] Review rate limits based on usage
- [ ] Test security measures after updates

### Security Checklist
- [ ] `.env` file not committed to git
- [ ] All endpoints have rate limiting
- [ ] All inputs are validated
- [ ] Error messages don't leak sensitive data
- [ ] HTTPS enabled in production
- [ ] Database RLS policies active
- [ ] Security headers configured
- [ ] Logging and monitoring active

## 📞 Security Contacts

For security issues, please contact:
- Email: security@yourcompany.com
- Report vulnerabilities privately

## 📚 References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Express Rate Limit](https://github.com/express-rate-limit/express-rate-limit)
