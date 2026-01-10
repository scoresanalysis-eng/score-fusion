import { NextResponse } from "next/server";
import { getRedisHealthStatus } from "@/lib/redis-health";
import { prisma } from "@/lib/db";

interface ServiceStatus {
  status: "healthy" | "degraded" | "unhealthy";
  message: string;
  [key: string]: unknown;
}

export async function GET() {
  try {
    const checks = {
      timestamp: new Date().toISOString(),
      status: "healthy" as "healthy" | "degraded" | "unhealthy",
      services: {} as Record<string, ServiceStatus>,
    };

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.services.database = {
        status: "healthy",
        message: "Database connection successful",
      };
    } catch (error) {
      checks.services.database = {
        status: "unhealthy",
        message: "Database connection failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
      checks.status = "unhealthy";
    }

    // Check Redis
    const redisStatus = await getRedisHealthStatus();
    checks.services.redis = {
      status: redisStatus.healthy ? "healthy" : "degraded",
      message: redisStatus.message,
      available: redisStatus.available,
      connected: redisStatus.connected,
    };

    // Redis being unavailable is not critical - mark as degraded not unhealthy
    if (!redisStatus.healthy && checks.status === "healthy") {
      checks.status = "degraded";
    }

    // Overall health summary
    checks.services.application = {
      status: "healthy",
      message: "Application is running",
      mode: redisStatus.healthy ? "full" : "in-memory-fallback",
    };

    const statusCode = checks.status === "unhealthy" ? 503 : 200;

    return NextResponse.json(checks, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Health check failed",
      },
      { status: 503 }
    );
  }
}
