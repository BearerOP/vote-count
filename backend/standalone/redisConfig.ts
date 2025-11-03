import Redis from "ioredis";

/**
 * Redis Configuration
 * 
 * This file sets up the Redis client with proper connection handling,
 * retry logic, and error handling.
 * 
 * Usage:
 * import { redis } from './redisConfig';
 * 
 * Make sure to set REDIS_URL environment variable:
 * REDIS_URL=redis://localhost:6379
 * or
 * REDIS_URL=redis://user:password@host:port
 */

// Create Redis client with configuration
export const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  connectTimeout: 10000,
  
  // Retry strategy: exponential backoff with max delay
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  
  // Reconnect on specific errors (e.g., READONLY errors in cluster mode)
  reconnectOnError(err) {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

// Handle Redis connection events
redis.on("connect", () => {
  console.log("✅ Connected to Redis");
});

redis.on("ready", () => {
  console.log("✅ Redis is ready to accept commands");
});

redis.on("error", (error) => {
  console.error("❌ Redis connection error:", error);
});

redis.on("close", () => {
  console.log("⚠️ Redis connection closed");
});

redis.on("reconnecting", (delay) => {
  console.log(`🔄 Reconnecting to Redis in ${delay}ms...`);
});

// Connect to Redis
redis.connect().catch((err) => {
  console.error("❌ Failed to connect to Redis:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Closing Redis connection...");
  await redis.quit();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Closing Redis connection...");
  await redis.quit();
  process.exit(0);
});

export default redis;

