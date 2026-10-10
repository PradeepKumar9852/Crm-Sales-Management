# CRM Sales Management System — Production Backend API

A production-grade, enterprise-ready RESTful backend built with **Node.js**, **Express.js**, and **MongoDB (Mongoose)** for managing the end-to-end B2B sales lifecycle:
**Lead Generation → Lead Qualification → Customer Conversion → Deal Pipeline Management → Deal Closure → Activity Tracking & Audit History**.

---

##  Table of Contents
1. [Project Overview](#-project-overview)
2. [Technologies Used](#-technologies-used)
3. [Architecture & Folder Structure](#-architecture--folder-structure)
4. [User Roles & Permissions (RBAC)](#-user-roles--permissions-rbac)
5. [Enterprise Business Rules](#-enterprise-business-rules)
6. [Database Design & Indexing Decisions](#-database-design--indexing-decisions)
7. [Installation & Setup](#-installation--setup)
8. [Environment Variables](#-environment-variables)
9. [How to Run the Server & Tests](#-how-to-run-the-server--tests)
10. [API Documentation & Postman Collection](#-api-documentation--postman-collection)
11. [Assumptions Made](#-assumptions-made)

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

##  11. Assumptions Made

1. **Role Mapping**: The system canonically defines `admin`, `sales_manager`, and `sales_executive` as per the specification, while gracefully supporting aliases (`manager`, `sales_rep`).
2. **Sales Executive Scoping**: Sales executives are restricted to records assigned to them or created by them. Managers and Admins maintain organization-wide pipeline visibility.
3. **Pipeline Stages**: The canonical 6 stages defined are: `Qualification`, `Discovery`, `Proposal`, `Negotiation`, `Won`, and `Lost`.
4. **Lead Conversion**: When a lead is converted, the customer record retains the `lead` ID reference, and the newly created deal references both the `customer` and `lead` IDs to maintain complete traceability.
5. **Audit Trail**: Key system transitions automatically create non-blocking audit records in the `timelines` collection to ensure high query performance while preserving full history.
6. **Token Blacklist**: Logout leverages an auto-expiring MongoDB TTL index on the `tokenblacklists` collection matching the remaining token lifetime.
