# MCRRC Race Series - Backend Setup Guide

## 🎯 Project Structure

You now have a full-stack React + TypeScript application ready for deployment on Vercel with Neon PostgreSQL.

```
apps/fe/
├── api/                    # Vercel API Functions
│   ├── runners/
│   │   └── index.ts       # GET/POST /api/runners
│   ├── races/
│   │   └── index.ts       # GET/POST /api/races  
│   ├── standings/
│   │   └── index.ts       # GET/POST /api/standings
│   └── series/            # (to be created)
├── lib/
│   └── db/
│       ├── connection.ts   # Neon database connection
│       ├── schema.sql     # PostgreSQL database schema
│       └── utils.ts       # Database operations
├── src/                   # Your existing React frontend
└── vercel.json           # Vercel deployment configuration
```

## 🗄️ Database Schema

### Tables Created:
- **series** - Race series information (2025 CS, 2026 CS, etc.)
- **runners** - Club member roster (person-level info)
- **series_registrations** - Links runners to bib numbers per series/year
- **races** - Individual race information 
- **race_results** - Results for each runner per race
- **series_standings** - Calculated championship standings
- **qualifying_races** - Tracks which races count for each runner

### Key Features:
- ✅ **UUID primary keys** for all tables
- ✅ **Proper indexes** for fast queries
- ✅ **Enum types** for gender and age groups
- ✅ **Time intervals** for race times (PostgreSQL native)
- ✅ **Automatic timestamps** with triggers
- ✅ **Foreign key constraints** for data integrity

## 🔄 Database Migrations
This project uses `node-pg-migrate` for managing database schema changes. All schema modifications should be done through migrations to ensure consistency across environments.

### Migration Commands:
```bash
# Apply all pending migrations
npm run migrate

# Create a new migration
npm run migrate:create -- migration-name

# Check migration status
npm run migrate:status

# Rollback last migration
npm run migrate:down

# Test migration (rollback and reapply)
npm run migrate:redo
```

### Initial Setup:
The initial schema migration (`1755199033000_initial-schema`) creates all tables, indexes, and constraints. This migration should be run once after database creation.

**⚠️ Important:** Always run migrations in both development and production before deploying new code that depends on schema changes.

For detailed migration usage, see [MIGRATIONS.md](./MIGRATIONS.md).

## 📡 API Endpoints

### Completed:
- `GET /api/runners` - Get all active runners
- `GET /api/races?year=2025` - Get races (optionally filtered by year)
- `GET /api/standings?year=2025&seriesId=uuid` - Get series standings

### TODO:
- `POST /api/runners` - Create new runners
- `POST /api/races` - Create new races
- `POST /api/standings/recalculate` - Recalculate standings
- Race results endpoints
- MCRRC scraping endpoints

## 🚀 Next Steps

### Phase 1: Database Setup (15 minutes)
1. **Create Neon Database**:
   - Go to [neon.tech](https://neon.tech) and create free account
   - Create new project: "mcrrc-race-series"
   - Copy connection string

2. **Set up Database**:
   - Run `lib/db/schema.sql` in Neon SQL Editor
   - This creates all tables and initial 2025 series

3. **Configure Environment**:
   - Copy `env.example` to `.env.local`
   - Add your DATABASE_URL from Neon

### Phase 2: Deploy to Vercel (10 minutes)
1. **Connect GitHub**:
   - Push code to GitHub
   - Connect repository to Vercel
   
2. **Set Environment Variables**:
   - In Vercel dashboard, add DATABASE_URL
   - Deploy automatically triggers

### Phase 3: Test API (5 minutes)
1. **Test Endpoints**:
   ```bash
   curl https://your-app.vercel.app/api/runners
   curl https://your-app.vercel.app/api/races
   curl https://your-app.vercel.app/api/standings?year=2025
   ```

### Phase 4: Connect Frontend (30 minutes)
1. **Replace Mock Data**:
   - Update `src/contexts/DataContext.tsx`
   - Replace `loadMockData()` with API calls
   - Add loading states and error handling

## 💡 Architecture Benefits

### Vercel + Neon Stack:
- **$0 cost** to start (free tiers)
- **Automatic scaling** - handles traffic spikes
- **Global edge network** - fast worldwide
- **Zero DevOps** - no servers to manage
- **PostgreSQL native** - no ORM complexity
- **TypeScript end-to-end** - type safety

### Performance Optimizations:
- **Database indexes** on all query paths
- **Serverless functions** - cold start optimized  
- **Connection pooling** via Neon
- **CORS enabled** for development

## 🔧 Local Development

```bash
# Install dependencies (already done)
npm install

# Start frontend dev server
npm run dev

# Test API locally (after Vercel CLI setup)
vercel dev
```

## 📚 Resources

- [Neon Documentation](https://neon.tech/docs)
- [Vercel Functions](https://vercel.com/docs/functions)
- [MCRRC Championship Series Rules](https://mcrrc.org/club-race-series/championship-series-cs/)

---

**Ready for the next step?** Let me know when you want to:
1. Set up the Neon database
2. Deploy to Vercel  
3. Connect the frontend to real API
4. Add MCRRC scraping functionality
