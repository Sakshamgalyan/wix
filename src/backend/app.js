import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './utils/logger.js';
import { validateRequest } from './utils/security.js';
import { createClient } from "@wix/sdk";
import { currentCart, orders, orderTransactions } from '@wix/ecom';
import paymentWebhook from './gateway/paymentWebhook.js';
import { paymentsRouter } from './payments.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

let wixClient;

const initializeWixClient = async () => {
  try {
    const requiredEnvVars = ['WIX_APP_ID', 'WIX_APP_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      logger.warn(`Missing Wix environment variables: ${missingVars.join(', ')}. Using mock implementation.`);
      return createMockWixClient();
    }
    
    logger.info('Initializing Wix client with OAuth authentication...');
    
    // Create client using App strategy with OAuth Client Credentials flow
    const client = createClient({
      auth: {
        appId: process.env.WIX_APP_ID,
        appSecret: process.env.WIX_APP_SECRET,
      },
      modules: {
        currentCart,
        orders,
        orderTransactions
      },
    });

    // Test if we can access the Wix API
    try {
      const cartSettings = await client.currentCart.getSettings();
      logger.info('Wix eCommerce initialized successfully', {
        currency: cartSettings.currency,
      });
    } catch (apiError) {
      logger.warn('Could not retrieve cart settings', {
        error: apiError.message
      });
    }

    return client;
  } catch (error) {
    logger.error('Wix initialization failed, falling back to mock implementation:', {
      message: error.message,
      code: error.code,
      response: error.response?.data
    });
    return createMockWixClient();
  }
};

// Create a mock Wix client for fallback
const createMockWixClient = () => {
  logger.info('Creating mock Wix client');
  
  // In-memory storage for mock payments
  const mockWixPayments = new Map();
  
  return {
    payments: {
      getConfiguration: async () => ({ 
        currency: 'USD',
        testMode: process.env.NODE_ENV !== 'production' 
      }),
      createPayment: async (options) => {
        const paymentId = `mock_wix_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // Create payment object
        const payment = {
          id: paymentId,
          status: 'PAID',
          amount: options.amount,
          currency: options.currency,
          timestamp: new Date().toISOString(),
          metadata: options.metadata || {}
        };
        
        // Store the payment
        mockWixPayments.set(paymentId, payment);
        
        logger.info(`Mock Wix payment created: ${paymentId}`);
        return payment;
      },
      getPayment: async (id) => {
        // Check if the payment exists in our mock storage
        const payment = mockWixPayments.get(id);
        
        if (payment) {
          return payment;
        }
        
        // If not found in storage, return a default response
        logger.warn(`Mock payment not found, generating placeholder: ${id}`);
        return {
          id,
          status: 'PAID',
          amount: 1000,
          currency: 'USD',
          timestamp: new Date().toISOString()
        };
      },
      capturePayment: async ({ paymentId, amount }) => {
        // Get the existing payment
        let payment = mockWixPayments.get(paymentId);
        
        // If payment doesn't exist, create a new one
        if (!payment) {
          payment = {
            id: paymentId,
            status: 'PAID',
            amount: amount || 1000,
            currency: 'USD',
            timestamp: new Date().toISOString()
          };
        }
        
        // Update the payment status to CAPTURED
        payment.status = 'CAPTURED';
        payment.updatedAt = new Date().toISOString();
        
        // Store the updated payment
        mockWixPayments.set(paymentId, payment);
        
        logger.info(`Mock Wix payment captured: ${paymentId}`);
        return payment;
      }
    },
    currentCart: {
      getSettings: async () => ({
        currency: 'USD'
      })
    },
    orders: {
      getOrder: async (orderId) => ({
        id: orderId,
        status: 'PAID'
      })
    },
    orderTransactions: {
      createTransaction: async (options) => ({
        id: `mock_transaction_${Date.now()}`,
        status: 'SUCCESS'
      })
    }
  };
};

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

if (process.env.NODE_ENV === 'production') {
  app.use(validateRequest);
}

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
    version: process.env.npm_package_version,
    services: {
      wix: wixClient?.currentCart ? 'connected' : 'mock_connected'
    }
  });
});

app.get('/payments/health', async (req, res) => {
  try {
    // Test Wix connectivity using the available modules
    if (wixClient?.currentCart) {
      try {
        const cartSettings = await wixClient.currentCart.getSettings();
        const isMock = !process.env.WIX_APP_ID || !process.env.WIX_APP_SECRET;
        
        res.json({ 
          status: 'OK',
          payments: 'operational',
          currency: cartSettings.currency || 'USD',
          mode: isMock ? 'MOCK' : 'PRODUCTION'
        });
      } catch (wixError) {
        throw new Error(`Wix API error: ${wixError.message}`);
      }
    } else {
      res.json({ 
        status: 'OK',
        payments: 'operational',
        currency: 'USD',
        mode: 'MOCK'
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'WARNING',
      payments: 'degraded',
      error: error.message
    });
  }
});

app.use('/payments', (req, res, next) => {
  // Use the orderTransactions module for payment operations if available
  if (wixClient?.orderTransactions) {
    req.wixClient = wixClient;
  }
  
  // Always provide mock payments as fallback
  req.payments = wixClient?.payments || {
    getConfiguration: async () => ({ 
      currency: 'USD',
      testMode: process.env.NODE_ENV !== 'production' 
    }),
    createPayment: async (options) => {
      const paymentId = `mock_payment_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      logger.info(`Mock payment created: ${paymentId}`);
      return {
        id: paymentId,
        status: 'PAID',
        amount: options.amount,
        currency: options.currency,
        timestamp: new Date().toISOString()
      };
    },
    getPayment: async (id) => {
      return {
        id,
        status: 'PAID',
        amount: 1000,
        currency: 'USD',
        timestamp: new Date().toISOString()
      };
    },
    capturePayment: async ({ paymentId, amount }) => {
      logger.info(`Mock payment captured: ${paymentId}`);
      return {
        id: paymentId,
        status: 'CAPTURED',
        amount: amount || 1000,
        currency: 'USD',
        timestamp: new Date().toISOString()
      };
    }
  };
  next();
}, paymentsRouter);

app.use('/webhooks', paymentWebhook);

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
    wixClient = await initializeWixClient();

    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      logger.info(`Available endpoints:
        - http://localhost:${PORT}/health
        - http://localhost:${PORT}/payments/create
        - http://localhost:${PORT}/webhooks`);
    });

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
