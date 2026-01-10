/**
 * Redis Health Check and Monitoring Utility
 *
 * This utility provides health check endpoints and monitoring
 * for Redis connectivity without disrupting application functionality
 */

import { getRedisStatus, checkRedisHealth } from "./redis";

export interface RedisHealthStatus {
  available: boolean;
  connected: boolean;
  healthy: boolean;
  message: string;
  timestamp: string;
}

/**
 * Get comprehensive Redis health status
 */
export async function getRedisHealthStatus(): Promise<RedisHealthStatus> {
  const status = getRedisStatus();

  // If Redis is not configured
  if (!process.env.REDIS_URL || process.env.REDIS_URL.trim() === "") {
    return {
      available: false,
      connected: false,
      healthy: false,
      message: "Redis is not configured. Running with in-memory fallbacks.",
      timestamp: new Date().toISOString(),
    };
  }

  // If Redis client exists but not connected
  if (!status.connected) {
    return {
      available: true,
      connected: false,
      healthy: false,
      message:
        "Redis client exists but not connected. Using in-memory fallbacks.",
      timestamp: new Date().toISOString(),
    };
  }

  // Try to ping Redis
  const isHealthy = await checkRedisHealth();

  if (!isHealthy) {
    return {
      available: true,
      connected: status.connected,
      healthy: false,
      message: "Redis connection unhealthy. Using in-memory fallbacks.",
      timestamp: new Date().toISOString(),
    };
  }

  return {
    available: true,
    connected: true,
    healthy: true,
    message: "Redis is healthy and operational.",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Log Redis status for debugging
 */
export async function logRedisStatus(): Promise<void> {
  const status = await getRedisHealthStatus();

  if (status.healthy) {
    console.log("✅ Redis Status:", status.message);
  } else {
    console.warn("⚠️  Redis Status:", status.message);
  }
}
