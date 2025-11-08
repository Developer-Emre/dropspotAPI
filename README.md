# DropSpot API

**Project Start:** November 6, 2025 - 14:30 

A scalable backend API for limited stock drop platform with waitlist management and priority-based claiming system.

## Overview

DropSpot enables fair distribution of limited stock items through a waitlist and claim window system. Users join waitlists, get priority scores, and claim items during designated windows.

**Key Features:**
- JWT authentication with role-based access
- Admin CRUD for drop management  
- Idempotent waitlist operations
- Seed-based priority scoring
- Transaction-safe claim system

## Tech Stack

- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL, Prisma ORM
- **Auth:** JWT, bcrypt
- **Security:** CUID identifiers, rate limiting

## API Endpoints

| Group | Method | Endpoint | Description |
|-------|--------|----------|-------------|
| **Auth** | POST | `/auth/signup` | User registration |
| | POST | `/auth/login` | User login |
| **Public** | GET | `/drops` | List active drops |
| **Waitlist** | POST | `/drops/:id/join` | Join waitlist |
| | POST | `/drops/:id/leave` | Leave waitlist |
| | GET | `/drops/:id/waitlist` | Check status |
| **Claims** | POST | `/drops/:id/claim` | Claim drop |
| | GET | `/drops/:id/claim/status` | Check claim |
| | PUT | `/drops/:id/claim/complete` | Complete claim |
| | GET | `/my-claims` | User claims |
| **Admin** | POST/GET/PUT/DELETE | `/admin/drops/*` | Full CRUD |

## Data Model

```sql
Users (id, email, name, surname, passwordHash, role, timestamps)
Drops (id, title, description, imageUrl, totalStock, claimedStock, startDate, endDate, claimWindowStart, claimWindowEnd)
WaitlistEntries (id, userId, dropId, priorityScore, timestamps)
Claims (id, userId, dropId, claimCode, status, claimedAt, expiresAt)
```

## Admin CRUD Module

Complete drop management with JWT authentication and admin role validation.
Safety checks prevent deletion of drops with active waitlists/claims.
All operations are transaction-based for data consistency.

## Idempotency & Transactions

All operations are idempotent and transaction-safe.
Multiple join/leave requests return consistent results.
Database transactions ensure automatic rollback on errors.

## Seed Generation & Priority System

**Seed:** SHA256 hash of `remote_url|first_commit|start_time` → first 12 chars
**Priority:** `1000 + (latency % A) + (account_age % B) - (rapid_actions % C)`
Where A, B, C are derived from seed hex values for fairness.

## Key Features

- **Admin CRUD**: Full drop management
- **Waitlist System**: Priority-based with fair seeding
- **Claim System**: 24h expiry with completion tracking
- **Idempotent Operations**: Transaction-based safety
- **JWT Authentication**: Role-based access control

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 13+

### Installation

```bash
git clone https://github.com/Developer-Emre/dropspotAPI.git
cd dropspotAPI
npm install
cp .env.example .env
```

### Environment

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/dropspot_db"
JWT_SECRET="your-secret-key-min-32-chars"
PORT=3000
```

### Database

```bash
createdb dropspot_db
npx prisma migrate dev --name init
npx prisma generate
```

```bash
npm run dev
```

## Testing

Unit tests (services, utilities), Integration tests (API endpoints), Idempotency tests.

```bash
npm test                 # Run all tests
npm run test:coverage    # Coverage report
```

## Technical Choices

**Node.js + TypeScript:** Strong typing and async handling
**Prisma + PostgreSQL:** Type-safe operations and ACID compliance
**Express + JWT:** Lightweight framework with secure authentication

## Personal Contributions

1. **Custom Seed Algorithm:** Fair priority using git history + timestamps
2. **Comprehensive Error System:** Production-ready structured error handling
3. **Idempotency Architecture:** Transaction-safe concurrent operations
4. **Security-First Design:** CUID identifiers + role-based access
---

## Error Handling

✅ **Production-ready error handling system**
- Global error handler with structured responses
- Prisma error mapping (P2002, P2025, etc.)
- JWT authentication error handling
- Custom AppError classes with proper HTTP codes
- Async error catching with middleware wrapper
- Development vs production error details

### Health Check

```bash
curl http://localhost:3000/health
```

**Developer:** Emre Sarıgül
**Repository:** [DropSpot API](https://github.com/Developer-Emre/dropspotAPI)