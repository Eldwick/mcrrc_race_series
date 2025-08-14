#!/bin/bash

# MCRRC Race Series Deployment Script
# This script helps deploy to Vercel and run migrations

set -e

echo "🚀 MCRRC Race Series Deployment Script"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

# Check if DATABASE_URL is set for migration
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set. Migration will be skipped."
    echo "   Set DATABASE_URL to run migrations locally first."
else
    echo "✅ DATABASE_URL is set"
fi

echo ""
echo "Step 1: Building project locally..."
npm run build
echo "✅ Local build successful"

echo ""
echo "Step 2: Committing changes..."
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Uncommitted changes found. Committing..."
    git add -A
    git commit -m "🚀 Deploy: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "✅ Changes committed"
else
    echo "✅ No uncommitted changes"
fi

echo ""
echo "Step 3: Pushing to GitHub..."
git push origin main
echo "✅ Pushed to GitHub"

echo ""
echo "Step 4: Vercel will auto-deploy from GitHub"
echo "👀 Check your Vercel dashboard for deployment status"
echo ""

echo "🔄 Next Steps After Deployment:"
echo "================================"
echo "1. Wait for Vercel deployment to complete"
echo "2. Add environment variables in Vercel:"
echo "   - DATABASE_URL=your_neon_connection_string" 
echo "   - MIGRATION_SECRET=your_secure_secret"
echo "3. Test health check: https://your-app.vercel.app/api/health"
echo "4. Run migrations: POST to https://your-app.vercel.app/api/migrate"
echo "   Body: {\"secret\": \"your_migration_secret\"}"
echo ""

if [ -n "$DATABASE_URL" ]; then
    echo "🔧 Run migrations locally first? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "🔄 Running migrations locally..."
        npm run migrate
        echo "✅ Local migrations complete"
    fi
fi

echo ""
echo "🎉 Deployment script complete!"
echo "Check Vercel dashboard and follow the next steps above."
