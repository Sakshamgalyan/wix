import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import logger from '../utils/logger.js';

const router = express.Router();

// Verify webhook signature (adjust based on your provider's requirements)
const isValidSignature = (req) => {
  if (process.env.NODE_ENV === 'development' && !process.env.WEBHOOK_SECRET) {
    return true; // Skip validation in development if no secret is set
  }
  
  try {
    const signature = req.headers['x-webhook-signature'];
    const secret = process.env.WEBHOOK_SECRET || 'test-secret';
    const payload = JSON.stringify(req.body);
    
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const calculatedSignature = hmac.digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(signature)
    );
  } catch (error) {
    logger.error('Signature validation error', error);
    return false;
  }
};

router.post('/', async (req, res) => {
  try {
    const { event, data } = req.body;
    
    if (!isValidSignature(req)) {
      logger.warn('Invalid webhook signature', {
        ip: req.ip,
        event
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    logger.info(`Processing webhook event: ${event}`, {
      paymentId: data?.paymentId,
      event
    });
    
    switch (event) {
      case 'payment_success':
        logger.info(`Payment Success: ${data.paymentId}`);
        // Update order status in Wix
        try {
          await axios.post(process.env.WIX_WEBHOOK_ENDPOINT || 'https://api.wix.com/updateOrderStatus', {
            orderId: data.orderId,
            status: 'PAID',
            paymentId: data.paymentId,
          }, {
            headers: {
              'Authorization': `Bearer ${process.env.WIX_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          logger.info(`Successfully updated Wix order status: ${data.orderId}`);
        } catch (wixError) {
          logger.error(`Failed to update Wix order status: ${wixError.message}`, {
            orderId: data.orderId,
            response: wixError.response?.data
          });
        }
        break;
        
      case 'payment_failed':
        logger.info(`Payment Failed: ${data.paymentId}`);
        // Update order status in Wix
        try {
          await axios.post(process.env.WIX_WEBHOOK_ENDPOINT || 'https://api.wix.com/updateOrderStatus', {
            orderId: data.orderId,
            status: 'FAILED',
            paymentId: data.paymentId,
          }, {
            headers: {
              'Authorization': `Bearer ${process.env.WIX_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          logger.info(`Successfully updated Wix order status for failed payment: ${data.orderId}`);
        } catch (wixError) {
          logger.error(`Failed to update Wix order status for failed payment: ${wixError.message}`, {
            orderId: data.orderId,
            response: wixError.response?.data
          });
        }
        break;
        
      case 'payment_captured':
        logger.info(`Payment Captured: ${data.paymentId}`);
        // Process captured payment
        break;
        
      case 'payment_refunded':
        logger.info(`Payment Refunded: ${data.paymentId}`);
        // Process refund
        break;
        
      default:
        logger.info(`Unhandled webhook event: ${event}`);
        break;
    }
    
    // Return successful response
    res.status(200).json({ 
      success: true,
      message: `Event ${event} processed successfully`
    });
  } catch (error) {
    logger.error(`Webhook processing error: ${error.message}`, {
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
