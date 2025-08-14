# Database Migrations Guide

This project uses `node-pg-migrate` for managing PostgreSQL database schema changes through migrations.

## Prerequisites

- PostgreSQL database (we use Neon for production)
- `DATABASE_URL` environment variable set

## Available Commands

```bash
# Run all pending migrations (apply schema changes)
npm run migrate

# Roll back the last migration
npm run migrate:down

# Create a new migration file
npm run migrate:create -- migration-name

# Check migration status (shows what would run)
npm run migrate:status

# Roll back and then re-apply the last migration (for testing)
npm run migrate:redo
```

## Creating Migrations

### Method 1: Automatic Creation (JavaScript)
```bash
npm run migrate:create -- add-new-table
```
This creates a JavaScript migration file that you can edit.

### Method 2: Manual SQL Creation (Preferred)
For complex schema changes, create SQL files manually:

1. Generate timestamp: `echo "$(date +%s)000"`
2. Create two files:
   - `migrations/{timestamp}_migration-name.up.sql` - Changes to apply
   - `migrations/{timestamp}_migration-name.down.sql` - Changes to rollback

Example:
```sql
-- migrations/1755199033000_add-user-preferences.up.sql
ALTER TABLE runners ADD COLUMN preferences JSONB DEFAULT '{}';

-- migrations/1755199033000_add-user-preferences.down.sql
ALTER TABLE runners DROP COLUMN IF EXISTS preferences;
```

## Migration Rules

1. **Never edit existing migration files** - Once a migration has been run, create a new one to make changes
2. **Always create down migrations** - Every up migration should have a corresponding rollback
3. **Test your migrations** - Run `migrate:redo` to test both up and down migrations
4. **Keep migrations atomic** - One logical change per migration
5. **Be careful with data migrations** - Always backup before running data-changing migrations

## Environment Setup

### Local Development
```bash
# In .env.local
DATABASE_URL=postgresql://[username]:[password]@localhost:5432/mcrrc_dev
```

### Production (Vercel + Neon)
Set `DATABASE_URL` in Vercel dashboard environment variables.

## Common Migration Patterns

### Adding a Column
```sql
-- Up
ALTER TABLE runners ADD COLUMN middle_name VARCHAR(50);

-- Down
ALTER TABLE runners DROP COLUMN IF EXISTS middle_name;
```

### Creating an Index
```sql
-- Up
CREATE INDEX idx_runners_email ON runners(email);

-- Down
DROP INDEX IF EXISTS idx_runners_email;
```

### Adding a Foreign Key
```sql
-- Up
ALTER TABLE race_results ADD COLUMN team_id UUID REFERENCES teams(id);

-- Down
ALTER TABLE race_results DROP COLUMN IF EXISTS team_id;
```

### Data Migration
```sql
-- Up
UPDATE runners SET club = 'MCRRC' WHERE club IS NULL;

-- Down
-- Be very careful with data rollbacks!
-- Consider: UPDATE runners SET club = NULL WHERE club = 'MCRRC';
```

## Troubleshooting

### Migration Fails
1. Check the error message carefully
2. Verify your SQL syntax
3. Check for foreign key constraint violations
4. Ensure required data exists

### Need to Skip a Migration
```bash
# Mark migration as run without executing (dangerous!)
node-pg-migrate mark-as-run --migration-number XXXXXXXXX_migration-name
```

### Reset All Migrations (Development Only)
```bash
# Drop all tables and start fresh
npm run migrate:down -- 0
npm run migrate
```

## Integration with Development Workflow

1. **Before starting new features**: Run `npm run migrate` to ensure your local DB is up-to-date
2. **After creating migrations**: Test with `npm run migrate:redo`
3. **Before deploying**: Ensure all migrations run successfully in staging
4. **Production deployment**: Migrations run automatically via deployment scripts

## Schema Changes Workflow

1. Create migration: `npm run migrate:create -- descriptive-name`
2. Edit the migration files (up/down)
3. Test locally: `npm run migrate:redo`
4. Commit migration files with your code changes
5. Deploy (migrations run automatically)

## Best Practices

- Use descriptive migration names
- Include comments in complex migrations
- Test rollbacks in development
- Keep migrations small and focused
- Never mix schema and data changes in the same migration
- Always use transactions for data migrations
