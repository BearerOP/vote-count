# Standalone OTP Service

A standalone, production-ready OTP (One-Time Password) service that uses Redis for storage and can be integrated into any Node.js/Express project.

## 📁 File Structure

```
standalone/
├── otpService.ts           # Core OTP service (REQUIRED)
├── otpController.ts        # Express controllers (REQUIRED)
├── redisConfig.ts          # Redis setup (REQUIRED)
├── example.ts              # Complete implementation example
├── logger.example.ts       # Winston logger example
├── smsService.example.ts   # SMS service template
├── package.json.example    # Dependencies example
├── tsconfig.json.example   # TypeScript config example
└── README.md               # This file
```

## 🚀 Quick Integration

1. **Copy required files:**
   - `otpService.ts`
   - `otpController.ts`
   - `redisConfig.ts`

2. **Install dependencies:**
   ```bash
   npm install ioredis express winston axios
   npm install -D @types/express @types/node typescript
   ```

3. **Set up Redis:**
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:7-alpine
   ```

4. **Create your SMS service function** (see `smsService.example.ts`)

5. **Initialize in your app:**
   ```typescript
   import { initializeOTPService } from "./otpService";
   import { redis } from "./redisConfig";
   import { logger } from "./logger";
   import { sendSMS } from "./smsService";

   initializeOTPService({
     redis,
     logger,
     sendSMS,
   });
   ```

6. **Use the controllers:**
   ```typescript
   import { sendOTPController, verifyOTPController } from "./otpController";
   
   app.post("/api/otp/send", sendOTPController);
   app.post("/api/otp/verify", verifyOTPController);
   ```

## 📚 Full Documentation

See **[STANDALONE_OTP_SERVICE.md](../STANDALONE_OTP_SERVICE.md)** for complete setup instructions, API documentation, troubleshooting, and more.

## ✨ Features

- ✅ Redis-based OTP storage with automatic expiry
- ✅ Rate limiting to prevent abuse
- ✅ Phone number validation (Indian format)
- ✅ 6-digit OTP generation
- ✅ Resend functionality
- ✅ TypeScript support
- ✅ Comprehensive error handling
- ✅ Easy to integrate into existing projects

## 🔧 Configuration

Environment variables:
```env
REDIS_URL=redis://localhost:6379
OTP_EXPIRY_MINUTES=10
OTP_RATE_LIMIT_SECONDS=60
SMS_API_URL=https://your-sms-api.com/send
SMS_API_KEY=your-api-key
```

## 📝 API Endpoints

- `POST /api/otp/send` - Send OTP
- `POST /api/otp/verify` - Verify OTP
- `POST /api/otp/resend` - Resend OTP
- `GET /api/otp/stats` - Get OTP stats for a phone number

See the full documentation for detailed request/response examples.

## 🎯 Key Points

1. **Redis is required** - The service uses Redis for fast OTP storage
2. **Customize SMS service** - You need to implement your own SMS sending function
3. **Logger required** - Uses Winston logger (or any compatible logger)
4. **Standalone** - No dependencies on Prisma or your database schema

## 💡 Usage Example

See `example.ts` for a complete working example.

