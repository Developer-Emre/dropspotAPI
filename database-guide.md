# PostgreSQL Database Setup - Development Environment

## Quick Start
```bash
# 1. Start PostgreSQL container
docker-compose up -d postgres

# 2. Install dependencies & setup database
npm install
npm run db:generate
npm run db:migrate

# 3. Start development server
npm run dev
```

## Database Connection
```env
DATABASE_URL="postgresql://dropspot:dev_password_123@localhost:5432/dropspot"
```

## Essential Commands

### Container Management
```bash
# Start/stop PostgreSQL
docker-compose up -d postgres
docker-compose stop postgres

# View logs
docker-compose logs postgres

# Access PostgreSQL shell
docker-compose exec postgres psql -U dropspot -d dropspot
```

### Database Operations
```bash
# After schema changes
npm run db:generate
npm run db:migrate

# Reset database (destroys all data)
npx prisma migrate reset

# Open database GUI
npx prisma studio
```

### Development Workflow
```bash
# Seed database with test data
npm run db:seed

# Generate project-specific seed
npx tsx src/scripts/generateSeed.ts
```

## Environment Variables
```env
# Required in .env file
DATABASE_URL="postgresql://dropspot:dev_password_123@localhost:5432/dropspot"
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-dropspot-2025
JWT_EXPIRES_IN=7d
```

## Troubleshooting

### Port 5432 Already in Use
```bash
# Check what's using the port
lsof -i :5432
sudo kill -9 <PID>
```

### Container Issues
```bash
# Restart container
docker-compose down postgres
docker-compose up -d postgres

# Check logs for errors
docker-compose logs postgres
```

### Migration Problems
```bash
# Check migration status
npx prisma migrate status

# Nuclear option - complete reset
npx prisma migrate reset
```

## Performance Notes
- Optimized for development (not production settings)
- `pg_stat_statements` enabled for query analysis
- Connection limits suitable for local development

## Backup (Optional)
```bash
# Create backup
docker-compose exec postgres pg_dump -U dropspot dropspot > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U dropspot dropspot < backup.sql
```
