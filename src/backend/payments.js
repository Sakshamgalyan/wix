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

// Add this to your payment route for debugging
router.post('/create', async (req, res) => {
  try {
    console.log('Incoming payment request:', {
      headers: req.headers,
      body: req.body
    });

    const result = await req.payments.createPayment({
      amount: Math.round(req.body.amount * 100),
      currency: req.body.currency,
      paymentMethod: {
        methodType: 'PAYMENT_CARD'
      }
    });

    console.log('Wix API response:', result);
    res.json(result);
    
  } catch (error) {
    console.error('Payment processing error:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      config: error.config
    });
    res.status(500).json({ 
      error: 'Payment failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// router.post('/create', async (req, res) => {
//   // Mock response for testing
//   res.status(200).json({
//     success: true,
//     paymentId: 'mock_pay_' + Date.now(),
//     status: 'PAID',
//     amount: req.body.amount,
//     currency: req.body.currency
//   });
// });

// Payment status endpoint

router.get('/:paymentId/status', async (req, res) => {
  try {
    const payment = await req.payments.getPayment(req.params.paymentId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    res.json({
      success: true,
      status: payment.status,
      amount: formatCurrency(payment.amount / 100, payment.currency),
      lastUpdated: payment.updatedAt || payment.timestamp
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment status'
    });
  }
});

export default router; 

export { router as paymentsRouter };