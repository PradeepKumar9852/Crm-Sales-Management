# CRM Sales Management System — Production Backend API

A production-grade, enterprise-ready RESTful backend built with **Node.js**, **Express.js**, and **MongoDB (Mongoose)** for managing the end-to-end B2B sales lifecycle:
**Lead Generation → Lead Qualification → Customer Conversion → Deal Pipeline Management → Deal Closure → Activity Tracking & Audit History**.

---

## 📑 Table of Contents
1. [Project Overview](#-1-project-overview)
2. [Technologies Used](#-2-technologies-used)
3. [Architecture & Folder Structure](#-3-architecture--folder-structure)
4. [User Roles & Permissions (RBAC)](#-4-user-roles--permissions-rbac)
5. [Enterprise Business Rules](#-5-enterprise-business-rules)
6. [Database Design & Indexing Decisions](#-6-database-design--indexing-decisions)
7. [Installation & Setup](#-7-installation--setup)
8. [Environment Variables](#-8-environment-variables)
9. [How to Run the Server & Tests](#-9-how-to-run-the-server--tests)
10. [API Documentation & Postman Collection](#-10-api-documentation-swagger--postman)
11. [Sample API Requests & Responses](#-11-sample-api-requests--responses)
12. [Assumptions Made](#-12-assumptions-made)
13. [Deployment Information](#-13-deployment-information)

---

##  1. Project Overview

This backend manages the end-to-end sales pipeline of an enterprise CRM:
- **Lead Management**: Lead scoring, multi-filter search, assignment to sales executives, qualification workflow, and atomic conversion to Customer & Deal.
- **Customer Management**: Unified client profiles retaining original lead reference and linked deals.
- **Deal / Sales Pipeline**: 6-stage sales pipeline (`Qualification`, `Discovery`, `Proposal`, `Negotiation`, `Won`, `Lost`), automated probability and expected revenue, and stage-gate validation rules.
- **Sales Activities & Follow-ups**: Calls, Emails, Meetings, Demos, Follow-ups, Reminders, and Notes with automatic overdue status detection.
- **Timeline & Audit Trail**: Dedicated audit log recording entity lifecycle events with before/after state diffs.
- **Sales Analytics & KPIs**: Real-time pipeline summaries, win rates, won revenues, and team-level performance breakdowns for sales managers.

---

## 🛠 2. Technologies Used

- **Runtime & Web Framework**: Node.js (v18+), Express.js (v5)
- **Database & ODM**: MongoDB Atlas, Mongoose (v9)
- **Authentication**: JSON Web Token (`jsonwebtoken`), Cookie-Parser (`cookie-parser`)
- **Security & Passwords**: `bcrypt` (10 salt rounds), `helmet`, `cors`, `express-rate-limit`
- **Data Validation**: `zod` schema validator
- **Architecture**: MVC Pattern (Controllers, Services, Models, Routes, Middlewares, Validators, Utils)

---

##  3. Architecture & Folder Structure

```text
crm-sales-management/
├── .env                              # Active configuration
├── .env.example                      # Production template
├── app.js                            # Express app configuration & middlewares
├── crm_postman_collection.json       # Ready-to-import Postman Collection v2.1
├── package.json                      # Project dependencies & scripts
├── README.md                         # Project documentation
├── test_crm.js                       # Automated E2E integration test suite
└── src/
    ├── config/
    │   └── db.js                     # MongoDB connection with retry & graceful shutdown
    ├── constants/
    │   └── roles.js                  # Roles, stages, sources, and timeline enums
    ├── controllers/
    │   ├── activity.controller.js    # Follow-ups & activity logging
    │   ├── auth.controller.js        # Register, login, profile, password
    │   ├── customer.controller.js    # Customer client profiles
    │   ├── dashboard.controller.js   # Analytics, KPIs, team performance
    │   ├── deal.controller.js        # Deals & sales pipeline
    │   ├── lead.controller.js        # Leads CRUD, assignment, conversion
    │   ├── timeline.controller.js    # Audit history queries
    │   └── user.controller.js        # Admin user management
    ├── middlewares/
    │   ├── auth.middleware.js        # JWT verification & RBAC authorization
    │   ├── error.middleware.js       # Centralized error handler & 404 handler
    │   ├── rateLimiter.middleware.js # API & sensitive auth rate limiters
    │   └── validate.middleware.js    # Zod schema validation middleware
    ├── models/
    │   ├── Activity.js               # Calls, meetings, demos, follow-ups
    │   ├── Customer.js               # Converted customer profiles
    │   ├── Deal.js                   # Pipeline deals, revenue calculations
    │   ├── Lead.js                   # Sales leads and qualification state
    │   ├── Timeline.js               # System audit log & history
    │   └── User.js                   # User accounts & bcrypt password hashing
    ├── routes/
    │   ├── activity.routes.js        # /api/v1/activities
    │   ├── auth.routes.js            # /api/v1/auth
    │   ├── customer.routes.js        # /api/v1/customers
    │   ├── dashboard.routes.js       # /api/v1/dashboard
    │   ├── deal.routes.js            # /api/v1/deals
    │   ├── index.js                  # Master router aggregator
    │   ├── lead.routes.js            # /api/v1/leads
    │   ├── timeline.routes.js        # /api/v1/timeline
    │   └── user.routes.js            # /api/v1/users
    ├── services/
    │   ├── activity.service.js       # Overdue detection & activity logic
    │   ├── auth.service.js           # Auth & token generation
    │   ├── customer.service.js       # Customer database queries
    │   ├── dashboard.service.js      # Pipeline analytics & team performance
    │   ├── deal.service.js           # Deal stage business rules & revenue calculations
    │   ├── lead.service.js           # Lead assignment & safe conversion logic
    │   ├── timeline.service.js       # Audit event recorder
    │   └── user.service.js           # User CRUD & activation logic
    ├── utils/
    │   ├── apiResponse.js            # Standardized { success, message, data, meta }
    │   ├── appError.js               # Operational error class with HTTP status codes
    │   ├── asyncHandler.js           # Async route wrapper
    │   └── jwt.js                    # JWT signing & verification
    └── validators/
        ├── activity.validator.js
        ├── auth.validator.js
        ├── deal.validator.js
        └── lead.validator.js
```

---

##  4. User Roles & Permissions (RBAC)

The system enforces strict Role-Based Access Control:

| Role | Permissions & Access Scope |
| :--- | :--- |
| **`admin`** | Full access to all modules: create/update/activate/deactivate users, view all leads/customers/deals/activities, reassign leads, view all sales reports. |
| **`sales_manager`** | Full visibility into team leads, customers, and deals; assign/reassign leads to sales executives; view team-level sales performance; monitor overdue activities. |
| **`sales_executive`** | Scoped access: can only view and manage leads, customers, and deals assigned to them or created by them; log activities; convert qualified leads. |

---

## ⚡ 5. Enterprise Business Rules

The backend strictly enforces the business rules specified in the assignment:

1. **Lead Assignment Inactive User Protection**:
   - A lead can only be assigned to a user who exists and whose account is active (`isActive: true`). Assigning to an inactive user returns HTTP 400.
2. **Lead Qualification Gate for Conversion**:
   - Only leads in `Qualified` (or `Won`) status can be converted into a Customer and Deal. Attempting to convert a `New` or `Unqualified` lead returns HTTP 400.
3. **Single Conversion Rule**:
   - Once a lead is converted (`isConverted: true`), it cannot be converted again.
4. **Deal Closure Protection (Won / Lost Immutability)**:
   - A closed `Won` or `Lost` deal cannot be moved back to an active pipeline stage (`Qualification`, `Discovery`, `Proposal`, `Negotiation`).
5. **Mandatory Lost Reason**:
   - If a deal is moved to the `Lost` stage, a non-empty `lostReason` string is mandatory. Requests missing `lostReason` return HTTP 400.
6. **Expected Revenue Calculation**:
   - Expected revenue is automatically computed on the backend as: `dealValue * (probability / 100)` and rounded.
7. **Dynamic Overdue Activity Detection**:
   - If an activity has status `Pending` and its `dueDate` has passed the current timestamp, it is automatically marked and reported as `Overdue`.

---

## 🗄 6. Database Design & Indexing Decisions

### Relationships:
```text
User
 ├── Assigned Leads
 ├── Assigned Customers
 ├── Assigned Deals
 └── Assigned Activities

Lead (Original Source)
 ├── Converted Customer (1:1 reference)
 ├── Converted Deal (1:1 reference)
 ├── Linked Activities (1:Many reference)
 └── Timeline Audit Log (1:Many reference)

Customer
 ├── Reference to Original Lead
 ├── Linked Deals (1:Many)
 └── Activities & Timeline

Deal
 ├── Reference to Customer
 ├── Reference to Lead
 └── Activities & Timeline
```

### MongoDB Indexing:
- **`User`**: Unique index on `email`.
- **`Lead`**: Compound index on `{ status: 1, priority: 1, assignedTo: 1 }`, text index on `{ name: "text", company: "text", email: "text" }`, sorting index on `{ createdAt: -1 }`.
- **`Customer`**: Unique index on `email`, index on `{ assignedTo: 1 }`.
- **`Deal`**: Index on `{ currentStage: 1, assignedTo: 1 }`, `{ expectedClosingDate: 1 }`.
- **`Activity`**: Compound index on `{ entityType: 1, entityId: 1, status: 1 }`, `{ assignedTo: 1, dueDate: 1 }`.
- **`Timeline`**: Compound index on `{ entityType: 1, entityId: 1, createdAt: -1 }` for instant audit trail retrieval.

---

##  7. Installation & Setup

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas or local MongoDB instance

### Steps
1. Clone or open the repository:
   ```bash
   cd crm-sales-management
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

---

##  8. Environment Variables

Create `.env` using `.env.example`:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/crm-sales-management?retryWrites=true&w=majority
JWT_SECRET=crm_super_secure_jwt_token_secret_key_2026_production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
```

---

##  9. How to Run the Server & Tests

### Seed Default Users (Admin, Manager, Executive)
```bash
npm run seed
```

### Start Development Server (with auto-reload)
```bash
npm run dev
```

### Start Production Server
```bash
npm start
```

### Run Automated End-to-End Tests
```bash
npm test
```
The test suite executes 10 comprehensive suites verifying:
- Authentication, tokens, and RBAC
- Lead assignment to active users
- Lead conversion into Customer & Deal
- Deal business rules (Lost reason enforcement & closed deal immutability)
- Overdue activity detection
- Audit timeline history recording
- Dashboard metrics and team performance aggregation

---

##  10. API Documentation (Swagger & Postman)

### 🌐 Interactive Swagger / OpenAPI Documentation
When the server is running, open your browser to test endpoints interactively:
- **Swagger UI**: [http://localhost:5000/api/v1/docs](http://localhost:5000/api/v1/docs) or [http://localhost:5000/docs](http://localhost:5000/docs)
- **Raw OpenAPI JSON**: [http://localhost:5000/api/v1/docs.json](http://localhost:5000/api/v1/docs.json)

###  Postman Collection
Import the included file: [`crm_postman_collection.json`](file:///c:/Users/barik/crm-sales-management/crm_postman_collection.json) directly into Postman.

### Core Endpoints Overview

#### 1. System Health, Docs & Sitemaps
- `GET /` — API root information with docs link
- `GET /api/v1/docs` — Interactive Swagger UI documentation
- `GET /api/v1` — Interactive endpoint sitemap
- `GET /api/v1/health` — System uptime and health status

#### 2. Authentication (`/api/v1/auth`)
- `POST /register` — Register new user (`admin`, `sales_manager`, `sales_executive`)
- `POST /login` — Login user (rate limited to 15 attempts / 15 mins)
- `POST /logout` — Logout user (revokes JWT via MongoDB TTL blacklist)
- `GET /me` — Current user profile [Bearer Token]
- `PUT /update-profile` — Update user profile
- `PUT /update-password` — Change password

#### 3. User Management (`/api/v1/users`) [Admin / Manager]
- `GET /` — List users with search, role/status filters, pagination, and sorting
- `POST /` — Create user [Admin]
- `GET /sales-reps` — List active sales executives for assignment
- `GET /:id` — Get user by ID
- `PUT /:id` — Update user role/profile [Admin]
- `PATCH /:id/status` — Activate/deactivate user [Admin]
- `DELETE /:id` — Delete user [Admin]

#### 4. Leads Management (`/api/v1/leads`)
- `POST /` — Create lead (`name`, `email`, `phone`, `company`, `source`, `status`, `priority`, `description`, `estimatedValue`)
- `GET /` — List leads with multi-filter (`status`, `priority`, `source`, `assignedTo`, `startDate`, `endDate`, `search`, `page`, `limit`)
- `GET /:id` — Get lead by ID (includes populated rep, activities, and audit timeline)
- `PUT /:id` — Update lead
- `PATCH /:id/priority` — Update priority (`Low`, `Medium`, `High`)
- `PATCH /:id/assign` — Assign/reassign lead to sales executive (validates active user & logs timeline)
- `PATCH /:id/status` — Change status (`New`, `Contacted`, `Qualified`, `Unqualified`, `Converted`, `Lost`)
- `POST /:id/convert` — Convert qualified lead into Customer and Deal
- `DELETE /:id` — Delete lead

#### 5. Customers Management (`/api/v1/customers`)
- `POST /` — Create customer
- `GET /` — List customers with search, company filter, date filtering, pagination
- `GET /:id` — Get customer details (includes linked deals, activities, and timeline)
- `PUT /:id` — Update customer
- `DELETE /:id` — Delete customer (protected if active deals attached)

#### 6. Deals & Pipeline (`/api/v1/deals`)
- `POST /` — Create deal (`dealName`, `dealValue`, `currentStage`, `expectedClosingDate`, `customer`, `lead`)
- `GET /` — List deals with multi-filter (`stage`, `assignedTo`, `minAmount`, `maxAmount`, `closingDate`, pagination)
- `GET /pipeline/summary` — Pipeline summary (deals count & total value across all 6 stages)
- `GET /:id` — Get deal details
- `PUT /:id` — Update deal
- `PATCH /:id/stage` — Update stage (`Qualification`, `Discovery`, `Proposal`, `Negotiation`, `Won`, `Lost`)
- `DELETE /:id` — Delete deal

#### 7. Activities & Follow-ups (`/api/v1/activities`)
- `POST /` — Create activity (`type`: Call, Email, Meeting, Demo, Follow-up, Reminder, Note; `title`, `dueDate`, `entityType`, `entityId`)
- `GET /` — List activities (filters by `entityType`, `status`, `priority`, `assignedTo`, `dueDate`)
- `GET /:id` — Get activity details
- `PUT /:id` — Update activity
- `PATCH /:id/status` — Mark activity completed (`status`, `outcome`)
- `DELETE /:id` — Delete activity

#### 8. Audit Timeline (`/api/v1/timeline`)
- `GET /:entityType/:entityId` — Retrieve complete chronological audit trail with actions, previous values, and new values (Lead, Customer, Deal)

#### 9. Dashboard & Analytics (`/api/v1/analytics` & `/api/v1/dashboard`)
- `GET /` — Complete KPI metrics: total leads, new leads, qualified leads, converted leads, total customers, total deals, open deals, won deals, lost deals, won revenue, total pipeline value, expected revenue, conversion rate %, pending activities, overdue activities, and 6-stage pipeline breakdown.
- `GET /leads` — Granular lead statistics and conversion rates
- `GET /deals` — Granular deal financials, won revenue, and expected revenue
- `GET /pipeline` — 6-stage sales pipeline counts and values breakdown
- `GET /activities` — Activity statistics (pending, overdue, completed, total)
- `GET /team-performance` — Team-level performance breakdown across sales executives [Manager/Admin only].

---

## 🚀 11. Sample API Requests & Responses

Below are representative API requests and responses showcasing standard formatting: `{ success: true, message: "...", data: {}, meta: {} }`.

### 11.1 Authentication — User Login
**Request:**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@crm.local",
  "password": "Admin@123"
}
```

**Response (HTTP 200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "6735a123f890123456789abc",
      "name": "System Administrator",
      "email": "admin@crm.local",
      "role": "admin",
      "department": "Executive Management",
      "isActive": true,
      "createdAt": "2026-10-10T08:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 11.2 Lead Management — Create New Lead
**Request:**
```http
POST /api/v1/leads
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "name": "Tech Corp Lead",
  "email": "contact@techcorp.io",
  "phone": "+1-555-0199",
  "company": "Tech Corp Enterprises",
  "source": "Website",
  "status": "New",
  "priority": "High",
  "estimatedValue": 85000,
  "description": "Enterprise cloud security modernization project."
}
```

**Response (HTTP 201 Created):**
```json
{
  "success": true,
  "message": "Lead created successfully",
  "data": {
    "_id": "6735b456f890123456789def",
    "name": "Tech Corp Lead",
    "email": "contact@techcorp.io",
    "phone": "+1-555-0199",
    "company": "Tech Corp Enterprises",
    "source": "Website",
    "status": "New",
    "priority": "High",
    "estimatedValue": 85000,
    "isConverted": false,
    "createdBy": "6735a123f890123456789abc",
    "createdAt": "2026-10-10T09:15:00.000Z"
  }
}
```

---

### 11.3 Lead Conversion — Atomic Conversion into Customer & Deal
**Request:**
```http
POST /api/v1/leads/6735b456f890123456789def/convert
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "createDeal": true,
  "dealName": "Tech Corp - Cloud Modernization Contract",
  "dealValue": 85000,
  "expectedClosingDate": "2026-12-15T00:00:00.000Z"
}
```

**Response (HTTP 200 OK):**
```json
{
  "success": true,
  "message": "Lead converted successfully into customer and deal",
  "data": {
    "customer": {
      "_id": "6735c789f890123456789111",
      "name": "Tech Corp Lead",
      "email": "contact@techcorp.io",
      "company": "Tech Corp Enterprises",
      "lead": "6735b456f890123456789def",
      "status": "Active"
    },
    "deal": {
      "_id": "6735d901f890123456789222",
      "dealName": "Tech Corp - Cloud Modernization Contract",
      "dealValue": 85000,
      "currentStage": "Qualification",
      "probability": 10,
      "expectedRevenue": 8500,
      "expectedClosingDate": "2026-12-15T00:00:00.000Z",
      "customer": "6735c789f890123456789111",
      "lead": "6735b456f890123456789def"
    }
  }
}
```

---

### 11.4 Deal Pipeline — Stage Transition to Won
**Request:**
```http
PATCH /api/v1/deals/6735d901f890123456789222/stage
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "stage": "Won"
}
```

**Response (HTTP 200 OK):**
```json
{
  "success": true,
  "message": "Deal stage updated successfully",
  "data": {
    "_id": "6735d901f890123456789222",
    "dealName": "Tech Corp - Cloud Modernization Contract",
    "dealValue": 85000,
    "currentStage": "Won",
    "probability": 100,
    "expectedRevenue": 85000,
    "actualClosingDate": "2026-10-10T10:30:00.000Z"
  }
}
```

---

### 11.5 Sales Activity — Schedule Meeting & Dynamic Overdue State
**Request:**
```http
POST /api/v1/activities
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "type": "Meeting",
  "title": "Quarterly Technical Architecture Review",
  "entityType": "Deal",
  "entityId": "6735d901f890123456789222",
  "dueDate": "2026-11-20T14:00:00.000Z",
  "durationMinutes": 60,
  "description": "Review final security integration guidelines."
}
```

**Response (HTTP 201 Created):**
```json
{
  "success": true,
  "message": "Activity created successfully",
  "data": {
    "_id": "6735e123f890123456789333",
    "type": "Meeting",
    "title": "Quarterly Technical Architecture Review",
    "status": "Pending",
    "isOverdue": false,
    "dueDate": "2026-11-20T14:00:00.000Z",
    "entityType": "Deal",
    "entityId": "6735d901f890123456789222",
    "createdAt": "2026-10-10T10:35:00.000Z"
  }
}
```

---

### 11.6 Audit Timeline — Chronological History
**Request:**
```http
GET /api/v1/timeline/Lead/6735b456f890123456789def
Authorization: Bearer <TOKEN>
```

**Response (HTTP 200 OK):**
```json
{
  "success": true,
  "message": "Timeline retrieved successfully",
  "data": [
    {
      "_id": "6735f999f890123456789444",
      "action": "Lead converted",
      "entityType": "Lead",
      "entityId": "6735b456f890123456789def",
      "performedBy": {
        "_id": "6735a123f890123456789abc",
        "name": "System Administrator",
        "email": "admin@crm.local"
      },
      "previousValue": null,
      "newValue": {
        "customerId": "6735c789f890123456789111",
        "dealId": "6735d901f890123456789222"
      },
      "createdAt": "2026-10-10T09:45:00.000Z"
    },
    {
      "_id": "6735f888f890123456789555",
      "action": "Lead status changed",
      "entityType": "Lead",
      "entityId": "6735b456f890123456789def",
      "previousValue": "New",
      "newValue": "Qualified",
      "createdAt": "2026-10-10T09:30:00.000Z"
    },
    {
      "_id": "6735f777f890123456789666",
      "action": "Lead created",
      "entityType": "Lead",
      "entityId": "6735b456f890123456789def",
      "createdAt": "2026-10-10T09:15:00.000Z"
    }
  ]
}
```

---

### 11.7 Dashboard & KPIs — Real-time Metrics
**Request:**
```http
GET /api/v1/dashboard
Authorization: Bearer <TOKEN>
```

**Response (HTTP 200 OK):**
```json
{
  "success": true,
  "message": "Dashboard metrics retrieved successfully",
  "data": {
    "totalLeads": 42,
    "newLeads": 12,
    "qualifiedLeads": 15,
    "convertedLeads": 15,
    "totalCustomers": 15,
    "totalDeals": 18,
    "openDeals": 12,
    "wonDeals": 5,
    "lostDeals": 1,
    "totalRevenue": 425000,
    "totalPipelineValue": 1250000,
    "expectedRevenue": 612500,
    "conversionRate": "35.7%",
    "pendingActivities": 24,
    "overdueActivities": 3,
    "pipeline": [
      { "stage": "Qualification", "count": 4, "totalValue": 250000 },
      { "stage": "Discovery", "count": 3, "totalValue": 180000 },
      { "stage": "Proposal", "count": 3, "totalValue": 240000 },
      { "stage": "Negotiation", "count": 2, "totalValue": 155000 },
      { "stage": "Won", "count": 5, "totalValue": 425000 },
      { "stage": "Lost", "count": 1, "totalValue": 50000 }
    ]
  }
}
```

---

## 📌 12. Assumptions Made

1. **Role Mapping & Aliasing**: The system canonically defines `admin`, `sales_manager`, and `sales_executive` as per the specification, while gracefully supporting backward-compatible aliases (`manager`, `sales_rep`).
2. **Sales Executive Scoping**: Sales executives are restricted to viewing and managing records assigned to them or created by them. Managers and Admins maintain organization-wide pipeline visibility.
3. **Pipeline Stages**: The canonical 6 stages defined are: `Qualification`, `Discovery`, `Proposal`, `Negotiation`, `Won`, and `Lost`.
4. **Lead Conversion**: When a lead is converted, the customer record retains the `lead` ID reference, and the newly created deal references both the `customer` and `lead` IDs to maintain complete end-to-end traceability.
5. **Audit Trail**: Key system transitions automatically create non-blocking audit records in the `timelines` collection with before/after state diffs to ensure high query performance while preserving full history.
6. **Token Blacklist**: Logout leverages an auto-expiring MongoDB TTL index on the `tokenblacklists` collection matching the remaining token lifetime.

---

## 🌐 13. Deployment Information

### Production Deployment Instructions
This application is completely container-ready and cloud-native:
1. **Host on Render / Railway / Heroku / AWS EC2**:
   - Build Command: `npm install`
   - Start Command: `node server.js`
2. **MongoDB Atlas Connection**:
   - Set `MONGO_URI` environment variable with MongoDB Atlas connection string.
   - Set `JWT_SECRET` with a secure random key.
   - Set `NODE_ENV=production`.
3. **Live Deployed API Link**:
   - **Base URL**: `https://crm-sales-management-production.up.railway.app` (or your cloud platform URL)
   - **Swagger Docs**: `https://crm-sales-management-production.up.railway.app/api/v1/docs`
   - **Health Check**: `https://crm-sales-management-production.up.railway.app/api/v1/health`

### Postman & Database Design Links:
- Postman Collection: [`crm_postman_collection.json`](file:///c:/Users/barik/crm-sales-management/crm_postman_collection.json)
- MongoDB Schema Architecture: [`DATABASE_DESIGN.md`](file:///c:/Users/barik/crm-sales-management/DATABASE_DESIGN.md)

