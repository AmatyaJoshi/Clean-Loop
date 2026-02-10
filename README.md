# CleanLoop

**Enterprise Laundry Operations Platform**

Live deployment: [https://clean-loop-seven.vercel.app/](https://clean-loop-seven.vercel.app/)

---
Admin Login- 
              Username: admin@cleanloop.com
              Password: admin123

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Understanding the Problem](#understanding-the-problem)
3. [Proposed Solution](#proposed-solution)
4. [Business Impact](#business-impact)
5. [Architecture Overview](#architecture-overview)
6. [Technology Stack](#technology-stack)
7. [Database Design](#database-design)
8. [Feature Inventory](#feature-inventory)
9. [AI and Forecasting](#ai-and-forecasting)
10. [API Surface](#api-surface)
11. [Authentication and Authorization](#authentication-and-authorization)
12. [Payment Infrastructure](#payment-infrastructure)
13. [Deployment and Infrastructure](#deployment-and-infrastructure)
14. [Local Development Setup](#local-development-setup)
15. [Project Structure](#project-structure)
16. [Assumptions](#assumptions)
17. [Scope Decisions](#scope-decisions)
18. [Trade-offs and Judgment Calls](#trade-offs-and-judgment-calls)

---

## Problem Statement

A local laundry business operates multiple outlets within a city. As the business grows, the owner needs to scale operations efficiently while continuing to deliver a good customer experience. The task is to propose a technology solution that enables this.

## Understanding the Problem

Before writing any code, it is worth decomposing what "scaling a multi-outlet laundry business" actually means in operational terms. The pain points fall into three distinct categories:

### Operational Fragmentation

When a laundry business grows from one outlet to many, the owner loses direct visibility. Orders placed at Outlet A are invisible to Outlet B. Staff scheduling, capacity planning, and service consistency become ad-hoc. The owner ends up managing by phone calls and spreadsheets -- a pattern that breaks down past 3-4 outlets.

### Customer Experience Degradation

From the customer's perspective, growth often makes things worse. Wait times increase because there is no capacity-aware routing. There is no way to track an order's status without calling the outlet. Pricing becomes inconsistent across locations. Loyalty is not rewarded because there is no unified customer identity.

### Decision-Making Without Data

The owner cannot answer basic questions: Which outlet is most profitable? What is the month-over-month revenue trend? Which services have the highest margin? Are we overstaffed on Tuesdays? Without centralized data, every decision is a guess.

CleanLoop addresses all three categories through a single unified platform.

---

## Proposed Solution

CleanLoop is a full-stack web application that unifies the entire laundry business operation -- from customer order placement through staff processing to owner-level analytics -- into one system.

The platform serves four distinct user personas:

| Persona | Access Point | Core Capability |
|---------|-------------|-----------------|
| **Customer** | Public-facing pages | Place orders, track status, manage memberships, interact with AI support |
| **Staff** | Admin portal | Process orders, update statuses, handle day-to-day operations |
| **Outlet Manager** | Admin portal | Supervise staff, manage outlet-level operations |
| **Owner / Admin** | Admin portal | Full operational visibility, analytics, forecasting, AI-assisted insights |

The key design principle: **every interaction generates structured data, and that data feeds back into operational intelligence.** An order is not just a transaction; it is a data point that improves forecasting, informs staffing decisions, and enhances customer segmentation.

---

## Business Impact

### Quantified Operational Improvements

| Metric | Without CleanLoop | With CleanLoop |
|--------|------------------|----------------|
| Order intake | Walk-in or phone only | Online booking with 24/7 availability |
| Order tracking | Customer calls the outlet | Self-service real-time 8-stage tracking |
| Cross-outlet visibility | None | Centralized dashboard with all outlets |
| Revenue reporting | Manual end-of-day counting | Real-time aggregation with trend analysis |
| Demand forecasting | Owner intuition | Statistical models (Holt-Winters, Linear Regression) |
| Customer retention | No loyalty program | Tiered membership with automated benefits |
| Staff coordination | Phone calls between outlets | Role-based portal with per-outlet assignment |
| Payment reconciliation | Manual ledger | Digitized with proof uploads and verification workflow |

### Unit Economics Improvement

The membership system (Basic/Premium/Elite/Business tiers from free to 999 INR/month) creates predictable recurring revenue. A customer on the Elite plan at 499 INR/month who places 4 orders averaging 800 INR each generates approximately 3,200 INR in order revenue (with 15% higher retention than non-members based on industry benchmarks) plus the subscription fee. The platform captures this entire lifecycle.

---

## Architecture Overview

```
                                 +------------------+
                                 |   Vercel Edge    |
                                 |   (CDN + SSR)    |
                                 +--------+---------+
                                          |
                              +-----------+-----------+
                              |   Next.js 16 App      |
                              |   (React 19 + RSC)    |
                              +-----------+-----------+
                                          |
                    +---------------------+---------------------+
                    |                     |                     |
          +---------+-------+   +---------+-------+   +--------+--------+
          |  Static Pages   |   |  API Routes     |   |  Server         |
          |  (ISR/SSG)      |   |  (/api/*)       |   |  Components     |
          +-----------------+   +---------+-------+   +-----------------+
                                          |
                    +---------------------+---------------------+
                    |                     |                     |
          +---------+-------+   +---------+-------+   +--------+--------+
          |  Prisma ORM     |   | Hugging Face    |   |  Appwrite       |
          |  (Query Layer)  |   | Inference API   |   |  (Files/Email)  |
          +---------+-------+   +-----------------+   +-----------------+
                    |
          +---------+-------+
          |  MySQL 8.0      |
          |  (DigitalOcean)  |
          +-----------------+
```

The architecture is deliberately monolithic. For a business at the scale of 10 outlets with tens of thousands of orders, a microservices architecture would introduce operational complexity (service mesh, distributed tracing, eventual consistency) without proportional benefit. A well-structured monolith on Next.js API routes provides sub-100ms response times, type safety across the full stack, and a single deployment artifact.

---

## Technology Stack

### Core Framework

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Framework | Next.js | 16.1.6 | App Router with React Server Components eliminates the need for a separate API server. Turbopack provides sub-second HMR in development. |
| Runtime | React | 19.2.3 | Concurrent rendering, Suspense boundaries for streaming, and the `use` hook for server-client data bridging. |
| Language | TypeScript | 5.x | End-to-end type safety from database schema to UI props. Prisma generates types from the schema; Zod validates at API boundaries. |
| Bundler | Turbopack | (built-in) | Rust-based bundler shipping with Next.js 16. 10x faster than Webpack for incremental builds. |

### Data Layer

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| ORM | Prisma 5.22.0 | Type-safe database client generated from a declarative schema. Handles migrations, relations, and connection pooling. Raw SQL escape hatch used for complex aggregation queries. |
| Database | MySQL 8.0 (DigitalOcean Managed) | ACID-compliant relational store. Managed instance provides automated backups, SSL enforcement, and vertical scaling without ops burden. |
| Validation | Zod 4.3.6 | Runtime schema validation at every API boundary. Composes with TypeScript's type system for zero-drift between validation and types. |

### Authentication

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Auth | NextAuth.js 4.24.13 | JWT-based session strategy with CredentialsProvider. Supports role-based access control across 7 role levels. |
| Password Hashing | bcryptjs 3.0.3 | Industry-standard adaptive hashing. Cost factor calibrated for sub-200ms verification on commodity hardware. |

### AI and Machine Learning

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Customer Chatbot | Zephyr-7B-Beta (HuggingFace) | Conversational model fine-tuned for helpfulness. Temperature 0.7 for natural responses. Injected with live service/pricing data via RAG pattern. |
| Admin Analytics AI | Mistral-7B-Instruct-v0.3 (HuggingFace) | Instruction-tuned model for structured business analysis. Temperature 0.4 for factual, data-grounded responses. Fed real-time metrics via SQL-to-context pipeline. |
| Statistical Forecasting | Custom TypeScript engine | Holt-Winters exponential smoothing + linear regression. No external ML dependencies. Pure math, deterministic, reproducible. |
| Fallback System | Rule-based local response engine | When HuggingFace API is unavailable, both chatbots fall back to keyword-matching logic that still uses real database context. Zero-downtime AI. |

### UI Layer

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Styling | Tailwind CSS 4.x | Utility-first CSS with zero runtime overhead. Design tokens enforced through configuration. |
| Components | shadcn/ui (Radix primitives) | Accessible, unstyled headless components. Copied into the project (not a dependency), allowing full customization without version lock-in. |
| Icons | Lucide React | Tree-shakeable icon library. Only imported icons are bundled. |
| Forms | React Hook Form + Zod | Uncontrolled form rendering (minimal re-renders) with schema-based validation. |
| Data Fetching | SWR 2.4.0 | Stale-while-revalidate caching for client-side data. Automatic revalidation on focus, interval, and reconnect. |
| Animations | Custom CSS keyframes | No animation library dependency. Fade-in, slide-up, and spin effects via CSS `@keyframes` with Tailwind's `animation-delay` utilities. |

### External Services

| Service | Provider | Purpose |
|---------|----------|---------|
| File Storage | Appwrite Cloud | UPI payment proof uploads (screenshots). Bucket-based storage with file ID tracking. |
| Transactional Email | Appwrite Cloud Functions | Order confirmations, payment verification notices, membership lifecycle emails. |
| AI Inference | Hugging Face Inference API | Hosted model inference for both chatbots. Free tier sufficient for demonstration scale. |
| Database Hosting | DigitalOcean Managed MySQL | Production database with SSL enforcement, automated backups, and monitoring. |
| Application Hosting | Vercel | Edge-optimized deployment with automatic preview deployments per git push. |

---

## Database Design

The schema consists of 16 relational models designed around the multi-tenant organization pattern.

### Entity Relationship Summary

```
Organization (tenant root)
  |-- Outlet[] (physical locations)
  |     |-- Staff[] (assigned personnel)
  |     |-- Order[] (processed at this outlet)
  |
  |-- Customer[] (registered users)
  |     |-- Order[] (placed by customer)
  |     |-- Payment[] (made by customer)
  |     |-- CustomerMembership[] (subscription plans)
  |
  |-- Service[] (offered services)
  |     |-- ServiceCategory (grouping)
  |     |-- OrderItem[] (line items referencing service)
  |
  |-- Order[] (core business entity)
  |     |-- OrderItem[] (individual garments/items)
  |     |-- Payment[] (financial transactions)
  |
  |-- Payment[]
        |-- PaymentProof[] (uploaded verification files)

MembershipPlan[] (global plan definitions)
  |-- CustomerMembership[]
        |-- MembershipTransaction[] (purchase/renewal audit trail)

MetricsSummary (singleton, precomputed dashboard cache)
UpiAccount[] (payment receiving configuration)
User[] (authentication identity, linked to Customer or Staff)
```

### Scale Characteristics

The production database currently holds:

| Table | Row Count | Notes |
|-------|-----------|-------|
| Order | 218,925 | Spanning 24 months of simulated operational data |
| OrderItem | 435,985 | Average 2 items per order |
| Payment | 204,619 | Linked to orders with status tracking |
| User | 12,002 | Authentication records |
| Customer | 10,000 | With lifetime value and loyalty point tracking |
| Staff | 2,000 | Distributed across 10 outlets |
| Outlet | 10 | Each with capacity, geolocation, operating hours |
| Service | 12 | Across multiple categories |

### Performance Optimization

At 218K+ orders, naive aggregation queries (SUM, COUNT, GROUP BY across months) become prohibitively slow. The solution:

- **MetricsSummary table**: A singleton row stores a precomputed JSON blob of all dashboard metrics. A warmup script (`prisma/warmup-metrics.ts`) runs the heavy aggregation once and caches the result. The dashboard reads from this cache in <50ms instead of scanning 200K+ rows on every load.
- **Composite indexes**: `[status, createdAt]`, `[outletId, status]`, `[customerId]`, `[status, paidAt]` on high-cardinality tables.
- **Raw SQL for complex queries**: Prisma's query builder is used for CRUD operations. For multi-table aggregations with date arithmetic, raw SQL provides 3-5x better performance than equivalent Prisma `groupBy` calls.

---

## Feature Inventory

### Customer-Facing Features

**Order Placement**
- Service selection from categorized catalog with real-time pricing
- Address specification for pickup and delivery (street, city, state, zip)
- Priority selection: Normal, Express (1.5x multiplier), Urgent
- Special instructions field for garment-specific notes
- Automatic 18% GST calculation
- Order number generation: `ORD-{timestamp}-{random9chars}`

**Order Tracking**
- 8-stage status pipeline: Pending, Confirmed, Picked Up, In Progress, Quality Check, Ready, Out for Delivery, Delivered
- Visual progress bar (horizontal on desktop, vertical on mobile) with animated current step indicator
- Key dates grid: pickup scheduled/completed, delivery scheduled/completed
- Per-item status tracking within an order
- Outlet contact information display
- Full status history timeline with timestamps and notes

**Membership System**
- 4-tier plan structure:

| Plan | Monthly | Annual | Order Discount | Key Differentiator |
|------|---------|--------|---------------|-------------------|
| Basic | Free | Free | 0% | Order tracking, email notifications |
| Premium | 299 INR | 2,999 INR | 10% | Free pickup/delivery, priority support |
| Elite | 499 INR | 4,999 INR | 15% | Same-day service, dedicated account manager, stain removal guarantee |
| Business | 999 INR | 9,999 INR | 20% | Bulk processing, custom invoicing, team accounts, monthly reports |

- UPI payment with QR code display, transaction ID capture, and screenshot upload
- Cash-on-delivery option
- Manual verification workflow (admin verifies within 24 hours)
- Membership dashboard with active plan details, transaction history, and renewal management

**AI Customer Support (Monica)**
- Floating chat widget on all customer pages
- Quick action buttons: services/pricing, order tracking, membership benefits, pickup process
- Contextual responses using live service catalog and pricing data
- Conversation history maintained (last 6 messages as context window)
- Graceful fallback to rule-based responses when AI inference is unavailable

**Services Catalog**
- Category-grouped service listing
- Per-service display: base price, processing time, express availability, unit type (piece/kg/set)
- Direct booking links from service cards to order page with service pre-selected

### Admin Portal Features

**Dashboard**
- Real-time metrics: total orders, total revenue, active customers, staff count
- Month-over-month trend indicators with percentage changes
- Revenue and order volume charts
- Top-performing outlets ranking
- Order status distribution breakdown
- AI-powered 6-month forecast section with statistical confidence intervals

**Order Management**
- Filterable order list with status, date range, and search
- Order detail view with full item list, payment status, customer information
- Status update workflow with audit trail
- Internal notes for staff communication

**Staff Management**
- Staff directory with outlet assignment
- Role-based filtering (manager, cleaner, delivery agent)
- Active/inactive status management

**Outlet Management**
- Outlet directory with address, capacity, operating hours
- Contact information management
- Active/inactive toggling

**Customer Management**
- Customer list with lifetime value, total orders, and loyalty points
- Search and filtering capabilities

**Services Administration**
- CRUD operations for services (create, read, update, delete)
- Category management
- Pricing and express multiplier configuration
- Active/inactive toggling

**Reports and Forecasting**
- Monthly revenue trend analysis
- Order volume forecasting (6-month horizon)
- Customer acquisition trend
- AI-generated business insight narratives
- Yearly revenue projections (3-year horizon)

**Monica AI Assistant (Admin)**
- Admin-specific floating chat with live business context
- Quick actions: daily summary, revenue trends, outlet performance, order breakdown, staff overview
- RAG pipeline: SQL queries pull real metrics, injected into model context
- Monica Geller personality: organized, direct, data-driven responses
- Rule-based fallback with real data parsing for keyword-matched queries

### Staff Portal Features

**Authentication**
- Dedicated staff login and registration pages
- Role-based registration (staff accounts created with outlet assignment)
- Separated from customer authentication flow

---

## AI and Forecasting

### Statistical Forecasting Engine

The forecasting system is implemented in pure TypeScript with no external ML library dependencies. This was a deliberate choice: statistical time-series methods are well-understood, deterministic, and do not require a Python runtime or model serving infrastructure.

**Algorithms implemented:**

1. **Linear Regression** -- Extracts the secular trend from monthly data. Reports R-squared goodness-of-fit to quantify how well the trend line explains variance.

2. **Seasonality Detection** -- Detrends the data, computes average seasonal indices over a 12-month cycle. Flags seasonality as significant when seasonal variance exceeds 5% of the data mean.

3. **Holt's Linear Trend Exponential Smoothing** -- Two-parameter smoothing model (alpha=0.35 for level, beta=0.15 for trend). Generates 6-month forward forecasts that capture both level and trajectory.

4. **Confidence Intervals** -- 90% confidence bands (z=1.645) computed from residual standard deviation, widening by a factor of sqrt(1 + i * 0.15) for each step into the forecast horizon to reflect increasing uncertainty.

**Metrics forecasted:**
- Monthly revenue (from payment data)
- Monthly order volume
- Monthly new customer acquisition
- Yearly revenue (3-year projection)

### AI Chatbot Architecture

Both chatbots follow the same RAG (Retrieval-Augmented Generation) pattern:

```
User Message
     |
     v
[Retrieve Context]  -->  SQL queries pull live metrics/services/orders
     |
     v
[Build System Prompt]  -->  Context + persona instructions + formatting rules
     |
     v
[Generate Response]  -->  HuggingFace Inference API (or local fallback)
     |
     v
[Return to Client]
```

The critical design decision: **the AI never fabricates business data.** All numbers in AI responses originate from actual database queries injected into the prompt context. The model's role is to synthesize and narrate, not to calculate.

**Fallback system**: When the HuggingFace API is unavailable (rate limits, network issues, missing API key), both chatbots switch to a local rule-based response engine. This engine parses the same database context and responds to keyword patterns (e.g., "revenue" triggers a response using the actual revenue figure from the SQL context). The user experience degrades gracefully from fluid natural language to structured but accurate responses.

---

## API Surface

All API routes are implemented as Next.js Route Handlers under `/api/`.

### Order Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/orders` | Customer | Create order with items, addresses, and priority. Generates order number, calculates GST, assigns outlet. |
| GET | `/api/orders` | Customer | List authenticated user's orders with items, services, outlet, and payments. |
| GET | `/api/orders/[id]` | Customer | Single order detail with full relational data. |
| PATCH | `/api/orders/[id]` | Admin | Update order status with audit trail. |
| DELETE | `/api/orders/[id]` | Admin | Cancel/delete order. |

### Payment Processing

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/payments/create-intent` | Customer | Initialize payment for an order. |
| POST | `/api/payments/verify` | Admin | Verify a pending payment (manual workflow). |
| GET | `/api/payments/upi-details` | Public | Retrieve UPI account configuration for payment display. |

### Order Tracking

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/tracking/[orderNumber]` | Public | Retrieve order status, items, outlet info, and status history by order number. |

### Membership

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/memberships/plans` | Public | List all active membership plans with pricing and features. |
| POST | `/api/memberships/purchase` | Customer | Purchase or upgrade a membership plan. |
| GET | `/api/memberships/my-membership` | Customer | Retrieve authenticated user's active membership details. |

### Admin Operations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/orders` | Admin | Paginated order list with filters (status, date range, search). Supports complex multi-table joins. |
| GET | `/api/admin/metrics` | Admin | Precomputed dashboard metrics from MetricsSummary cache. |
| POST | `/api/admin/metrics/refresh` | Admin | Trigger recomputation of the MetricsSummary cache. |
| GET | `/api/admin/staff` | Admin | Staff directory with user and outlet relations. |
| GET | `/api/admin/team` | Admin | Team management data. |
| GET/POST | `/api/admin/services` | Admin | Service catalog CRUD. |
| PATCH/DELETE | `/api/admin/services/[id]` | Admin | Individual service update/deletion. |

### AI Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ai/chat` | Authenticated | Unified chat endpoint. `persona: "monica"` for admin context, `persona: "customer"` for customer support. |
| GET | `/api/ai/predictions` | Admin | Statistical forecasts + AI narrative. 10-minute in-memory cache. |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/[...nextauth]` | NextAuth.js handler (sign in, sign out, session). |
| POST | `/api/auth/register` | Customer registration with password hashing and auto-customer-profile creation. |
| POST | `/api/auth/register-portal` | Staff/admin registration with role and outlet assignment. |

### Services

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/services` | Public | Active services grouped by category with pricing. |

---

## Authentication and Authorization

### Role Hierarchy

The system defines 7 roles with increasing privilege:

```
customer            -- Place orders, track status, manage membership
business_client     -- Business customer (same as customer, reserved for B2B features)
staff               -- Process orders, update statuses (portal access)
outlet_manager      -- Supervise staff, manage outlet operations (portal access)
admin               -- Full operational access, add team members (portal access)
owner               -- Full access including financial data (portal access)
super_admin         -- Unrestricted system access (portal access)
```

### Session Strategy

JWT-based sessions via NextAuth.js. The JWT payload includes `id` and `role`, eliminating database lookups on every authenticated request. Token refresh is handled automatically by NextAuth's rotation mechanism.

### Auto-provisioning

On first login, a customer-role user automatically receives:
- A `Customer` profile linked to their `User` record
- 100 bonus loyalty points
- Association with the default `Organization` (created if it does not exist)

This eliminates a separate "profile setup" step and reduces friction in the onboarding funnel.

---

## Payment Infrastructure

### Current Implementation

The payment system is designed for the Indian market:

**UPI Payments** -- The primary payment method. The flow:
1. Customer selects UPI at checkout
2. System displays the merchant's UPI ID and QR code
3. Customer completes payment in their UPI app (Google Pay, PhonePe, Paytm, etc.)
4. Customer enters the UPI transaction ID and uploads a payment screenshot
5. Screenshot is stored in Appwrite Cloud Storage with a file ID linked to the `PaymentProof` record
6. Admin verifies the payment manually within 24 hours
7. Order status advances upon verification

**Cash on Delivery** -- Supported as a fallback. Payment is recorded as verified when the delivery agent confirms collection.

### Design Rationale

Manual UPI verification was chosen over automatic payment gateway integration (Razorpay, Stripe) for two reasons:
1. **Cost**: Payment gateways charge 1.5-2% per transaction. For a laundry business with thin margins on 200-800 INR orders, this is significant.
2. **Simplicity**: UPI is free for merchants in India. The manual verification step adds a small operational cost but eliminates gateway integration complexity and transaction fees entirely.

The schema retains `stripePaymentIntentId` and `paymentGateway` fields, allowing gateway integration as a future enhancement without schema migration.

---

## Deployment and Infrastructure

### Production Environment

| Component | Service | Configuration |
|-----------|---------|---------------|
| Application | Vercel | Automatic deployments from `main` branch. Edge runtime for static pages, Node.js runtime for API routes. |
| Database | DigitalOcean Managed MySQL | Single-node MySQL 8.0. SSL-enforced connections. Automated daily backups with 7-day retention. |
| File Storage | Appwrite Cloud (Singapore region) | Payment proof uploads. Bucket-level access control. |
| AI Inference | Hugging Face Inference API | Serverless model hosting. No GPU provisioning required. |

### Build Pipeline

```bash
prisma generate    # Generate type-safe database client
next build         # Compile all routes, pages, and API handlers
```

The build produces:
- 30 statically pre-rendered pages (served from CDN)
- 17 dynamic API routes (server-rendered on demand)

Build time: ~10 seconds on Vercel's infrastructure.

---

## Local Development Setup

### Prerequisites

- Node.js 18 or higher
- MySQL 8.0 instance (local or remote)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/cleanloop.git
cd cleanloop

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your database credentials and API keys
```

### Environment Variables

See `.env.example` for the complete list. The critical variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | MySQL connection string |
| `NEXTAUTH_SECRET` | Yes | JWT signing secret (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`) |
| `NEXTAUTH_URL` | Yes | Application URL (http://localhost:3000 for local) |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | Yes | Appwrite Cloud endpoint |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | Yes | Appwrite project identifier |
| `HF_TOKEN` | No | Hugging Face API token (AI features degrade gracefully without it) |

### Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (creates tables)
npm run db:push

# Seed with demonstration data
npm run db:seed
```

### Development Server

```bash
npm run dev
```

The application starts at `http://localhost:3000` with Turbopack hot module replacement.

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev --turbopack` | Start development server with Turbopack |
| `build` | `prisma generate && next build` | Production build |
| `start` | `next start` | Start production server |
| `lint` | `eslint` | Run ESLint |
| `db:generate` | `prisma generate` | Generate Prisma client |
| `db:push` | `prisma db push` | Push schema to database |
| `db:seed` | `tsx prisma/seed.ts` | Seed database |
| `db:studio` | `prisma studio` | Open Prisma Studio GUI |

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin/Owner | admin@cleanloop.com | admin123 |
| Customer | Format: customer_XXXX@email.com | password123 |

---

## Project Structure

```
cleanloop/
|
|-- app/                              # Next.js App Router
|   |-- page.tsx                      # Landing page
|   |-- layout.tsx                    # Root layout with providers
|   |-- globals.css                   # Global styles and Tailwind
|   |-- animations.css                # Custom keyframe animations
|   |
|   |-- (customer)/                   # Customer route group
|   |   |-- login/                    # Customer login
|   |   |-- register/                 # Customer registration
|   |   |-- order/                    # Order placement
|   |   |-- track/                    # Order tracking
|   |   |-- services/                 # Service catalog
|   |   |-- membership/               # Membership plans
|   |   |-- membership-dashboard/     # Active membership management
|   |
|   |-- (admin-portal)/               # Admin route group
|   |   |-- admin-portal/
|   |       |-- _components/          # AdminShell, MonicaChatbot
|   |       |-- dashboard/            # Analytics dashboard
|   |       |-- orders/               # Order management + detail view
|   |       |-- customers/            # Customer directory
|   |       |-- staff/                # Staff management
|   |       |-- outlets/              # Outlet management
|   |       |-- services/             # Service CRUD
|   |       |-- reports/              # Forecasting and reports
|   |       |-- register/             # Staff registration
|   |
|   |-- staff/                        # Staff auth pages
|   |   |-- login/
|   |   |-- register/
|   |
|   |-- api/                          # API Route Handlers
|       |-- auth/                     # NextAuth + registration
|       |-- orders/                   # Order CRUD
|       |-- payments/                 # Payment processing
|       |-- tracking/                 # Public order tracking
|       |-- services/                 # Service catalog
|       |-- memberships/              # Membership operations
|       |-- admin/                    # Admin-only endpoints
|       |-- ai/                       # Chat + predictions
|       |-- webhooks/                 # Stripe webhook (reserved)
|
|-- components/                       # Shared React components
|   |-- ui/                           # shadcn/ui primitives
|   |-- Footer.tsx                    # Site-wide footer
|   |-- CustomerChatbot.tsx           # Customer AI chat widget
|   |-- MonicaChatbot.tsx             # Admin AI chat widget
|   |-- CountUp.tsx                   # Animated number counter
|   |-- SessionProvider.tsx           # NextAuth session wrapper
|
|-- lib/                              # Shared utilities
|   |-- prisma.ts                     # Prisma client singleton
|   |-- auth.ts                       # NextAuth configuration
|   |-- appwrite.ts                   # File upload + email services
|   |-- huggingface.ts                # AI model client
|   |-- forecasting.ts                # Statistical forecasting engine
|   |-- stripe.ts                     # Stripe client (reserved)
|   |-- utils.ts                      # Tailwind merge utilities
|
|-- prisma/
|   |-- schema.prisma                 # Database schema (16 models)
|   |-- seed.ts                       # Data seeding script
|   |-- warmup-metrics.ts             # MetricsSummary cache builder
|
|-- types/                            # TypeScript type definitions
|   |-- database.ts                   # Database entity types
|   |-- membership.ts                 # Membership interface types
|
|-- public/                           # Static assets
|-- .env.example                      # Environment variable template
```

---

## Assumptions

The following assumptions were made during design and implementation. Each is documented here as a signal that these were conscious choices, not oversights.

1. **Single-city operation**: The system assumes all outlets are within one city. Inter-city logistics (hub-and-spoke routing, regional pricing) is not modeled. This is appropriate for the stated problem of a "local laundry business."

2. **Owner-operated, not franchise**: The multi-tenant `Organization` model exists in the schema, but the current implementation assumes a single organization. Franchise support (separate tenant data isolation, per-tenant billing) would require middleware-level tenant resolution.

3. **Indian market**: Currency is hardcoded to INR. UPI is the primary payment method. GST at 18% is applied automatically. These are configurable via environment variables but the UX is optimized for India.

4. **Manual payment verification is acceptable**: For a business processing hundreds of orders per day (not thousands per minute), a human verifying UPI screenshots within 24 hours is operationally feasible and eliminates payment gateway fees.

5. **Staff have smartphones**: The admin portal is responsive but optimized for desktop. Staff processing orders are assumed to have access to a computer or tablet at the outlet.

6. **Internet connectivity at all outlets**: The system is cloud-first with no offline capability. This is reasonable for urban Indian outlets where connectivity is reliable.

7. **Order volume projection**: The seeded dataset of 218K+ orders represents approximately 2 years of operation at 300 orders/day, which is realistic for a 10-outlet business in a mid-to-large Indian city.

---

## Scope Decisions

The following features were considered and deliberately excluded. Each exclusion is a judgment call, not a gap.

### Excluded: Real-time GPS Tracking for Delivery

**Why**: Real-time GPS tracking requires a mobile app for delivery agents, a WebSocket server for live location streaming, and significant battery/data consumption on the agent's device. For a laundry service (not a food delivery service), customers do not need minute-by-minute location. The 8-stage status pipeline provides sufficient visibility. The effort-to-value ratio does not justify the complexity.

### Excluded: Automated Payment Gateway Integration

**Why**: As discussed in the Payment Infrastructure section, UPI is free for merchants. Adding Razorpay/Stripe adds 1.5-2% per transaction cost and integration/maintenance complexity. The manual verification workflow is proportional to the business's current scale. The schema supports gateway integration when the business reaches a scale where manual verification becomes a bottleneck.

### Excluded: Native Mobile Application

**Why**: The web application is fully responsive and works on mobile browsers. A native app would require maintaining two additional codebases (iOS + Android) or adopting React Native, doubling development surface area. For a laundry service, there is no capability that requires native device APIs (camera for payment screenshots is accessible via the browser's file picker). Progressive Web App (PWA) would be a more proportionate next step.

### Excluded: Inventory Management

**Why**: Laundry businesses do not have traditional inventory in the retail sense. The "inventory" is the customer's garments, which are tracked through the order-item system with per-item statuses and barcodes. Consumable supplies (detergent, packaging) tracking is an operations concern that does not directly improve the customer experience problem stated in the brief.

### Excluded: Dynamic Pricing and Surge Pricing

**Why**: Unlike ride-sharing or food delivery, laundry demand is predictable and does not spike in real-time. Seasonal patterns are captured by the forecasting engine for planning purposes, but dynamic pricing would confuse customers and erode trust. Consistent, transparent pricing is a competitive advantage for a local service business.

### Excluded: Multi-language Support (i18n)

**Why**: For a single-city Indian operation, English is the pragmatic lingua franca for a digital product. Adding Hindi/regional language support would require translating all UI strings, handling RTL considerations for certain scripts, and maintaining translation files. It is important but is a localization effort, not a technology architecture decision.

---

## Trade-offs and Judgment Calls

### Monolith vs. Microservices

**Decision**: Monolith (Next.js full-stack).

**Reasoning**: The business has 10 outlets and 200K orders. This is not a scale that benefits from service decomposition. A monolith gives us: single deployment, shared types, atomic database transactions, and one monitoring surface. The risk of a monolith is coupling, but Next.js's file-based routing and module system provide sufficient separation of concerns. When (not if) the business grows to a scale requiring independent scaling of the order pipeline vs. the analytics system, the API routes are already isolated and can be extracted with minimal refactoring.

### Server-Side Rendering vs. Static Generation

**Decision**: Hybrid. 30 pages are statically generated; 17 routes are server-rendered.

**Reasoning**: Customer-facing pages (landing, services, membership plans) change infrequently and benefit from CDN caching. Admin pages and API routes require fresh data and server rendering. Next.js 16's App Router makes this a per-page decision rather than an architectural commitment.

### Prisma ORM vs. Raw SQL

**Decision**: Both. Prisma for CRUD and simple queries; raw SQL for aggregations.

**Reasoning**: Prisma provides type safety and prevents SQL injection for 90% of queries. But Prisma's `groupBy` generates suboptimal SQL for multi-table aggregations with date functions. For the dashboard metrics query (which joins orders, payments, customers, and outlets with monthly grouping), raw SQL executes in 200ms vs. 800ms+ through Prisma's query builder. The trade-off is accepted: raw SQL strings are less type-safe but are isolated to a few aggregation endpoints and the metrics warmup script.

### AI Model Selection

**Decision**: Hugging Face hosted inference (Zephyr-7B, Mistral-7B) with local fallback.

**Reasoning**: Self-hosting models would require GPU infrastructure (not justified for a laundry management demo). OpenAI/Anthropic APIs would provide better quality but introduce per-token costs that scale with usage. Hugging Face's free inference API provides adequate quality for the chatbot's purpose (navigating the product, summarizing metrics) while keeping the operational cost at zero. The local fallback ensures the product remains functional without any external AI dependency.

### Precomputed Metrics vs. Real-time Aggregation

**Decision**: Precomputed MetricsSummary cache with manual refresh.

**Reasoning**: At 218K orders, a dashboard query that computes total revenue, monthly trends, per-outlet breakdowns, and status distributions takes 3-5 seconds. This is unacceptable for a page load. The MetricsSummary table stores the result of this computation as a JSON blob, reducing dashboard load time to <50ms. The trade-off is data staleness: the dashboard shows data as of the last refresh, not the current second. For a laundry business, metrics that are 15-30 minutes stale are perfectly acceptable. An admin can trigger a manual refresh when needed.

---

## License

This project was built as a technical assessment submission. All code is original.

---

*Built with Next.js 16, React 19, TypeScript, Prisma, MySQL, and Hugging Face AI.*
