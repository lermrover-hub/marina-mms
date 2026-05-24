# Marina MMS - Ocean Rover Marina & Boat Yard Management System

A full-stack business management platform for marina, wet berth, dry storage, boat ramp, launch/retrieval, boat yard repair, quotation, billing, inventory, and customer portal operations.

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript
- **Backend**: Next.js API Routes / Server Actions
- **Database**: PostgreSQL via Supabase
- **ORM**: Prisma
- **Auth**: Supabase Auth
- **Styling**: Tailwind CSS
- **Deployment**: Docker / Vercel

## Core Modules

- Dashboard (Executive, Marina Occupancy, Boat Yard, Finance, Operations)
- Customer CRM
- Boat Database
- Wet Berth / Dry Storage Management
- Ramp Booking & Tide Safety Calculation
- Boat Yard Repair Management (Service Request → Work Order → Completion)
- Pricing & Quotation
- Invoice & Payment
- Inventory & Procurement
- Staff Task Management
- Safety / Incident Report
- Reports & Analytics
- Customer Portal
- System Settings

## Key Business Rules

- Each boat must have one current active location.
- Each quotation must link to customer and boat where applicable.
- Accepted quotation can convert to work order, invoice, or contract.
- Work order tracks tasks, labor, material, contractor, photos, cost, and margin.
- Payment updates invoice balance and status.
- Launch/retrieval operation must check tide safety.

## Tide Safety Formula

```
Minimum Required Actual Depth = Boat Draft + Trailer/Support Frame Height + Safety Clearance
Required Tide Table Height = Minimum Required Actual Depth - Ramp Depth Offset
Default Ramp Depth Offset = -1.00 m
```

A time slot is SAFE when: `Predicted Tide Height >= Required Tide Table Height`

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (or Supabase account)
- Docker (optional)

### Installation

```bash
npm install
```

### Environment Setup

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_database_url
```

### Database Setup

```bash
npx prisma migrate dev
npx prisma generate
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker

```bash
docker-compose up --build
```

## Project Structure

```
/app              # Next.js App Router pages and API routes
/components       # Reusable UI components
/hooks            # Custom React hooks
/lib              # Utility libraries and helpers
/prisma           # Database schema and migrations
/public           # Static assets
/types            # TypeScript type definitions
/docs             # Project documentation
/scripts          # Utility scripts
```

## License

Private - All rights reserved.
