import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  handleDevicePair,
  handleDeviceSms,
  handleCreatePayment,
  handleGetPayment,
  handleCustomerVerifyPayment,
  handleCronExpirePayments,
} from './src/server/routes/handlers.ts';
import {
  handleMerchantOverview,
  handleListMerchantPayments,
  handleGeneratePairingCode,
  handleListDevices,
  handleListWallets,
  handleCreateWallet,
  handleListApiKeys,
  handleCreateApiKey,
  handleListSmsLogs,
  handleListReviewQueue,
  handleManualConfirmReview,
  handleRejectReview,
  handleListWebhookLogs,
  handleRetryWebhook,
  handleListAuditLogs,
  handleSimulatorSendSms,
  handleAdminSystemHealth,
  handleAdminTriggerCron,
  handleListAllMerchants,
  handleBindWalletsToDevice,
  handleGetAndroidAppConfig,
  handleGetEnvStatus,
} from './src/server/routes/merchantRoutes.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Preserve raw body for HMAC signature verification
app.use(
  express.json({
    verify: (req: Request & { rawBody?: string }, _res, buf) => {
      req.rawBody = buf.toString('utf-8');
    },
    limit: '2mb',
  }),
);

app.use(express.urlencoded({ extended: true }));

// Simple in-memory Rate Limiting middleware
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimiter(limit: number = 60, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= limit) {
      return res.status(429).json({
        error: 'تم تجاوز حد الطلبات المسموح به، يرجى المحاولة لاحقاً (Too Many Requests)',
      });
    }

    entry.count++;
    next();
  };
}

app.use(rateLimiter(120, 60000));

// --- Security Headers & CORS ---
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Id, X-Timestamp, X-Signature, X-API-Key, X-Merchant-Id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// --- Core API Contract Routes ---
// 1. Device Pairing (POST /api/device/pair)
app.post('/api/device/pair', handleDevicePair);

// 2. Device SMS Ingestion (POST /api/device/sms)
app.post('/api/device/sms', handleDeviceSms);

// 3. Payments API (POST /api/v1/payments & GET /api/v1/payments/:id)
app.post('/api/v1/payments', handleCreatePayment);
app.get('/api/v1/payments/:id', handleGetPayment);
app.post('/api/v1/payments/:id/verify', handleCustomerVerifyPayment);

// 4. Cron payment expiration (GET /api/cron/expire-payments)
app.get('/api/cron/expire-payments', handleCronExpirePayments);
app.post('/api/cron/expire-payments', handleCronExpirePayments);

// --- Merchant Dashboard & Admin APIs ---
app.get('/api/merchant/overview', handleMerchantOverview);
app.get('/api/merchant/payments', handleListMerchantPayments);
app.post('/api/merchant/payments/create', handleCreatePayment);
app.get('/api/merchant/devices', handleListDevices);
app.post('/api/merchant/devices/generate-pairing', handleGeneratePairingCode);
app.post('/api/merchant/devices/:id/bind-wallets', handleBindWalletsToDevice);
app.get('/api/merchant/devices/:id/android-config', handleGetAndroidAppConfig);
app.get('/api/merchant/wallets', handleListWallets);
app.post('/api/merchant/wallets', handleCreateWallet);
app.get('/api/merchant/api-keys', handleListApiKeys);
app.post('/api/merchant/api-keys', handleCreateApiKey);
app.get('/api/merchant/sms-logs', handleListSmsLogs);
app.get('/api/merchant/review-queue', handleListReviewQueue);
app.post('/api/merchant/review-queue/:id/confirm', handleManualConfirmReview);
app.post('/api/merchant/review-queue/:id/reject', handleRejectReview);
app.get('/api/merchant/webhook-logs', handleListWebhookLogs);
app.post('/api/merchant/webhook-logs/:id/retry', handleRetryWebhook);
app.get('/api/admin/audit-logs', handleListAuditLogs);
app.get('/api/admin/system-health', handleAdminSystemHealth);
app.post('/api/admin/trigger-cron', handleAdminTriggerCron);
app.get('/api/admin/merchants', handleListAllMerchants);
app.get('/api/admin/env-status', handleGetEnvStatus);

// Built-in device & SMS testing simulator
app.post('/api/simulator/send-sms', handleSimulatorSendSms);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'EHABGM Pay Gateway',
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[EHABGM Pay] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
