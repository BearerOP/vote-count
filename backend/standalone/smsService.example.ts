/**
 * Example SMS Service Implementation
 * 
 * This is a template for your SMS service function.
 * Customize it according to your SMS provider's API.
 * 
 * Based on the user's memory, they prefer to use their own created APIs
 * rather than directly calling third-party APIs.
 */

import axios from "axios";
import { logger } from "./logger.example";
import { SMSResult } from "./otpService";

/**
 * Send SMS using your custom SMS API
 * 
 * Replace this with your actual SMS API endpoint and authentication
 */
export async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<SMSResult> {
  try {
    // Clean and format the number (remove +91 prefix if present)
    const formattedNumber = phoneNumber.replace(/^\+?91/, "");

    // Validate phone number format (Indian mobile numbers)
    if (!/^[6-9]\d{9}$/.test(formattedNumber)) {
      logger.error("Invalid phone number format", {
        originalNumber: phoneNumber,
        formattedNumber,
      });
      return {
        success: false,
        message: `Invalid phone number format: ${formattedNumber}`,
        error: "INVALID_PHONE_FORMAT",
      };
    }

    // Call your SMS API
    const response = await axios.post(
      process.env.SMS_API_URL || "https://your-sms-api.com/send",
      {
        phone: formattedNumber,
        message: message,
        // Add any other required parameters for your API
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.SMS_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 seconds timeout
      }
    );

    // Handle response based on your API's response structure
    if (response.status === 200 && response.data.success) {
      logger.info(`SMS sent successfully to ${formattedNumber}`);
      return {
        success: true,
        message: "SMS sent successfully",
        messageId: response.data.messageId || response.data.id || "unknown",
      };
    }

    return {
      success: false,
      message: response.data.message || "Failed to send SMS",
      error: "SMS_API_ERROR",
    };
  } catch (error: any) {
    logger.error(`Error sending SMS to ${phoneNumber}:`, error);

    // Handle specific error cases
    if (error.response) {
      // API responded with error status
      return {
        success: false,
        message: error.response.data?.message || "SMS API returned an error",
        error: "SMS_API_ERROR",
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        success: false,
        message: "No response from SMS service",
        error: "SMS_NETWORK_ERROR",
      };
    } else {
      // Error in request setup
      return {
        success: false,
        message: error.message || "Failed to send SMS",
        error: "SMS_SEND_ERROR",
      };
    }
  }
}

/**
 * Alternative: Using GET request (if your API uses GET)
 */
export async function sendSMS_GET(
  phoneNumber: string,
  message: string
): Promise<SMSResult> {
  try {
    const formattedNumber = phoneNumber.replace(/^\+?91/, "");

    if (!/^[6-9]\d{9}$/.test(formattedNumber)) {
      return {
        success: false,
        message: `Invalid phone number format: ${formattedNumber}`,
        error: "INVALID_PHONE_FORMAT",
      };
    }

    // Example GET request
    const response = await axios.get(
      process.env.SMS_API_URL || "https://your-sms-api.com/send",
      {
        params: {
          phone: formattedNumber,
          message: message,
          apikey: process.env.SMS_API_KEY,
        },
        timeout: 10000,
      }
    );

    if (response.status === 200) {
      return {
        success: true,
        message: "SMS sent successfully",
        messageId: response.data.messageId || "unknown",
      };
    }

    return {
      success: false,
      message: "Failed to send SMS",
      error: "SMS_API_ERROR",
    };
  } catch (error: any) {
    logger.error(`Error sending SMS:`, error);
    return {
      success: false,
      message: error.message || "Failed to send SMS",
      error: "SMS_SEND_ERROR",
    };
  }
}

