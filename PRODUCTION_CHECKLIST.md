# 🚀 Production Deployment Checklist

## Phase 1: Database Setup (10 minutes)

### ✅ Neon Database
- [ ] Create account at https://neon.tech
- [ ] Create project: "mcrrc-race-series"
- [ ] Copy connection string to clipboard

### ✅ Run Database Migrations
- [ ] Set local environment: `DATABASE_URL="your_neon_connection_string"`
- [ ] Run migration: `npm run migrate`
- [ ] Verify setup in Neon console: `SELECT * FROM series;` shows 2025 series

**Note:** This runs the initial schema migration which creates all tables, indexes, and seed data.

## Phase 2: Vercel Deployment (8 minutes)

### ✅ GitHub Connection
- [ ] Go to https://vercel.com
- [ ] Sign up with GitHub
- [ ] Import "mcrrc_race_series" repository
- [ ] Set framework: "Vite"
- [ ] Set root directory: "apps/fe"

### ✅ Environment Variables
Add these in Vercel → Settings → Environment Variables:
```
DATABASE_URL=your_neon_connection_string
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-app.vercel.app/api
MCRRC_BASE_URL=https://mcrrc.org
```

### ✅ Deploy
- [ ] Click "Deploy"
- [ ] Wait for build completion
- [ ] Note production URL

## Phase 3: Testing (5 minutes)

### ✅ API Endpoints
Test these URLs (replace with your domain):
- [ ] `https://your-app.vercel.app/api/runners`
- [ ] `https://your-app.vercel.app/api/races`
- [ ] `https://your-app.vercel.app/api/standings?year=2025`

### ✅ Frontend
- [ ] Homepage loads
- [ ] Leaderboard shows (empty initially)
- [ ] Runners page loads
- [ ] Races page loads
- [ ] No console errors

## Phase 4: Post-Deployment (Next steps)

### ✅ Data Population
- [ ] Add initial runners to database
- [ ] Add initial races
- [ ] Import/scrape first race results
- [ ] Test standings calculation

### ✅ Domain Setup (Optional)
- [ ] Purchase domain (e.g., mcrrc-series.com)
- [ ] Configure in Vercel → Domains
- [ ] Update environment variables

## 🔧 Troubleshooting

### Common Issues:
1. **API 500 errors**: Check DATABASE_URL is correct
2. **Build failures**: Verify all dependencies in package.json
3. **CORS errors**: Check API CORS headers
4. **Database connection**: Test in Neon dashboard first

### Debug Commands:
```bash
# Check deployment logs
vercel logs your-deployment-url

# Test database connection locally
node -e "require('./lib/db/connection.js').testConnection()"
```

## 📊 Expected Costs

### Free Tier Limits:
- **Neon**: 0.5GB storage, 5 compute hours/month
- **Vercel**: 100GB bandwidth, 6,000 minutes build time

### Paid Scaling:
- **Neon Pro**: $19/month (when you exceed free tier)
- **Vercel Pro**: $20/month (team features, more bandwidth)
- **Total**: ~$0-40/month (well under $50 budget)

## 🎯 Success Criteria

✅ **Deployment Complete** when:
- Frontend loads at production URL
- All API endpoints return 200 (even if empty data)
- Database connection works
- No build/runtime errors
- Ready for data import

---

**Next Phase**: Connect frontend to real API and populate initial data!

