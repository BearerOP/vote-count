import { Request, Response } from "express";
import { getOTPService } from "./otpService";

/**
 * Send OTP to phone number
 * POST /api/otp/send
 */
export const sendOTPController = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const otpService = getOTPService();
    const result = await otpService.sendOTP(phoneNumber);

    if (!result.success) {
      // Check if it's a rate limit error
      if (result.message.includes("already sent recently")) {
        return res.status(429).json({
          success: false,
          message: result.message,
        });
      }

      // Check if it's a validation error
      if (result.message.includes("Invalid phone number")) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      // Other errors (like SMS failure)
      return res.status(500).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        phoneNumber,
        expiresIn: "10 minutes",
        // Only include OTP in development mode
        ...(result.otp && { otp: result.otp }),
      },
    });
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Verify OTP
 * POST /api/otp/verify
 */
export const verifyOTPController = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: "Phone number and OTP are required",
      });
    }

    const otpService = getOTPService();
    const result = await otpService.verifyOTP(phoneNumber, otp);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        success: true,
      },
    });
  } catch (error: any) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Resend OTP (with rate limiting)
 * POST /api/otp/resend
 */
export const resendOTPController = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const otpService = getOTPService();
    const result = await otpService.resendOTP(phoneNumber);

    if (!result.success) {
      // Check if it's a rate limit error
      if (result.message.includes("already sent recently")) {
        return res.status(429).json({
          success: false,
          message: result.message,
        });
      }

      // Check if it's a validation error
      if (result.message.includes("Invalid phone number")) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      // Other errors
      return res.status(500).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      message: "New OTP sent successfully",
      data: {
        phoneNumber,
        expiresIn: "10 minutes",
        // Only include OTP in development mode
        ...(result.otp && { otp: result.otp }),
      },
    });
  } catch (error: any) {
    console.error("Error resending OTP:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get OTP statistics for a phone number
 * GET /api/otp/stats?phoneNumber=9876543210
 */
export const getOTPStatsController = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.query;

    if (!phoneNumber || typeof phoneNumber !== "string") {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const otpService = getOTPService();
    const stats = await otpService.getOTPStats(phoneNumber);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("Error getting OTP stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

