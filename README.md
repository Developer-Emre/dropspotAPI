# DropSpot API

**Project Start:** November 6, 2025 - 14:30 UTC

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

### Error Testing

```bash
# 404 Error
curl http://localhost:3000/non-existent

# Authentication Error  
curl -X POST http://localhost:3000/drops/123/claim
```


**Developer:** Emre Sarıgül  

