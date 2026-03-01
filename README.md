# 🚚 MSME Logistics Platform

A complete end-to-end logistics and delivery management system for MSMEs (Micro, Small, and Medium Enterprises).

## 🎯 Features

- **Multi-Role System**: Buyer, Seller, Driver, and Admin portals
- **Real-Time Tracking**: Live driver location updates with WebSocket
- **Order Management**: Complete order lifecycle from creation to delivery
- **Admin Analytics**: Interactive dashboards with business insights
- **Admin Impersonation**: Support feature to view and manage user accounts
- **Notification System**: Real-time notifications for all users
- **Secure Authentication**: JWT-based auth with role-based access control

## 🏗️ Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Socket.IO Client
- Recharts (Analytics)
- React Router

### Backend
- Node.js + Express
- TypeScript
- Socket.IO (WebSocket)
- Supabase (PostgreSQL)
- JWT Authentication
- Bcrypt Password Hashing

## 📁 Project Structure

```
msme_project-main/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── api/             # API client functions
│   │   ├── components/      # Reusable React components
│   │   ├── context/         # React Context (Auth)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Page components (Buyer, Seller, Driver, Admin)
│   │   └── styles/          # CSS stylesheets
│   └── package.json
│
├── msme-project/backend/    # Node.js backend server
│   ├── src/
│   │   ├── lib/             # Utilities (JWT, Socket, Supabase)
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API route handlers
│   │   └── scripts/         # Utility scripts
│   ├── database-migrations/ # SQL migration files
│   ├── docs/                # Backend documentation
│   └── package.json
│
└── docs/                    # Project documentation
    ├── PROJECT_REVIEW_AND_CHECKLIST.md
    ├── ADMIN_PORTAL_READY.md
    ├── IMPERSONATION_FEATURE.md
    └── IMPROVEMENTS_COMPLETED.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd msme_project-main
```

### 2. Backend Setup
```bash
cd msme-project/backend
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your Supabase credentials and JWT secret
# IMPORTANT: Set a strong JWT_SECRET!
```

### 3. Database Setup
Run all SQL files in `database-migrations/` folder in your Supabase SQL Editor:
1. `CREATE_ADMIN_TABLE.sql`
2. `CREATE_NOTIFICATIONS_TABLE.sql`
3. Other migration files as needed

### 4. Start Backend
```bash
npx ts-node src/server.ts
# Server runs on http://localhost:5000
```

### 5. Frontend Setup
```bash
cd ../../frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

## 👥 User Roles

### 🛒 Buyer
- Browse products
- Place orders with delivery address
- Track order status in real-time
- View order history

### 🏭 Seller
- Manage product inventory
- Confirm pending orders
- Assign drivers to shipments
- Track driver locations on live map
- View sales analytics

### 🚚 Driver
- View assigned deliveries
- Update location in real-time
- Complete deliveries with OTP verification
- View delivery history and statistics

### 👑 Admin
- View comprehensive analytics dashboard
- Impersonate sellers and drivers for support
- Monitor system-wide metrics
- Track revenue and user statistics

## 🔐 Default Admin Credentials

```
Email: admin@msme.com
Password: admin123
```

**⚠️ IMPORTANT: Change this password in production!**

## 📚 Documentation

Detailed documentation available in `/docs` folder:
- [Complete Project Review & Deployment Checklist](docs/PROJECT_REVIEW_AND_CHECKLIST.md)
- [Admin Portal Setup Guide](docs/ADMIN_PORTAL_READY.md)
- [Impersonation Feature Documentation](docs/IMPERSONATION_FEATURE.md)
- [Completed Improvements Log](docs/IMPROVEMENTS_COMPLETED.md)

## 🔒 Security Features

- JWT authentication with refresh tokens
- Password hashing with bcrypt (10 salt rounds)
- Row Level Security (RLS) in Supabase
- Rate limiting on all routes
- CORS configuration
- Helmet.js security headers
- Input validation with express-validator
- SQL injection prevention

## 🌐 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Orders
- `GET /orders` - Get orders
- `POST /orders` - Create order
- `PATCH /orders/:id/confirm` - Confirm order

### Products
- `GET /products` - List products
- `POST /products` - Create product
- `PATCH /products/:id` - Update product
- `DELETE /products/:id` - Delete product

### Shipments
- `GET /shipments` - Get shipments
- `POST /shipments` - Create shipment
- `PATCH /shipments/:id/location` - Update location
- `POST /shipments/:id/verify-otp` - Verify OTP

### Analytics (Admin)
- `GET /analytics/overview` - Dashboard stats
- `GET /analytics/orders-timeline` - Orders over time
- `GET /analytics/top-products` - Best sellers
- `GET /analytics/revenue-timeline` - Revenue tracking

### Impersonation (Admin)
- `POST /impersonation/start` - Start impersonating
- `POST /impersonation/end` - End impersonation
- `GET /impersonation/users/:role` - Get users list

### Notifications
- `GET /notifications/:userId/:role` - Get notifications
- `PATCH /notifications/:id/read` - Mark as read
- `DELETE /notifications/:id` - Delete notification

## 🎨 Theme

The platform uses a consistent light orange theme:
- Primary: `#FF9F1C`
- Secondary: `#FFB84D`
- Background: `#FFF8F0` / `#FFF3E6`

## 📱 Features Highlights

### Real-Time Updates
- Live driver location tracking
- Instant order status updates
- WebSocket-based notifications

### Admin Impersonation
- View any seller/driver portal
- Perform actions on their behalf
- Automatic notification logging
- Easy exit back to admin dashboard

### Notification System
- Bell icon with unread count
- Dropdown notification center
- Mark as read/delete options
- Auto-refresh every 30 seconds

### Analytics Dashboard
- Interactive charts (Recharts)
- Multiple time periods (daily/weekly/monthly/yearly)
- Revenue tracking
- Top products analysis
- User distribution

## 🐛 Known Limitations

- No email verification
- No password reset functionality
- No payment gateway integration
- No order cancellation feature

## 🚀 Deployment

See [PROJECT_REVIEW_AND_CHECKLIST.md](docs/PROJECT_REVIEW_AND_CHECKLIST.md) for complete deployment instructions.

### Quick Deploy Checklist
1. Set strong `JWT_SECRET` in production
2. Update `ALLOWED_ORIGINS` for your domain
3. Run all database migrations
4. Change default admin password
5. Enable HTTPS
6. Set up monitoring and logging

## 📄 License

[Your License Here]

## 👨‍💻 Author

[Your Name]

## 🙏 Acknowledgments

Built with modern web technologies and best practices for MSME logistics management.

---

**Status**: ✅ Production Ready

For detailed setup and deployment instructions, see the [documentation](docs/).
