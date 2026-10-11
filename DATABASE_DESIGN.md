# CRM Database Design & Architecture Notes

## Overview
This document outlines the MongoDB schema design for the CRM Sales Management backend. The goal was to build a clean, normalized relational structure using Mongoose that supports the complete B2B sales lifecycle:
**Lead Capture → Qualification → Customer & Deal Conversion → Activity Follow-ups → Timeline Audit Trail**.

Instead of over-complicating the schema with deep nesting or exotic patterns, I kept the design straightforward, easy to maintain, and optimized for real-world queries.

---

## 1. Core Architecture: References vs Embedding

A common decision in MongoDB is whether to embed related data or use separate collections with references (`ObjectId`).

For this system, I used **separate collections linked by `ObjectId` references** for all main entities, with small subdocuments only where it genuinely made sense (e.g., customer address):

- **Independent Pipelines**: Deals need to be queried across all companies for pipeline views, stage forecasting, and manager reporting. Embedding deals inside customer documents would force expensive `$unwind` aggregation pipelines.
- **Daily Rep Workflows**: Sales reps need a single endpoint to fetch their daily agenda (`"get all my pending activities due today"`). Having an `activities` collection with an index on `{ assignedTo: 1, dueDate: 1 }` makes this a fast, single-index query.
- **Document Size Limits**: In a production CRM, accounts accumulate hundreds of calls, emails, notes, and audit events over years. Keeping them in separate collections avoids MongoDB's 16MB document size limit.
- **Historical Reporting**: When a lead converts into a customer and deal, the original lead document remains intact for marketing attribution and conversion rate reporting.

---

## 2. Sales Lifecycle & Data Flow

```text
Lead Ingestion (Web form, referral, phone call)
     │
     ▼
Lead Qualification (Rep contacts lead, marks status = 'Qualified')
     │
     ▼
Atomic Conversion (Single transaction / safe operation)
     ├──> Creates Customer record (account & contact details)
     ├──> Creates Deal record (pipeline stage, value, close date)
     └──> Locks Lead (isConverted = true, references to customer & deal)
     │
     ├─── Activities (Calls, meetings, emails linked to Lead / Customer / Deal)
     └─── Timeline (Audit log recording who changed what and when)
```

---

## 3. Collections Breakdown

### 3.1 Users (`users`)
Stores system users with role-based access control (Admin, Sales Manager, Sales Executive).

```javascript
// Key Fields:
{
  name: String,        // Full name
  email: String,       // Unique login email (lowercased)
  password: String,    // Bcrypt hash (select: false so it never leaks in queries)
  role: String,        // 'admin' | 'sales_manager' | 'sales_executive'
  phone: String,       // Optional contact number
  department: String,  // e.g. "Enterprise Sales"
  isActive: Boolean,   // Used to enable/disable login access without hard-deleting
  lastLogin: Date
}
```
**Developer Notes:**
- Password hashing is handled via a Mongoose `pre('save')` hook with 10 salt rounds.
- `select: false` on the password field guarantees passwords aren't accidentally returned in `User.find()` calls.
- `isActive` check runs in the auth middleware to block deactivated accounts immediately.

---

### 3.2 Leads (`leads`)
Tracks incoming prospects before they become paying customers.

```javascript
// Key Fields:
{
  name: String,            // Contact person or lead name
  email: String,           // Contact email
  phone: String,           // Contact phone
  company: String,         // Organization name
  source: String,          // 'Website' | 'Referral' | 'Social Media' | 'Email' | 'Phone' | 'Other'
  status: String,          // 'New' | 'Contacted' | 'Qualified' | 'Unqualified' | 'Converted' | 'Lost'
  priority: String,        // 'Low' | 'Medium' | 'High'
  estimatedValue: Number,  // Projected deal size
  assignedTo: ObjectId,    // Ref -> User (sales rep)
  createdBy: ObjectId,     // Ref -> User
  isConverted: Boolean,    // Lock flag (default: false)
  convertedCustomer: ObjectId, // Ref -> Customer (populated after conversion)
  convertedDeal: ObjectId,     // Ref -> Deal (populated after conversion)
  convertedAt: Date
}
```
**Developer Notes:**
- Only leads with `status: 'Qualified'` are eligible for conversion.
- Once `isConverted: true`, the lead cannot be converted a second time.
- Sales executives can only see leads where `assignedTo == user._id` or `createdBy == user._id`.

---

### 3.3 Customers (`customers`)
Represents converted enterprise accounts and official customer profiles.

```javascript
// Key Fields:
{
  name: String,        // Company / Client name
  email: String,       // Primary business email (unique)
  phone: String,       // Primary contact phone
  company: String,     // Company name
  address: {           // Embedded subdocument (address is always loaded with customer)
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  lead: ObjectId,      // Ref -> Lead (originating lead)
  assignedTo: ObjectId,// Ref -> User (account owner)
  createdBy: ObjectId, // Ref -> User
  status: String,      // 'Active' | 'Inactive' | 'Customer'
  notes: String
}
```
**Developer Notes:**
- Uses an embedded subdocument for `address` because an address has no independent lifecycle outside of its customer.
- Deleting a customer is blocked if active deals are still linked to it.

---

### 3.4 Deals (`deals`)
Tracks commercial revenue opportunities across the sales pipeline.

```javascript
// Key Fields:
{
  dealName: String,             // Opportunity title
  dealValue: Number,            // Contract value (must be > 0)
  currency: String,             // Default: 'USD'
  currentStage: String,         // 'Qualification' | 'Discovery' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost'
  probability: Number,          // 0 to 100 percentage
  expectedRevenue: Number,      // Auto-calculated: (dealValue * probability / 100)
  expectedClosingDate: Date,    // Target close date
  actualClosingDate: Date,      // Timestamp set automatically when Won or Lost
  lostReason: String,           // Mandatory when stage is moved to 'Lost'
  customer: ObjectId,           // Ref -> Customer
  lead: ObjectId,               // Ref -> Lead
  assignedTo: ObjectId,         // Ref -> User
  createdBy: ObjectId,          // Ref -> User
  description: String
}
```
**Developer Notes:**
- Expected revenue is automatically computed and rounded on pre-save.
- If a deal moves to `Lost`, the backend enforces a non-empty `lostReason`.
- Once a deal reaches `Won` or `Lost`, business logic blocks moving it back to an active stage.

---

### 3.5 Activities (`activities`)
Stores calls, meetings, follow-ups, demos, and notes.

```javascript
// Key Fields:
{
  type: String,            // 'Call' | 'Email' | 'Meeting' | 'Demo' | 'Follow-up' | 'Reminder' | 'Note'
  title: String,           // Activity subject / summary
  description: String,     // Call notes or meeting agenda
  status: String,          // 'Pending' | 'Completed' | 'Overdue'
  priority: String,        // 'Low' | 'Medium' | 'High'
  dueDate: Date,           // Scheduled target time
  completedDate: Date,     // Timestamp filled when status becomes Completed
  durationMinutes: Number, // Default: 15
  outcome: String,         // Summary notes after call/meeting
  entityType: String,      // 'Lead' | 'Customer' | 'Deal'
  entityId: ObjectId,      // ID of the target record
  assignedTo: ObjectId,    // Ref -> User
  createdBy: ObjectId      // Ref -> User
}
```
**Developer Notes:**
- Dynamic Overdue Calculation: An activity is flagged as `Overdue` whenever `status === 'Pending'` and `dueDate < Date.now()`.
- Polymorphic Association: `entityType` and `entityId` allow a single activity collection to link to leads, customers, or deals without duplicating code.

---

### 3.6 Timeline (`timelines`)
Immutable system audit log.

```javascript
// Key Fields:
{
  action: String,          // e.g. "Lead assigned", "Deal stage changed", "Lead converted"
  entityType: String,      // 'Lead' | 'Customer' | 'Deal'
  entityId: ObjectId,      // ID of the modified entity
  performedBy: ObjectId,   // Ref -> User who triggered the action
  previousValue: Mixed,    // Previous state snapshot (e.g. "Proposal")
  newValue: Mixed,         // New state snapshot (e.g. "Negotiation")
  metadata: Object,        // Contextual details (amounts, assigned rep name, etc.)
  createdAt: Date
}
```
**Developer Notes:**
- Append-only collection. We do not provide update or delete endpoints for timeline records.
- Automatically written by service functions whenever critical actions take place.

---

### 3.7 Token Blacklist (`tokenblacklists`)
Stores revoked JWT tokens on user logout.
- Utilizes MongoDB's native TTL (Time-To-Live) index on `expiresAt`.
- Expired tokens are purged automatically by MongoDB in the background, requiring no maintenance or external cron jobs.

---

## 4. Indexing Decisions

Every index was added to support specific queries in the application:

1. **`users.email` (Unique Index)**
   - Used for quick login lookups (`findOne({ email })`) and preventing duplicate accounts.

2. **`leads` (Text Index on `name`, `company`, `email`)**
   - Enables fast keyword search across the lead database (`$text: { $search: keyword }`).

3. **`leads` (Compound Index on `{ status: 1, priority: 1, assignedTo: 1 }`)**
   - Powers the primary lead list filter used by sales reps and managers on a daily basis.

4. **`deals` (Compound Index on `{ currentStage: 1, assignedTo: 1 }`)**
   - Optimizes pipeline board views and stage-by-stage revenue aggregations.

5. **`activities` (Compound Index on `{ assignedTo: 1, dueDate: 1 }`)**
   - Speeds up the daily task agenda for reps and allows the system to query overdue activities without a full collection scan.

6. **`activities` (Compound Index on `{ entityType: 1, entityId: 1, status: 1 }`)**
   - Instantly fetches all open or past activities attached to a specific lead or deal.

7. **`timelines` (Compound Index on `{ entityType: 1, entityId: 1, createdAt: -1 }`)**
   - Fetches an entity's audit history sorted newest first.

---

## 5. Safe Lead Conversion Flow

Converting a lead touches three collections: `leads`, `customers`, and `deals`. Here is the exact flow implemented in `lead.service.js`:

1. Check that the lead exists, is `Qualified`, and `isConverted` is `false`.
2. Start a session / transaction to prevent partial writes.
3. Create the `Customer` record with company and contact information from the lead.
4. Create the initial `Deal` record referencing both `customer._id` and `lead._id`.
5. Update the `Lead` record:
   - Set `isConverted = true`
   - Set `status = 'Converted'`
   - Set `convertedCustomer = customer._id`
   - Set `convertedDeal = deal._id`
   - Set `convertedAt = new Date()`
6. Record a `Lead converted` event in the `timelines` collection.
7. Commit the transaction. If any step fails, roll back everything so no orphaned records exist.

---

## 6. Practical JSON Document Examples

### Sample Lead Record
```json
{
  "_id": "670c2a819b1a230012a4b001",
  "name": "Sarah Jenkins",
  "email": "sarah@apexsystems.com",
  "phone": "+1-555-0144",
  "company": "Apex Systems",
  "source": "Website",
  "status": "Qualified",
  "priority": "High",
  "estimatedValue": 35000,
  "assignedTo": "670c1a819b1a230012a4a003",
  "createdBy": "670c1a819b1a230012a4a001",
  "isConverted": false,
  "createdAt": "2026-10-10T10:00:00.000Z",
  "updatedAt": "2026-10-10T11:30:00.000Z"
}
```

### Sample Converted Customer Record
```json
{
  "_id": "670c3a819b1a230012a4c001",
  "name": "Apex Systems Account",
  "email": "sarah@apexsystems.com",
  "phone": "+1-555-0144",
  "company": "Apex Systems",
  "address": {
    "street": "450 Market Street",
    "city": "San Francisco",
    "state": "CA",
    "postalCode": "94105",
    "country": "USA"
  },
  "lead": "670c2a819b1a230012a4b001",
  "assignedTo": "670c1a819b1a230012a4a003",
  "createdBy": "670c1a819b1a230012a4a003",
  "status": "Active",
  "notes": "Converted from website lead. Ready for enterprise proposal.",
  "createdAt": "2026-10-10T12:00:00.000Z",
  "updatedAt": "2026-10-10T12:00:00.000Z"
}
```

### Sample Deal Record
```json
{
  "_id": "670c4a819b1a230012a4d001",
  "dealName": "Apex Systems - Enterprise Tier",
  "dealValue": 35000,
  "currency": "USD",
  "currentStage": "Negotiation",
  "probability": 80,
  "expectedRevenue": 28000,
  "expectedClosingDate": "2026-11-20T00:00:00.000Z",
  "customer": "670c3a819b1a230012a4c001",
  "lead": "670c2a819b1a230012a4b001",
  "assignedTo": "670c1a819b1a230012a4a003",
  "createdBy": "670c1a819b1a230012a4a003",
  "description": "Enterprise software licensing agreement.",
  "createdAt": "2026-10-10T12:00:00.000Z",
  "updatedAt": "2026-10-10T14:45:00.000Z"
}
```

### Sample Activity Record
```json
{
  "_id": "670c5a819b1a230012a4e001",
  "type": "Demo",
  "title": "Technical demo with engineering leads",
  "description": "Showcase API capabilities, SSO integration, and RBAC.",
  "status": "Completed",
  "priority": "High",
  "dueDate": "2026-10-11T14:00:00.000Z",
  "completedDate": "2026-10-11T14:45:00.000Z",
  "durationMinutes": 45,
  "outcome": "Client requested proposal with 50 seats.",
  "entityType": "Deal",
  "entityId": "670c4a819b1a230012a4d001",
  "assignedTo": "670c1a819b1a230012a4a003",
  "createdBy": "670c1a819b1a230012a4a003",
  "createdAt": "2026-10-10T15:00:00.000Z",
  "updatedAt": "2026-10-11T14:45:00.000Z"
}
```

### Sample Timeline Record
```json
{
  "_id": "670c6a819b1a230012a4f001",
  "action": "Deal stage changed",
  "entityType": "Deal",
  "entityId": "670c4a819b1a230012a4d001",
  "performedBy": "670c1a819b1a230012a4a003",
  "previousValue": "Proposal",
  "newValue": "Negotiation",
  "metadata": {
    "probability": 80,
    "expectedRevenue": 28000
  },
  "createdAt": "2026-10-10T14:45:00.000Z"
}
```
