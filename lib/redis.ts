import { createClient } from "redis";

declare global {
  // Using a broad type to avoid conflicts between multiple RedisClientType versions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var __redis: any | undefined;
  var __redisHealthy: boolean | undefined;
}

// Track Redis health status
let isRedisHealthy = globalThis.__redisHealthy ?? true;

const createRedisClient = () => {
  // Check if Redis URL is configured
  if (!process.env.REDIS_URL || process.env.REDIS_URL.trim() === "") {
    console.warn(
      "⚠️  Redis URL not configured - running without Redis caching"
    );
    isRedisHealthy = false;
    return null;
  }

  try {
    const client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.warn(
              "⚠️  Redis connection failed after 10 retries - falling back to in-memory operations"
            );
            isRedisHealthy = false;
            return false; // Stop reconnection attempts
          }
          return Math.min(retries * 50, 500);
        },
        connectTimeout: 5000, // 5 second timeout
      },
    });

    client.on("error", (error) => {
      console.error("Redis Client Error:", error);
      isRedisHealthy = false;
      // Don't crash the app on Redis errors
    });

    client.on("connect", () => {
      console.log("✅ Redis Client Connected");
      isRedisHealthy = true;
    });

    client.on("ready", () => {
      console.log("✅ Redis Client Ready");
      isRedisHealthy = true;
    });

    client.on("end", () => {
      console.log("⚠️  Redis connection ended");
      isRedisHealthy = false;
    });

    return client;
  } catch (error) {
    console.error("Failed to create Redis client:", error);
    isRedisHealthy = false;
    return null;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const redis: any = globalThis.__redis || createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__redis = redis;
  globalThis.__redisHealthy = isRedisHealthy;
}

// Helper to check if Redis is available and connected
async function isRedisAvailable(): Promise<boolean> {
  if (!redis || !isRedisHealthy) return false;

  try {
    if (!redis.isOpen) {
      await redis.connect();
    }
    return redis.isReady;
  } catch {
    isRedisHealthy = false;
    return false;
  }
}

// Cache helpers with graceful fallback
export const cacheHelpers = {
  // Get cached value
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!(await isRedisAvailable())) {
        return null; // Silently return null if Redis unavailable
      }

      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  },

  // Set cache value with optional TTL (seconds)
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      if (!(await isRedisAvailable())) {
        return; // Silently skip if Redis unavailable
      }

      const serialized = JSON.stringify(value);
      if (ttl) {
        await redis.setEx(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }
    } catch (error) {
      console.error("Cache set error:", error);
      // Don't throw - continue without caching
    }
  },

  // Delete cache value
  async del(key: string): Promise<void> {
    try {
      if (!(await isRedisAvailable())) {
        return;
      }

      await redis.del(key);
    } catch (error) {
      console.error("Cache delete error:", error);
    }
  },

  // Clear all cache with matching pattern
  async clearPattern(pattern: string): Promise<void> {
    try {
      if (!(await isRedisAvailable())) {
        return;
      }

      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (error) {
      console.error("Cache clear pattern error:", error);
    }
  },
};

// Rate limiting helper with in-memory fallback
const inMemoryRateLimits = new Map<
  string,
  { count: number; resetTime: number }
>();

export const rateLimit = {
  async check(
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}`;
    const windowSec = Math.ceil(windowMs / 1000);
    const now = Date.now();

    try {
      // Try Redis first
      if (await isRedisAvailable()) {
        const current = await redis.incr(key);

        if (current === 1) {
          await redis.expire(key, windowSec);
        }

        const remaining = Math.max(0, limit - current);
        const allowed = current <= limit;
        const ttl = await redis.ttl(key);
        const resetTime = Date.now() + ttl * 1000;

        return { allowed, remaining, resetTime };
      }
    } catch (error) {
      console.error(
        "Rate limit check error (falling back to in-memory):",
        error
      );
    }

    // Fallback to in-memory rate limiting
    const record = inMemoryRateLimits.get(key);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      inMemoryRateLimits.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: now + windowMs,
      };
    }

    if (record.count < limit) {
      record.count++;
      return {
        allowed: true,
        remaining: limit - record.count,
        resetTime: record.resetTime,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  },
};

// Session storage helper with graceful fallback
export const sessionStore = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getSession(sessionId: string): Promise<any | null> {
    if (!(await isRedisAvailable())) {
      return null;
    }
    return cacheHelpers.get(`session:${sessionId}`);
  },

  async setSession(
    sessionId: string,
    // Accept arbitrary serializable session data
    sessionData: Record<string, unknown>,
    ttl: number = 86400
  ): Promise<void> {
    if (!(await isRedisAvailable())) {
      return;
    }
    return cacheHelpers.set(`session:${sessionId}`, sessionData, ttl);
  },

  async deleteSession(sessionId: string): Promise<void> {
    if (!(await isRedisAvailable())) {
      return;
    }
    return cacheHelpers.del(`session:${sessionId}`);
  },

  async refreshSession(sessionId: string, ttl: number = 86400): Promise<void> {
    try {
      if (!(await isRedisAvailable())) {
        return;
      }
      await redis.expire(`session:${sessionId}`, ttl);
    } catch (error) {
      console.error("Session refresh error:", error);
    }
  },
};

// Real-time counters with graceful fallback
export const counters = {
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      if (!(await isRedisAvailable())) {
        return 0;
      }
      return await redis.incrBy(key, amount);
    } catch (error) {
      console.error("Counter increment error:", error);
      return 0;
    }
  },

  async decrement(key: string, amount: number = 1): Promise<number> {
    try {
      if (!(await isRedisAvailable())) {
        return 0;
      }
      return await redis.decrBy(key, amount);
    } catch (error) {
      console.error("Counter decrement error:", error);
      return 0;
    }
  },

  async get(key: string): Promise<number> {
    try {
      if (!(await isRedisAvailable())) {
        return 0;
      }
      const value = await redis.get(key);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      console.error("Counter get error:", error);
      return 0;
    }
  },

  async set(key: string, value: number): Promise<void> {
    try {
      if (!(await isRedisAvailable())) {
        return;
      }
      await redis.set(key, value.toString());
    } catch (error) {
      console.error("Counter set error:", error);
    }
  },

  async expire(key: string, ttl: number): Promise<void> {
    try {
      if (!(await isRedisAvailable())) {
        return;
      }
      await redis.expire(key, ttl);
    } catch (error) {
      console.error("Counter expire error:", error);
    }
  },
};

// Initialize Redis connection with error handling
export async function initializeRedis(): Promise<void> {
  try {
    if (!redis) {
      console.log("⚠️  Redis client not initialized - running without Redis");
      return;
    }

    if (!redis.isOpen) {
      await redis.connect();
      console.log("✅ Redis initialized successfully");
    }
  } catch (error) {
    console.warn(
      "⚠️  Failed to initialize Redis - falling back to in-memory operations:",
      error
    );
    isRedisHealthy = false;
  }
}

// Health check
export async function checkRedisHealth(): Promise<boolean> {
  try {
    if (!redis || !isRedisHealthy) {
      return false;
    }

    await redis.ping();
    isRedisHealthy = true;
    return true;
  } catch (error) {
    console.error("Redis health check failed:", error);
    isRedisHealthy = false;
    return false;
  }
}

// Get Redis status for monitoring
export function getRedisStatus(): { connected: boolean; healthy: boolean } {
  return {
    connected: redis?.isOpen ?? false,
    healthy: isRedisHealthy,
  };
}

// Graceful shutdown
process.on("beforeExit", async () => {
  try {
    if (redis?.isOpen) {
      await redis.quit();
      console.log("✅ Redis connection closed gracefully");
    }
  } catch (error) {
    console.error("Error closing Redis connection:", error);
  }
});

export { redis };
export default redis;
