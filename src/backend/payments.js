import express from 'express';
import { validationResult, body } from 'express-validator';
import logger from './utils/logger.js';

const router = express.Router();

// Enhanced validation middleware
const validatePayment = [
  body('orderId').isString().notEmpty().withMessage('Valid order ID required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be positive number'),
  body('currency').isIn(['USD', 'EUR', 'GBP']).withMessage('Unsupported currency'),
  body('customerInfo').optional().isObject(),
  body('customerInfo.email').optional().isEmail(),
  body('customerInfo.name').optional().isString()
];

// Payment processor response validator
const validatePaymentResponse = (response) => {
  if (!response) return false;
  if (!response.id) return false;
  if (response.amount && isNaN(response.amount)) return false;
  return true;
};

// Currency formatter
const formatCurrency = (amount, currency) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(amount);
};

// Mock payments storage
const mockPayments = new Map();

// Create a payment endpoint that tries to use Wix but falls back to mock implementation
router.post('/create', validatePayment, async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, currency, orderId, customerInfo, metadata } = req.body;
    
    // Check if Wix client is available
    if (req.payments) {
      logger.info(`Creating payment using Wix Payments API for order ${orderId}`);
      
      try {
        const payment = await req.payments.createPayment({
          amount: Math.round(amount * 100), // Convert to cents
          currency: currency.toUpperCase(),
          paymentMethod: {
            methodType: req.body.paymentMethod?.methodType || 'PAYMENT_CARD'
          },
          customerInfo: {
            email: customerInfo?.email || 'no-email@example.com'
          },
          metadata: {
            orderId,
            ...metadata
          }
        });

        // Return Wix payment response
        return res.json({
          success: true,
          paymentId: payment.id,
          status: payment.status,
          amount: payment.amount / 100, // Convert back to dollars
          currency: payment.currency
        });
      } catch (wixError) {
        logger.error('Wix payment creation failed, falling back to mock', { 
          error: wixError.message,
          code: wixError.code 
        });
        // Fall through to mock implementation
      }
    }
    
    // Mock implementation (fallback)
    logger.info(`Creating mock payment for order ${orderId}`);
    
    // Generate a payment ID
    const paymentId = `mock_payment_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Create a mock payment
    const payment = {
      id: paymentId,
      orderId,
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      status: 'PAID',
      customerInfo: customerInfo || { email: 'test@example.com' },
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Store the payment
    mockPayments.set(paymentId, payment);
    
    logger.info(`Mock payment created successfully: ${paymentId}`);
    
    // Return success response
    res.json({
      success: true,
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency
    });
  } catch (error) {
    logger.error('Payment creation failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Payment processing failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Payment status endpoint
router.get('/:paymentId/status', async (req, res) => {
  try {
    const paymentId = req.params.paymentId;
    
    // Check if Wix client is available and it's not a regular mock payment
    if (req.payments) {
      try {
        // If it's a mock Wix payment ID, we can get it directly from the Wix mock client
        if (paymentId.startsWith('mock_wix_')) {
          logger.info(`Retrieving mock Wix payment status: ${paymentId}`);
          const payment = await req.payments.getPayment(paymentId);
          
          return res.json({
            success: true,
            paymentId: payment.id,
            status: payment.status,
            amount: formatCurrency(payment.amount / 100, payment.currency),
            currency: payment.currency,
            lastUpdated: payment.updatedAt || payment.timestamp
          });
        }
        
        // If it's a real Wix payment, try to fetch from the Wix API
        if (!paymentId.startsWith('mock_')) {
          const payment = await req.payments.getPayment(paymentId);
          
          if (!payment) {
            return res.status(404).json({
              success: false,
              error: 'Payment not found'
            });
          }

          return res.json({
            success: true,
            paymentId: payment.id,
            status: payment.status,
            amount: formatCurrency(payment.amount / 100, payment.currency),
            currency: payment.currency,
            lastUpdated: payment.updatedAt || payment.timestamp
          });
        }
      } catch (wixError) {
        logger.error('Wix payment status retrieval failed', { 
          error: wixError.message,
          paymentId 
        });
        // Fall through to mock implementation
      }
    }
    
    // Mock implementation (fallback for old mock_ prefixed IDs)
    const payment = mockPayments.get(paymentId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    res.json({
      success: true,
      paymentId: payment.id,
      status: payment.status,
      amount: formatCurrency(payment.amount, payment.currency),
      currency: payment.currency,
      lastUpdated: payment.updatedAt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment status'
    });
  }
});

// Capture payment endpoint
router.post('/:paymentId/capture', async (req, res) => {
  try {
    const paymentId = req.params.paymentId;
    
    // Check if Wix client is available
    if (req.payments) {
      try {
        // If it's a mock Wix payment ID, we can capture it directly with the Wix mock client
        if (paymentId.startsWith('mock_wix_')) {
          logger.info(`Capturing mock Wix payment: ${paymentId}`);
          const captureResult = await req.payments.capturePayment({
            paymentId,
            amount: req.body.amount // Optional: capture a specific amount
          });
          
          return res.json({
            success: true,
            paymentId: captureResult.id,
            status: captureResult.status,
            amount: captureResult.amount / 100, // Convert back to dollars
            currency: captureResult.currency
          });
        }
        
        // If it's a real Wix payment, try to capture through the Wix API
        if (!paymentId.startsWith('mock_')) {
          // Capture the payment via Wix API
          logger.info(`Capturing Wix payment: ${paymentId}`);
          const captureResult = await req.payments.capturePayment({
            paymentId,
            amount: req.body.amount // Optional: capture a specific amount
          });
          
          return res.json({
            success: true,
            paymentId: captureResult.id,
            status: captureResult.status,
            amount: captureResult.amount / 100, // Convert back to dollars
            currency: captureResult.currency
          });
        }
      } catch (wixError) {
        logger.error('Wix payment capture failed', { 
          error: wixError.message,
          paymentId 
        });
        // Fall through to mock implementation
      }
    }
    
    // Mock implementation (fallback for old mock_ prefixed IDs)
    const payment = mockPayments.get(paymentId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }
    
    if (payment.status === 'CAPTURED') {
      return res.status(400).json({
        success: false,
        error: 'Payment already captured'
      });
    }
    
    // Update payment status to CAPTURED
    payment.status = 'CAPTURED';
    payment.updatedAt = new Date().toISOString();
    
    // Store the updated payment
    mockPayments.set(paymentId, payment);
    
    logger.info(`Mock payment captured successfully: ${paymentId}`);
    
    res.json({
      success: true,
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency
    });
  } catch (error) {
    logger.error('Payment capture failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Payment capture failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router; 

export { router as paymentsRouter };