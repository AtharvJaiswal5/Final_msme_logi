# Backend - MSME Logistics Platform

Node.js + Express backend server with TypeScript, Socket.IO, and Supabase.

## 📁 Folder Structure

```
backend/
├── src/
│   ├── lib/                    # Core utilities
│   │   ├── jwt.ts             # JWT token generation/verification
│   │   ├── socket.ts          # Socket.IO configuration
│   │   └── supabase.ts        # Supabase client setup
│   │
│   ├── middleware/             # Express middleware
│   │   ├── auth.ts            # Authentication middleware
│   │   ├── rateLimiter.ts     # Rate limiting
│   │   ├── security.ts        # Security headers (Helmet)
│   │   └── validation.ts      # Input validation
│   │
│   ├── routes/                 # API route handlers
│   │   ├── authRoutes.ts      # Login/Register
│   │   ├── orderRoutes.ts     # Order management
│   │   ├── productRoutes.ts   # Product CRUD
│   │   ├── shipmentRoutes.ts  # Shipment tracking
│   │   ├── driversRoutes.ts   # Driver management
│   │   ├── analyticsRoutes.ts # Admin analytics
│   │   ├── impersonationRoutes.ts  # Admin impersonation
│   │   └── notificationRoutes.ts   # Notifications
│   │
│   ├── scripts/                # Utility scripts
│   │   ├── hashExistingPasswords.ts
│   │   └── createAdminHash.ts
│   │
│   └── server.ts               # Main server entry point
│
├── database-migrations/        # SQL migration files
│   ├── CREATE_ADMIN_TABLE.sql
│   ├── CREATE_NOTIFICATIONS_TABLE.sql
│   ├── ADD_DELIVERY_ADDRESS_COLUMN.sql
│   ├── ADD_SHIPMENT_ADDRESS_COLUMNS.sql
│   ├── ADD_OTP_VERIFIED_AT_COLUMN.sql
│   └── FIX_ADMIN_RLS.sql
│
├── docs/                       # Documentation
│   ├── SECURITY.md
│   ├── DATABASE_MIGRATION.md
│   └── ADMIN_SETUP_INSTRUCTIONS.md
│
├── .env.example                # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key

# JWT (IMPORTANT: Use strong secret in production!)
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Server
PORT=5000
NODE_ENV=development

# Security
ALLOWED_ORIGINS=http://localhost:5173
```

### 3. Database Setup
Run all SQL files in `database-migrations/` folder in Supabase SQL Editor in this order:
1. `CREATE_ADMIN_TABLE.sql`
2. `CREATE_NOTIFICATIONS_TABLE.sql`
3. `ADD_DELIVERY_ADDRESS_COLUMN.sql`
4. `ADD_SHIPMENT_ADDRESS_COLUMNS.sql`
5. `ADD_OTP_VERIFIED_AT_COLUMN.sql`
6. `FIX_ADMIN_RLS.sql` (if needed)

### 4. Start Server
```bash
# Development
npx ts-node src/server.ts

# Production
npm start
```

Server will run on `http://localhost:5000`

## 📡 API Routes

### Authentication (`/auth`)
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Orders (`/orders`)
- `GET /orders` - Get all orders
- `POST /orders` - Create new order
- `PATCH /orders/:id/confirm` - Confirm order

### Products (`/products`)
- `GET /products` - List all products
- `POST /products` - Create product
- `PATCH /products/:id` - Update product
- `DELETE /products/:id` - Delete product

### Shipments (`/shipments`)
- `GET /shipments` - Get shipments
- `POST /shipments` - Create shipment
- `PATCH /shipments/:id/location` - Update driver location
- `POST /shipments/:id/verify-otp` - Verify delivery OTP

### Drivers (`/drivers`)
- `GET /drivers` - List all drivers
- `GET /drivers/:id` - Get driver details

### Analytics (`/analytics`) - Admin Only
- `GET /analytics/overview` - Dashboard statistics
- `GET /analytics/orders-timeline?period=week` - Orders over time
- `GET /analytics/top-products?limit=10` - Top selling products
- `GET /analytics/order-status` - Order status distribution
- `GET /analytics/users-by-role` - User counts by role
- `GET /analytics/revenue-timeline?period=month` - Revenue tracking

### Impersonation (`/impersonation`) - Admin Only
- `POST /impersonation/start` - Start impersonating user
- `POST /impersonation/end` - End impersonation session
- `GET /impersonation/users/:role` - Get users list (seller/driver)
- `POST /impersonation/log-action` - Log admin action

### Notifications (`/notifications`)
- `GET /notifications/:userId/:role` - Get user notifications
- `PATCH /notifications/:id/read` - Mark notification as read
- `PATCH /notifications/mark-all-read/:userId/:role` - Mark all as read
- `DELETE /notifications/:id` - Delete notification

## 🔌 WebSocket Events

### Server → Client
- `order:created` - New order notification
- `order:confirmed` - Order confirmed
- `shipment:created` - New shipment assigned
- `driver:location` - Driver location update
- `shipment:completed` - Delivery completed

### Client → Server
- `driver:update-location` - Driver sends location update
- `join:room` - Join role-specific room

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: Bcrypt with 10 salt rounds
- **Rate Limiting**: Route-specific limits
- **CORS**: Configured allowed origins
- **Helmet**: Security HTTP headers
- **Input Validation**: Express-validator
- **RLS**: Row Level Security in Supabase

## 🗄️ Database Tables

- `buyers` - Buyer user accounts
- `sellers` - Seller user accounts
- `drivers` - Driver user accounts
- `admins` - Admin user accounts
- `products` - Product catalog
- `orders` - Customer orders
- `order_items` - Order line items
- `shipments` - Delivery shipments
- `notifications` - User notifications

## 🛠️ Utility Scripts

### Generate Admin Password Hash
```bash
npx ts-node src/scripts/createAdminHash.ts
```

### Hash Existing Passwords
```bash
npx ts-node src/scripts/hashExistingPasswords.ts
```

## 📊 Rate Limits

- **Read Operations**: 100 requests/15 minutes
- **Write Operations**: Varies by route
- **Authentication**: 5 requests/15 minutes

## 🐛 Debugging

Enable debug logs:
```bash
DEBUG=* npx ts-node src/server.ts
```

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_ANON_KEY` | Supabase anon key | Required |
| `JWT_SECRET` | Secret for JWT signing | Required |
| `JWT_EXPIRES_IN` | Access token expiry | 7d |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | 30d |
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `ALLOWED_ORIGINS` | CORS origins | localhost:5173 |

## 🚀 Production Deployment

1. Set strong `JWT_SECRET`
2. Update `ALLOWED_ORIGINS`
3. Set `NODE_ENV=production`
4. Use process manager (PM2)
5. Enable HTTPS
6. Set up monitoring

```bash
# Using PM2
pm2 start src/server.ts --name msme-backend
pm2 save
pm2 startup
```

## 📚 Documentation

See `/docs` folder for detailed documentation:
- `SECURITY.md` - Security implementation details
- `DATABASE_MIGRATION.md` - Database setup guide
- `ADMIN_SETUP_INSTRUCTIONS.md` - Admin portal setup

## 🤝 Contributing

1. Follow TypeScript best practices
2. Add input validation for new routes
3. Update API documentation
4. Test thoroughly before committing

## 📄 License

[Your License]
