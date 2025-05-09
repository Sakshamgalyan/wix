import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './utils/logger.js';
import { validateRequest } from './utils/security.js';
import { createClient, ApiKeyStrategy } from '@wix/sdk';
import paymentWebhook from './gateway/paymentWebhook.js';
import paymentsRouter from './payments.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const wixClient = createClient({
  auth: ApiKeyStrategy({
    apiKey: process.env.WIX_API_KEY,
    siteId: process.env.WIX_SITE_ID,
    accountId: process.env.WIX_ACCOUNT_ID,
  })
});

const payments = wixClient.payments || {
  createPayment: () => Promise.reject('Payments API not available')
};

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-production-domain.com'
  ],
  credentials: true
}));

app.use(bodyParser.json());

app.use((req, res, next) => {
  if (!logger || typeof logger.info !== 'function') {
    console.error('Logger initialization failed! Using console fallback');
    req.logger = {
      info: console.log,
      error: console.error
    };
  } else {
    req.logger = logger;
  }
  next();
});

app.use((req, res, next) => {
  req.logger.info(`Incoming ${req.method} request to ${req.path}`);
  next();
});

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    req.logger.info("⚠️ DEVELOPMENT MODE - Auth bypassed");
    req.user = { id: 'test_user' }; 
    return next();
  }
  validateRequest(req, res, next);
});

app.get('/ping', (req, res) => {
  res.json({ 
    status: 'OK',
    mode: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.get('/logger-test', (req, res) => {
  req.logger.info('This is an info test message');
  req.logger.error('This is an error test message');
  res.json({ 
    status: 'Logger test successful',
    logFile: path.join(__dirname, '../../logs/app.log')
  });
});

app.use('/payments', paymentsRouter(payments));
app.use('/webhooks', paymentWebhook);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  try {
    req.logger.error(`[${status}] ${message}`);
  } catch (loggingError) {
    console.error(`[FALLBACK] [${status}] ${message}`);
  } 

  res.status(status).json({
    error: message,
    status: 'error',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`Test endpoints:
  - http://localhost:${PORT}/ping
  - http://localhost:${PORT}/logger-test`);
});