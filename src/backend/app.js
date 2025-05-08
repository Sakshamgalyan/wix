import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import {logger} from './utils/logger.js';
import { validateRequest } from './utils/security.js';
import { createClient, OAuthStrategy, ApiKeyStrategy } from '@wix/sdk';
import paymentsRouter from './payments.js';
import paymentWebhook from './gateway/paymentWebhook.js';

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
    'https://localhost:3000',
    'https://your-production-domain.com'
  ],
  credentials: true
}));

app.use(bodyParser.json());
app.use(validateRequest);
app.use((req, res, next) => {
  logger.info(`Incoming ${req.method} request to ${req.path}`);
  next();
});

app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
      console.log("⚠️ DEVELOPMENT MODE - Auth bypassed");
      req.user = { id: 'test_user' }; // Mock authenticated user
      return next();
    }
    next();
  });
app.use('/payments', paymentsRouter(payments));
app.use('/webhooks', paymentWebhook); 

app.use((err, req, res, next) => {
  logger.error(`Payment Error: ${err.message}`);
  res.status(500).json({ error: 'Payment processing failed' });
});

app.use(validateRequest); 

app.use((req, res, next) => {
    // Bypass auth for testing
    if (process.env.NODE_ENV === 'development') {
      console.log("⚠️ DEVELOPMENT MODE - Auth bypassed");
      return next();
    }
    // Your original validateRequest logic here
    validateRequest(req, res, next);
  });
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger('info', `Server is running on port ${PORT}`

));