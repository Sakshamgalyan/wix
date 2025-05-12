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
import { paymentsRouter } from './payments.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const initializeWixClient = () => {
  try {
    if (!process.env.WIX_API_KEY || !process.env.WIX_SITE_ID) {
      throw new Error('Missing required Wix environment variables');
    }

    const client = createClient({
      auth: ApiKeyStrategy({
        apiKey: process.env.WIX_API_KEY,
        siteId: process.env.WIX_SITE_ID,
        accountId: process.env.WIX_ACCOUNT_ID,
      }),
      modules: {
        payments: true 
      }
    });


  
    logger.info('Wix client initialized successfully');
    return client;
  } catch (error) {
    logger.error('Wix client initialization failed:', error);
    process.exit(1);
  }
};

const wixClient = initializeWixClient();
const payments = wixClient.payments;

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://your-production-domain.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin) || 
        process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  // Use logger.child() instead of logger.withContext()
  req.logger = logger.child({
    requestId: crypto.randomUUID(),
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  next();
});

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    req.logger.warn('Development mode - Auth bypassed');
    req.user = { 
      id: 'test_user',
      permissions: ['admin']
    };
  }
  next();
});

// if (process.env.NODE_ENV === 'production') {
//   app.use(validateRequest);
// }

// Enhanced error logging middleware
app.use((err, req, res, next) => {
  console.error('\n--- RAW ERROR OBJECT ---');
  console.dir(err, { depth: null, colors: true });
  
  if (err.response) {
    console.error('\n--- REMOTE SERVICE ERROR ---');
    console.error('Status:', err.response.status);
    console.error('Data:', err.response.data);
  }
  
  if (err.config) {
    console.error('\n--- REQUEST CONFIG ---');
    console.error('URL:', err.config.url);
    console.error('Method:', err.config.method);
    console.error('Headers:', err.config.headers);
  }

  next(err); 
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version
  });
});

const initializePayments = async () => {
  try {
    // Skip configuration check in development
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Development mode - skipping payments configuration check');
      return true;
    }

    const config = await payments.getConfiguration();
    logger.info('Wix Payments configured', {
      currency: config.currency,
      testMode: config.testMode
    });
    return true;
  } catch (error) {
    logger.warn('Payments configuration check failed (running in limited mode)', {
      error: error.message
    });
    return true; // Continue startup even if check fails
  }
};

app.get('/payments/health', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      await payments.getConfiguration();
    }
    res.json({ 
      status: 'OK',
      payments: 'operational'
    });
  } catch (error) {
    res.status(503).json({
      status: 'WARNING',
      payments: 'degraded',
      error: error.message
    });
  }
});

app.use('/payments', (req, res, next) => {
  req.payments = payments;
  next();
}, paymentsRouter);

// Routes
// app.use('/payments', paymentsRouter(payments));
app.use('/webhooks', paymentWebhook);

// app.use('/payments', (req, res, next) => {
//   req.payments = wixClient.payments;
//   next();
// }, paymentsRouter);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  
  req.logger.error(`Request failed`, {
    error: err.message,
    stack: isProduction ? undefined : err.stack,
    status
  });

  res.status(status).json({
    error: isProduction ? 'Internal Server Error' : err.message,
    ...(!isProduction && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});

const startServer = async () => {
  try {
    await initializePayments();
    
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      logger.info(`Available endpoints:
        - http://localhost:${PORT}/health
        - http://localhost:${PORT}/payments/create
        - http://localhost:${PORT}/webhooks`);
    });

    // Add graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received - shutting down gracefully');
      server.close();
    });

  } catch (error) {
    logger.error('Critical server startup failed:', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};
startServer();