# QueueLess — Smart Live Queue Management System

A real-world full-stack web application where customers can join business queues digitally and track their live queue position, while administrators manage customers, service counters, and queues in real time.

---

## 📌 Problem Statement

Physical waiting lines in clinics, dining establishments, government offices, and retail customer service desks waste millions of human hours every day. Traditional paper-ticket queue systems suffer from:
- **Zero mobility**: Customers are tethered to crowded waiting rooms to watch a numbered screen or listen for loudspeaker announcements.
- **Uncertainty & Frustration**: Patrons have no accurate insight into estimated wait times or staff capacity.
- **Congestion & Friction**: Facilities struggle with overcrowded lobbies, high walk-out/abandonment rates, and inefficient manual counter management.

**QueueLess** solves this by providing a contactless, mobile-friendly virtual queue operating system with instant guest access (no mobile app download required) and real-time operational control desks for venue staff.

---

## 🚀 Features Completed (Phases 1 & 2)

### ✅ Phase 1: Foundation, Infrastructure & Design System
- **Modern Dark SaaS UI**: High-contrast, clean layout featuring deep navy/slate palettes (`#090D16`), subtle gradients, and glassmorphic elevation.
- **Responsive Navigation & Landing Page**:
  - Hero section with live ticket showcase simulation.
  - Core engine capabilities (zero-polling WebSocket design, QR check-in, intelligent wait time estimation, multi-counter dispatch).
  - 3-step guest workflow ("Scan & Join", "Live Tracking", "Instant Summon").
  - Target industry verticals showcase (Healthcare, Dining, Banking, Retail, Public Services).
- **Reusable Component Library**: Modally accessible, composable UI primitives in `client/src/components/ui/` (`Button`, `Card`, `Badge`, `Input`).
- **Client-Side Routing**: Built using React Router DOM v7 with dedicated routes for guest queues, authentication, and the admin portal.
- **Backend Infrastructure**: Express server configured with ES modules, CORS, Socket.IO real-time server instance, and `/api/health` system diagnostics.

### ✅ Phase 2: Database Architecture & Authentication
- **Multi-Tenant MongoDB Models**:
  - `Business`: Stores venue profiles with unique, auto-generated slug identifiers (e.g., `QL-CLINIC-7A89F0`) and industry categorization.
  - `User`: Handles role-based accounts (`admin`, `staff`) with mandatory association to a verified `Business`.
- **Security & Password Protection**:
  - Secure password hashing using `bcryptjs` (10 salt rounds) with pre-save hooks.
  - Credential isolation: password hashes are excluded from queries (`select: false`) and sanitized in `toJSON()`.
- **JWT Authentication API**:
  - `POST /api/auth/register`: Atomic registration of a new organization and its initial administrator account.
  - `POST /api/auth/login`: Credential verification against bcrypt hashes with role validation and token generation.
  - `GET /api/auth/me`: Authenticated session retrieval with populated business details.
- **Middleware Protection**:
  - `authenticate`: Validates Bearer JWTs, checks token expiration, and loads the user entity.
  - `authorize`: Enforces role-based permissions (`admin` vs. `staff`).
  - `verifyBusinessOwnership`: Rejects cross-tenant access attempts.
- **Frontend Auth Integration**:
  - `AuthContext`: Centralized React state providing persistent authentication via `localStorage`, session verification, and `logout()` handling.
  - `ProtectedRoute`: React route guard with loading state, automatic login redirect with return-URL preservation, and role validation.
  - User-friendly error messaging for duplicate emails, invalid credentials, and session expiries.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite 8, React Router DOM 7 |
| **Styling** | Tailwind CSS v4, Lucide React Icons |
| **Backend** | Node.js (v18+), Express 5 (ES Modules) |
| **Database** | MongoDB, Mongoose 9 (Atlas, Local, or Embedded In-Memory fallback) |
| **Real-Time Layer** | Socket.IO 4 |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` |
| **HTTP Client** | Axios (configured with base URL proxy and token interceptors) |

---

## 📁 Project Architecture & Directory Structure

```text
queueless/
├── client/                     # Frontend React + Vite application
│   ├── public/                 # Static assets & favicons
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/           # Route guards (ProtectedRoute)
│   │   │   ├── layout/         # Header/Navbar, Footer
│   │   │   └── ui/             # Reusable UI primitives (Button, Card, Badge, Input)
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Global auth provider (user, token, session restoration)
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx       # SaaS landing page & value proposition
│   │   │   ├── LoginPage.jsx         # Admin & Staff sign-in portal
│   │   │   ├── RegisterPage.jsx      # Organization & Admin registration
│   │   │   ├── CustomerQueuePage.jsx # Guest live ticket tracking & lookup
│   │   │   ├── AdminDashboardPage.jsx# Protected admin console & engine telemetry
│   │   │   └── NotFoundPage.jsx      # 404 fallback page
│   │   ├── services/
│   │   │   ├── api.js          # Axios client with proxy & Bearer token interceptor
│   │   │   └── socket.js       # Socket.IO client instance
│   │   ├── App.jsx             # React Router route registry
│   │   ├── index.css           # Tailwind v4 configuration & theme tokens
│   │   └── main.jsx            # Application mount point
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js          # Tailwind v4 plugin + API reverse proxy setup
│
├── server/                     # Backend Node.js + Express API & Socket.IO
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js           # Multi-mode MongoDB connection manager
│   │   ├── controllers/
│   │   │   ├── authController.js   # register, login, getMe handlers
│   │   │   └── healthController.js # System status & diagnostics
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js # authenticate, authorize, verifyBusinessOwnership
│   │   │   └── errorHandler.js   # Global 404 & error handlers
│   │   ├── models/
│   │   │   ├── Business.js     # Multi-tenant business schema
│   │   │   └── User.js         # User schema with bcrypt password hashing
│   │   ├── routes/
│   │   │   ├── authRoutes.js   # Authentication routes
│   │   │   └── healthRoutes.js # Health-check router
│   │   ├── utils/
│   │   │   └── token.js        # JWT issuance and token validation
│   │   └── index.js            # Express server, Socket.IO & CORS configuration
│   ├── test_e2e_auth.js        # Automated Phase 2 end-to-end verification suite
│   ├── .env.example            # Environment template with placeholders
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore                  # Git ignore rules for secrets, builds, and dependencies
├── package.json                # Root workspace scripts orchestrator
├── package-lock.json
└── README.md
```

---

## ⚙️ Installation & Environment Setup

### 1. Clone & Prerequisites
- **Node.js**: v18.0.0 or higher (v24.x tested)
- **npm**: v9.0.0 or higher
- **MongoDB**: Optional (Connect to MongoDB Atlas or local MongoDB; if unavailable, an embedded in-memory MongoDB server runs automatically during development).

```bash
git clone https://github.com/your-username/queueless.git
cd queueless
```

### 2. Environment Variables Configuration

Copy `.env.example` in `server/` to `.env`:
```bash
cp server/.env.example server/.env
```

Configure your parameters in `server/.env`:
```env
# Server Port
PORT=5000

# Environment Mode
NODE_ENV=development

# Allowed Frontend Client Origin
CLIENT_URL=http://localhost:5173

# Database Connection (Supports MongoDB Atlas URI or local MongoDB)
MONGODB_URI=mongodb://localhost:27017/queueless

# Secret Key for JWT Signing (Replace with a strong random string in production)
JWT_SECRET=your_jwt_secret_key_here

# JWT Token Expiration Window
JWT_EXPIRES_IN=7d
```

### 3. Install Dependencies

You can install dependencies for both client and server:

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

---

## 🏃 Startup Commands

### Run Services Concurrently

#### Terminal 1 — Backend Server:
```bash
cd server
npm run dev
```
*API running on [http://localhost:5000](http://localhost:5000)*  
*Health Check: [http://localhost:5000/api/health](http://localhost:5000/api/health)*

#### Terminal 2 — Frontend Client:
```bash
cd client
npm run dev
```
*Web application available at [http://localhost:5173](http://localhost:5173)*

*(Alternatively, run from root: `npm run dev:server` and `npm run dev:client`)*

---

## 📡 Authentication API Documentation

### 1. Register Business & Admin
- **Route**: `POST /api/auth/register`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "businessName": "Apex Health Clinic",
    "adminName": "Dr. Sarah Connor",
    "email": "sarah@apexhealth.org",
    "password": "SecurePassword123!",
    "industry": "healthcare"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "status": "success",
    "message": "Business and administrator account registered successfully.",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "672c...",
      "name": "Dr. Sarah Connor",
      "email": "sarah@apexhealth.org",
      "role": "admin",
      "business": {
        "id": "672c...",
        "name": "Apex Health Clinic",
        "businessId": "QL-APEXH-4A82F1",
        "industry": "healthcare"
      }
    }
  }
  ```

### 2. Login User
- **Route**: `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "sarah@apexhealth.org",
    "password": "SecurePassword123!",
    "role": "admin"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "message": "Authentication successful.",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "672c...",
      "name": "Dr. Sarah Connor",
      "email": "sarah@apexhealth.org",
      "role": "admin",
      "business": {
        "id": "672c...",
        "name": "Apex Health Clinic",
        "businessId": "QL-APEXH-4A82F1",
        "industry": "healthcare"
      }
    }
  }
  ```

### 3. Get Current Authenticated Session
- **Route**: `GET /api/auth/me`
- **Access**: Private (Requires header: `Authorization: Bearer <token>`)
- **Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "user": {
      "id": "672c...",
      "name": "Dr. Sarah Connor",
      "email": "sarah@apexhealth.org",
      "role": "admin",
      "business": {
        "id": "672c...",
        "name": "Apex Health Clinic",
        "businessId": "QL-APEXH-4A82F1",
        "industry": "healthcare"
      }
    }
  }
  ```

---

## 🧪 Testing Instructions

An automated end-to-end verification suite is included to validate database operations, password encryption, route protection, and proxy forwarding.

To run the verification suite:
```bash
cd server
node test_e2e_auth.js
```

**Verifies:**
- Atomic business creation and unique `QL-*` slug assignment.
- Proper `bcrypt` password hashing (password hashes never returned in responses).
- Rejection of duplicate email registrations (`400 Bad Request`).
- Rejection of invalid credentials (`401 Unauthorized`).
- Successful login and JWT issuance (`200 OK`).
- Authenticated profile retrieval through `/api/auth/me` with valid JWT (`200 OK`).
- Rejection of forged, expired, or missing tokens (`401 Unauthorized`).
- Client reverse-proxy communication through Vite development port (`:5173/api/*` forwarding to `:5000/api/*`).

---

## 🗺️ Future Roadmap

- **Phase 3: Live Queue & Counter Management**
  - Create and configure multiple service queues per business.
  - Define custom service desks / counters with individual staff assignments.
  - Generate dynamic QR codes for in-person contactless check-in.
  - Implement customer ticket issuance (`Ticket` model with queue reference, position index, and status lifecycle).
- **Phase 4: Real-Time Socket.IO Synchronization**
  - Room-based WebSocket architecture (`queue_<id>` and `business_<id>`).
  - Real-time customer place-in-line updates without page refresh.
  - Audio chimes and browser notifications when a patron's ticket is called.
  - Counter staff dispatch controls ("Call Next", "Recall", "Mark No-Show", "Complete").
- **Phase 5: Smart Wait Times & Operations Analytics**
  - Dynamic algorithmic wait time estimation based on rolling average service durations.
  - Executive throughput dashboard (peak hours, customer drop-off rates, staff efficiency).
  - Optional SMS / WhatsApp integration for customer paging.
