# 📁 Project Structure - MSME Logistics Platform

## Clean & Organized Structure ✨

```
msme_project-main/
│
├── 📄 README.md                          # Main project documentation
│
├── 📁 docs/                              # All project documentation
│   ├── PROJECT_REVIEW_AND_CHECKLIST.md  # Complete review & deployment guide
│   ├── PROJECT_STRUCTURE.md             # This file
│   ├── ADMIN_PORTAL_READY.md            # Admin setup guide
│   ├── IMPERSONATION_FEATURE.md         # Impersonation feature docs
│   └── IMPROVEMENTS_COMPLETED.md        # Change log
│
├── 📁 frontend/                          # React Frontend Application
│   ├── 📁 src/
│   │   ├── 📁 api/                      # API client functions
│   │   │   └── api.ts
│   │   │
│   │   ├── 📁 components/               # Reusable React components
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── ImpersonationBanner.tsx
│   │   │   ├── LiveMap.tsx
│   │   │   ├── Loading.tsx
│   │   │   ├── NotificationBell.tsx
│   │   │   ├── OrderCard.tsx
│   │   │   ├── OrderHistory.tsx
│   │   │   ├── OrderTimeline.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── Toast.tsx
│   │   │
│   │   ├── 📁 context/                  # React Context
│   │   │   └── AuthContext.tsx          # Authentication state
│   │   │
│   │   ├── 📁 hooks/                    # Custom React hooks
│   │   │   ├── useGeolocation.ts        # Location tracking
│   │   │   ├── useSocket.ts             # WebSocket connection
│   │   │   └── useToast.ts              # Toast notifications
│   │   │
│   │   ├── 📁 pages/                    # Page components
│   │   │   ├── Admin.tsx                # Admin dashboard
│   │   │   ├── BuyerNew.tsx             # Buyer portal
│   │   │   ├── Driver.tsx               # Driver portal
│   │   │   ├── Landing.tsx              # Landing page
│   │   │   ├── Login.tsx                # Login page
│   │   │   ├── Register.tsx             # Registration page
│   │   │   └── Seller.tsx               # Seller portal
│   │   │
│   │   ├── 📁 styles/                   # CSS stylesheets
│   │   │   ├── Admin.css
│   │   │   ├── Auth.css
│   │   │   ├── Buyer.css
│   │   │   ├── Dashboard.css
│   │   │   ├── Driver.css
│   │   │   ├── ImpersonationBanner.css
│   │   │   ├── Landing.css
│   │   │   ├── LiveMap.css
│   │   │   ├── NotificationBell.css
│   │   │   ├── OrderHistory.css
│   │   │   ├── Seller.css
│   │   │   ├── Toast.css
│   │   │   ├── colors.css
│   │   │   ├── design-system.css
│   │   │   └── theme.css
│   │   │
│   │   ├── App.tsx                      # Main App component
│   │   ├── App.css
│   │   ├── main.tsx                     # Entry point
│   │   └── index.css
│   │
│   ├── 📁 public/                       # Static assets
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── README.md
│
└── 📁 msme-project/backend/             # Node.js Backend Server
    ├── 📁 src/
    │   ├── 📁 lib/                      # Core utilities
    │   │   ├── jwt.ts                   # JWT token handling
    │   │   ├── socket.ts                # Socket.IO setup
    │   │   └── supabase.ts              # Supabase client
    │   │
    │   ├── 📁 middleware/               # Express middleware
    │   │   ├── auth.ts                  # Authentication
    │   │   ├── rateLimiter.ts           # Rate limiting
    │   │   ├── security.ts              # Security headers
    │   │   └── validation.ts            # Input validation
    │   │
    │   ├── 📁 routes/                   # API route handlers
    │   │   ├── analyticsRoutes.ts       # Admin analytics
    │   │   ├── authRoutes.ts            # Login/Register
    │   │   ├── driversRoutes.ts         # Driver management
    │   │   ├── impersonationRoutes.ts   # Admin impersonation
    │   │   ├── notificationRoutes.ts    # Notifications
    │   │   ├── orderItemRoutes.ts       # Order items
    │   │   ├── orderRoutes.ts           # Order management
    │   │   ├── productRoutes.ts         # Product CRUD
    │   │   └── shipmentRoutes.ts        # Shipment tracking
    │   │
    │   ├── 📁 scripts/                  # Utility scripts
    │   │   ├── createAdminHash.ts       # Generate admin password
    │   │   └── hashExistingPasswords.ts # Hash passwords
    │   │
    │   └── server.ts                    # Main server entry
    │
    ├── 📁 database-migrations/          # SQL migration files
    │   ├── CREATE_ADMIN_TABLE.sql
    │   ├── CREATE_NOTIFICATIONS_TABLE.sql
    │   ├── ADD_DELIVERY_ADDRESS_COLUMN.sql
    │   ├── ADD_SHIPMENT_ADDRESS_COLUMNS.sql
    │   ├── ADD_OTP_VERIFIED_AT_COLUMN.sql
    │   ├── ADD_PHONE_COLUMN.sql
    │   ├── ADD_ADDRESS_COLUMNS.sql
    │   ├── ADD_ADMIN_ROLE.sql
    │   ├── ADD_TEST_PASSWORDS.sql
    │   ├── CHECK_USERS.sql
    │   ├── DISABLE_RLS_FOR_AUTH.sql
    │   ├── FIX_ADMIN_RLS.sql
    │   ├── FIX_DRIVERS_TABLE.sql
    │   └── RLS_POLICIES_FOR_AUTH.sql
    │
    ├── 📁 docs/                         # Backend documentation
    │   ├── ADMIN_SETUP_INSTRUCTIONS.md
    │   ├── DATABASE_MIGRATION.md
    │   └── SECURITY.md
    │
    ├── .env.example                     # Environment template
    ├── .gitignore
    ├── package.json
    ├── tsconfig.json
    └── README.md
```

## 📊 File Count Summary

### Frontend
- **Components**: 14 files
- **Pages**: 7 files
- **Styles**: 15 CSS files
- **Hooks**: 3 custom hooks
- **Context**: 1 (Auth)
- **API**: 1 client file

### Backend
- **Routes**: 9 API route files
- **Middleware**: 4 files
- **Lib**: 3 utility files
- **Scripts**: 2 utility scripts
- **Migrations**: 15 SQL files
- **Docs**: 3 documentation files

### Documentation
- **Root Docs**: 5 markdown files
- **Backend Docs**: 3 markdown files
- **Total**: 8 documentation files

## 🎯 Key Folders Explained

### `/docs` (Root)
All project-level documentation including setup guides, feature documentation, and deployment checklists.

### `/frontend/src/components`
Reusable React components used across different pages. Includes layout components, UI elements, and feature-specific components.

### `/frontend/src/pages`
Main page components for each user role (Buyer, Seller, Driver, Admin) plus authentication pages.

### `/backend/src/routes`
API endpoint handlers organized by feature. Each file handles a specific domain (orders, products, analytics, etc.).

### `/backend/database-migrations`
All SQL migration files for database schema changes. Run these in Supabase SQL Editor in order.

### `/backend/docs`
Backend-specific documentation including security implementation, database setup, and admin configuration.

## 🔄 Data Flow

```
Frontend (React)
    ↓
API Client (api.ts)
    ↓
Backend Routes (Express)
    ↓
Middleware (Auth, Validation)
    ↓
Supabase (PostgreSQL)
```

## 🔌 Real-Time Flow

```
Frontend Component
    ↓
useSocket Hook
    ↓
Socket.IO Client
    ↓
Backend Socket Server
    ↓
Broadcast to Rooms
    ↓
All Connected Clients
```

## 📦 Dependencies

### Frontend Key Packages
- `react` - UI library
- `react-router-dom` - Routing
- `socket.io-client` - WebSocket
- `recharts` - Charts for analytics

### Backend Key Packages
- `express` - Web framework
- `socket.io` - WebSocket server
- `@supabase/supabase-js` - Database client
- `jsonwebtoken` - JWT auth
- `bcrypt` - Password hashing
- `helmet` - Security headers
- `express-validator` - Input validation

## 🎨 Styling Approach

- **No CSS Framework**: Custom CSS for full control
- **CSS Variables**: Defined in `theme.css` and `colors.css`
- **Component-Scoped**: Each component has its own CSS file
- **Consistent Theme**: Light orange (#FF9F1C) throughout
- **Responsive**: Mobile-first approach

## 🔐 Security Layers

1. **Authentication**: JWT tokens with refresh mechanism
2. **Authorization**: Role-based access control
3. **Database**: Row Level Security (RLS) in Supabase
4. **Input**: Validation on all endpoints
5. **Rate Limiting**: Prevent abuse
6. **Headers**: Helmet.js security headers
7. **CORS**: Configured allowed origins

## 🚀 Deployment Structure

### Development
```
localhost:5173 (Frontend - Vite)
localhost:5000 (Backend - Express)
Supabase Cloud (Database)
```

### Production
```
your-domain.com (Frontend - Static hosting)
api.your-domain.com (Backend - Node.js server)
Supabase Cloud (Database)
```

## 📝 Naming Conventions

### Files
- **Components**: PascalCase (e.g., `NotificationBell.tsx`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useSocket.ts`)
- **Routes**: camelCase with 'Routes' suffix (e.g., `orderRoutes.ts`)
- **Styles**: kebab-case or PascalCase matching component

### Code
- **Variables**: camelCase
- **Functions**: camelCase
- **Components**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase

## 🎯 Best Practices Followed

✅ TypeScript for type safety
✅ Modular component architecture
✅ Separation of concerns
✅ Error boundaries for error handling
✅ Custom hooks for reusable logic
✅ Context API for global state
✅ Environment variables for configuration
✅ Comprehensive documentation
✅ Security-first approach
✅ Clean folder structure

## 📚 Quick Navigation

- **Start Here**: `/README.md`
- **Setup Guide**: `/docs/PROJECT_REVIEW_AND_CHECKLIST.md`
- **Admin Setup**: `/docs/ADMIN_PORTAL_READY.md`
- **Features**: `/docs/IMPERSONATION_FEATURE.md`
- **Backend API**: `/msme-project/backend/README.md`
- **Database**: `/msme-project/backend/database-migrations/`
- **Security**: `/msme-project/backend/docs/SECURITY.md`

---

**Last Updated**: March 1, 2026
**Status**: ✅ Production Ready
**Structure**: ✨ Clean & Organized
