import { Redis } from "ioredis";
import { Logger } from "winston";

// SMS Result interface
export interface SMSResult {
  success: boolean;
  message: string;
  messageId?: string;
  error?: string;
}

// SMS Function type
export type SMSFunction = (
  phoneNumber: string,
  message: string
) => Promise<SMSResult>;

// OTP Service Configuration
export interface OTPConfig {
  redis: Redis;
  logger: Logger;
  sendSMS: SMSFunction;
  otpExpiryMinutes?: number;
  rateLimitSeconds?: number;
}

// OTP Service class
class OTPService {
  private redis: Redis;
  private logger: Logger;
  private sendSMS: SMSFunction;
  private otpExpiryMinutes: number;
  private rateLimitSeconds: number;

  constructor(config: OTPConfig) {
    this.redis = config.redis;
    this.logger = config.logger;
    this.sendSMS = config.sendSMS;
    this.otpExpiryMinutes = config.otpExpiryMinutes || 10;
    this.rateLimitSeconds = config.rateLimitSeconds || 60;
  }

  /**
   * Generate a random 6-digit OTP
   */
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP to phone number
   * @param phoneNumber - Phone number to send OTP to
   * @returns Promise with success status and message
   */
  async sendOTP(phoneNumber: string): Promise<{
    success: boolean;
    message: string;
    otp?: string;
  }> {
    try {
      // Validate phone number format
      if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
        return {
          success: false,
          message:
            "Invalid phone number format. Must be 10 digits starting with 6, 7, 8, or 9",
        };
      }

      // Check if OTP was sent recently (rate limiting)
      const recentOTPKey = `recent_otp:${phoneNumber}`;
      const recentOTP = await this.redis.get(recentOTPKey);

      if (recentOTP) {
        return {
          success: false,
          message:
            "OTP already sent recently. Please wait before requesting another.",
        };
      }

      // Generate OTP
      const otp = this.generateOTP();

      // Store OTP in Redis with expiration
      const otpKey = `otp:${phoneNumber}`;
      const expirySeconds = this.otpExpiryMinutes * 60;
      await this.redis.setex(otpKey, expirySeconds, otp);

      // Set rate limiting (prevent multiple OTP requests within rateLimitSeconds)
      await this.redis.setex(recentOTPKey, this.rateLimitSeconds, "1");

      // Send OTP via SMS
      const otpMessage = `Your OTP is ${otp}. Valid for ${this.otpExpiryMinutes} minutes.`;
      const smsResult = await this.sendSMS(phoneNumber, otpMessage);

      if (!smsResult.success) {
        // If SMS fails, remove OTP from Redis
        await this.redis.del(otpKey);
        await this.redis.del(recentOTPKey);
        return {
          success: false,
          message: "Failed to send OTP. Please try again later.",
        };
      }

      this.logger.info(`OTP sent successfully to ${phoneNumber}`);

      return {
        success: true,
        message: "OTP sent successfully",
        otp: process.env.NODE_ENV === "development" ? otp : undefined, // Only return OTP in development
      };
    } catch (error: any) {
      this.logger.error(`Error sending OTP to ${phoneNumber}:`, error);
      return {
        success: false,
        message: "Internal server error while sending OTP",
      };
    }
  }

  /**
   * Verify OTP for phone number
   * @param phoneNumber - Phone number to verify OTP for
   * @param otp - OTP code to verify
   * @returns Promise with verification result
   */
  async verifyOTP(
    phoneNumber: string,
    otp: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Validate phone number format
      if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
        return {
          success: false,
          message: "Invalid phone number format",
        };
      }

      // Validate OTP format
      if (!/^\d{6}$/.test(otp)) {
        return {
          success: false,
          message: "Invalid OTP format. Must be 6 digits",
        };
      }

      // Check OTP from Redis
      const otpKey = `otp:${phoneNumber}`;
      const storedOTP = await this.redis.get(otpKey);

      if (!storedOTP) {
        return {
          success: false,
          message: "OTP expired or not found. Please request a new OTP",
        };
      }

      if (storedOTP !== otp) {
        return {
          success: false,
          message: "Invalid OTP. Please check and try again",
        };
      }

      // OTP is valid - remove it from Redis
      await this.redis.del(otpKey);

      // Also remove rate limit key to allow new OTP request
      await this.redis.del(`recent_otp:${phoneNumber}`);

      this.logger.info(`OTP verified successfully for ${phoneNumber}`);

      return {
        success: true,
        message: "OTP verified successfully",
      };
    } catch (error: any) {
      this.logger.error(`Error verifying OTP for ${phoneNumber}:`, error);
      return {
        success: false,
        message: "Internal server error while verifying OTP",
      };
    }
  }

  /**
   * Resend OTP to phone number (with rate limiting)
   * @param phoneNumber - Phone number to resend OTP to
   * @returns Promise with success status and message
   */
  async resendOTP(phoneNumber: string): Promise<{
    success: boolean;
    message: string;
    otp?: string;
  }> {
    // This is essentially the same as sendOTP, but can be customized
    return this.sendOTP(phoneNumber);
  }

  /**
   * Clean up expired OTPs (optional - Redis TTL handles this automatically)
   * This is useful if you want to manually clean up or log cleanup actions
   */
  async cleanupExpiredOTPs(): Promise<void> {
    try {
      // Redis automatically removes expired keys, but we can scan for any leftovers
      const keys = await this.redis.keys("otp:*");
      let cleaned = 0;

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) {
          // Key exists but has no expiry (shouldn't happen, but clean it up)
          await this.redis.del(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.info(`Cleaned up ${cleaned} OTP keys without expiry`);
      }
    } catch (error: any) {
      this.logger.error("Error cleaning up expired OTPs:", error);
    }
  }

  /**
   * Get OTP statistics for a phone number
   * @param phoneNumber - Phone number to get stats for
   * @returns Promise with statistics
   */
  async getOTPStats(phoneNumber: string): Promise<{
    hasPendingOTP: boolean;
    canRequestNewOTP: boolean;
    timeUntilCanRequest?: number; // seconds
  }> {
    try {
      const otpKey = `otp:${phoneNumber}`;
      const recentOTPKey = `recent_otp:${phoneNumber}`;

      const [hasOTP, recentOTP, otpTTL, rateLimitTTL] = await Promise.all([
        this.redis.exists(otpKey),
        this.redis.exists(recentOTPKey),
        this.redis.ttl(otpKey),
        this.redis.ttl(recentOTPKey),
      ]);

      return {
        hasPendingOTP: hasOTP === 1,
        canRequestNewOTP: recentOTP === 0,
        timeUntilCanRequest:
          rateLimitTTL > 0 ? rateLimitTTL : undefined,
      };
    } catch (error: any) {
      this.logger.error(`Error getting OTP stats for ${phoneNumber}:`, error);
      return {
        hasPendingOTP: false,
        canRequestNewOTP: true,
      };
    }
  }
}

// Singleton instance
let otpServiceInstance: OTPService | null = null;

/**
 * Initialize OTP Service
 * Call this once when your application starts
 */
export function initializeOTPService(config: OTPConfig): OTPService {
  if (otpServiceInstance) {
    throw new Error("OTP Service already initialized");
  }
  otpServiceInstance = new OTPService(config);
  return otpServiceInstance;
}

/**
 * Get OTP Service instance
 * Make sure to call initializeOTPService first
 */
export function getOTPService(): OTPService {
  if (!otpServiceInstance) {
    throw new Error(
      "OTP Service not initialized. Call initializeOTPService() first."
    );
  }
  return otpServiceInstance;
}

// Export utility functions for convenience
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

