/**
 * Example implementation of OTP Service
 * 
 * This file shows how to set up and use the OTP service in your Express application
 */

import express from "express";
import { redis } from "./redisConfig";
import { logger } from "./logger"; // You need to create this or use winston directly
import { sendSMS } from "./smsService"; // Your SMS service function
import { initializeOTPService } from "./otpService";
import {
  sendOTPController,
  verifyOTPController,
  resendOTPController,
  getOTPStatsController,
} from "./otpController";

const app = express();

// Middleware
app.use(express.json());

// Initialize OTP Service
initializeOTPService({
  redis,
  logger,
  sendSMS,
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || "10"),
  rateLimitSeconds: parseInt(process.env.OTP_RATE_LIMIT_SECONDS || "60"),
});

// OTP Routes
app.post("/api/otp/send", sendOTPController);
app.post("/api/otp/verify", verifyOTPController);
app.post("/api/otp/resend", resendOTPController);
app.get("/api/otp/stats", getOTPStatsController);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "otp-service" });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ OTP Service running on port ${PORT}`);
});

/**
 * Alternative: Using routes file
 * 
 * Create routes/otpRoutes.ts:
 * 
 * import express from "express";
 * import {
 *   sendOTPController,
 *   verifyOTPController,
 *   resendOTPController,
 *   getOTPStatsController,
 * } from "../controllers/otpController";
 * 
 * const router = express.Router();
 * 
 * router.post("/send", sendOTPController);
 * router.post("/verify", verifyOTPController);
 * router.post("/resend", resendOTPController);
 * router.get("/stats", getOTPStatsController);
 * 
 * export default router;
 * 
 * Then in app.ts:
 * 
 * import otpRoutes from "./routes/otpRoutes";
 * app.use("/api/otp", otpRoutes);
 */

