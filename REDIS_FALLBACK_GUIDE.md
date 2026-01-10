# Redis Configuration and Graceful Fallback

## Overview

The application includes an intelligent Redis handler that ensures the app continues to function perfectly even if Redis is unavailable or fails. This document explains how it works and what to expect.

## How It Works

### Automatic Fallback Strategy

The Redis wrapper (`lib/redis.ts`) implements a **graceful degradation** pattern:

1. **Redis Available**: Uses Redis for caching, rate limiting, and session storage
2. **Redis Unavailable**: Falls back to in-memory operations without disrupting the app
3. **No Configuration**: If Redis URL is not configured, operates in fallback mode from the start

### What Happens Without Redis?

When Redis is unavailable, the following fallbacks are activated:

- ✅ **Rate Limiting**: Uses in-memory rate limiting (per server instance)
- ✅ **Caching**: Cache operations silently skip without errors
- ✅ **Sessions**: Falls back to NextAuth's built-in session management
- ✅ **Counters**: Returns default values without errors
- ✅ **API Requests**: All API endpoints continue to work normally

### Logging and Monitoring

The system provides clear visibility into Redis status:

```
✅ Redis Client Connected       # When Redis is working
⚠️  Redis URL not configured    # When Redis is not set up
⚠️  Redis connection failed     # When Redis is unreachable
```

## Configuration

### Enable Redis

To enable Redis caching and rate limiting, uncomment the Redis URL in `.env`:

```env
REDIS_URL="redis://your-redis-url:port"
```

### Disable Redis

To run without Redis (using in-memory fallbacks), either:

1. Comment out the `REDIS_URL` in `.env`:

   ```env
   # REDIS_URL="redis://your-redis-url:port"
   ```

2. Remove the `REDIS_URL` variable entirely

3. Leave it blank:
   ```env
   REDIS_URL=""
   ```

## Health Check API

Check the status of Redis and other services:

```bash
curl http://localhost:3000/api/health
```

Response example:

```json
{
  "timestamp": "2026-01-10T12:00:00.000Z",
  "status": "degraded",
  "services": {
    "database": {
      "status": "healthy",
      "message": "Database connection successful"
    },
    "redis": {
      "status": "degraded",
      "message": "Redis is not configured. Running with in-memory fallbacks.",
      "available": false,
      "connected": false
    },
    "application": {
      "status": "healthy",
      "message": "Application is running",
      "mode": "in-memory-fallback"
    }
  }
}
```

## Features with Fallbacks

### 1. Rate Limiting

**With Redis**: Distributed rate limiting across all server instances
**Without Redis**: Per-instance in-memory rate limiting

All rate-limited endpoints continue to work:

- `/api/auth/signup` - Signup rate limiting
- `/api/auth/login` - Login attempt limiting
- `/api/wallet/*` - Transaction rate limiting
- `/api/tips/*` - Tip access rate limiting

### 2. Caching

**With Redis**: Persistent caching across requests and instances
**Without Redis**: No caching (fresh data on every request)

Cached data:

- Tips and predictions
- User wallets
- API responses

### 3. Session Storage

**With Redis**: Optional Redis-backed session storage
**Without Redis**: NextAuth's default session storage (JWT or database)

## Production Recommendations

### For Small to Medium Apps

- Redis is **optional**
- In-memory fallbacks work well for single-instance deployments
- Consider Redis when scaling to multiple instances

### For Large Scale Apps

- Redis is **recommended** but not required
- Provides better rate limiting across instances
- Improves performance with caching
- The app will still function if Redis goes down

## Troubleshooting

### Error: "Redis Client Error: ENOTFOUND"

**Solution**: This error indicates Redis is unreachable. The app will automatically fall back to in-memory operations. To resolve:

1. Check if Redis URL is correct
2. Verify Redis server is running
3. Or disable Redis by commenting out `REDIS_URL` in `.env`

### App is slow without Redis

This is expected. Without Redis:

- No caching means more database queries
- Fresh data on every request

**Solutions**:

1. Set up a Redis instance (recommended)
2. Accept the trade-off (works fine for low traffic)
3. Implement application-level caching if needed

### Rate limiting not working across instances

Without Redis, rate limiting is per-instance only. Each server instance tracks limits independently.

**Solution**: Enable Redis for distributed rate limiting

## Files Modified

- `lib/redis.ts` - Main Redis wrapper with fallback logic
- `lib/redis-health.ts` - Health check utilities
- `app/api/health/route.ts` - Health check endpoint
- `.env` - Redis URL configuration

## Testing

Test Redis fallback behavior:

```bash
# 1. Start app without Redis
# Comment out REDIS_URL in .env
pnpm dev

# 2. Check health endpoint
curl http://localhost:3000/api/health

# 3. Test signup (should work without Redis)
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","displayName":"Test User"}'

# 4. Verify in logs - should see "⚠️  Redis URL not configured"
```

## Benefits of This Approach

1. ✅ **Zero Downtime**: Redis failures don't break the app
2. ✅ **Easy Development**: Can develop without Redis setup
3. ✅ **Flexible Deployment**: Deploy with or without Redis
4. ✅ **Clear Visibility**: Logs show Redis status clearly
5. ✅ **Production Ready**: Gracefully handles Redis outages
