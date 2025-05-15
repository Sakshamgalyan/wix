import express from 'express';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(bodyParser.json());

// In-memory storage for payment data
const payments = new Map();
const refunds = new Map();

// Create payment endpoint
app.post('/payments', (req, res) => {
  const { amount, currency, orderId, callbackUrl } = req.body;
  const paymentId = `mock_${Date.now()}_${uuidv4().substring(0, 8)}`;
  
  const payment = {
    id: paymentId,
    amount,
    currency,
    orderId,
    callbackUrl,
    status: 'PENDING',
    created_at: new Date().toISOString(),
    approval_Url: `http://localhost:4000/approve/${paymentId}`
  };
  
  payments.set(paymentId, payment);
  
  console.log('Payment created:', payment);
  
  res.status(201).json({
    id: paymentId,
    approval_Url: payment.approval_Url,
    status: payment.status
  });
});

// Get payment status endpoint
app.get('/payments/:paymentId', (req, res) => {
  const { paymentId } = req.params;
  const payment = payments.get(paymentId);
  
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  
  res.json({
    id: payment.id,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    created_at: payment.created_at
  });
});

// Capture payment endpoint
app.post('/payments/:paymentId/capture', (req, res) => {
  const { paymentId } = req.params;
  const { amount } = req.body;
  
  const payment = payments.get(paymentId);
  
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  
  if (payment.status !== 'AUTHORIZED' && payment.status !== 'PENDING') {
    return res.status(400).json({ 
      error: 'Payment cannot be captured', 
      status: payment.status 
    });
  }
  
  payment.status = 'CAPTURED';
  payment.captured_at = new Date().toISOString();
  payment.captured_amount = amount || payment.amount;
  
  payments.set(paymentId, payment);
  
  console.log('Payment captured:', payment);
  
  res.json({
    id: payment.id,
    status: payment.status,
    amount: payment.captured_amount
  });
});

// Refund payment endpoint
app.post('/payments/:paymentId/refund', (req, res) => {
  const { paymentId } = req.params;
  const { amount, reason } = req.body;
  
  const payment = payments.get(paymentId);
  
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  
  if (payment.status !== 'CAPTURED') {
    return res.status(400).json({ 
      error: 'Payment cannot be refunded', 
      status: payment.status 
    });
  }
  
  const refundId = `refund_${Date.now()}_${uuidv4().substring(0, 8)}`;
  
  const refund = {
    id: refundId,
    payment_id: paymentId,
    amount,
    reason,
    status: 'COMPLETED',
    created_at: new Date().toISOString()
  };
  
  refunds.set(refundId, refund);
  
  // Update payment status if full refund
  if (amount >= payment.amount) {
    payment.status = 'REFUNDED';
  } else {
    payment.status = 'PARTIALLY_REFUNDED';
  }
  
  payment.refunded_amount = (payment.refunded_amount || 0) + amount;
  payments.set(paymentId, payment);
  
  console.log('Payment refunded:', refund);
  
  res.json({
    id: refundId,
    status: refund.status,
    amount
  });
});

// Cancel payment endpoint
app.post('/payments/:paymentId/cancel', (req, res) => {
  const { paymentId } = req.params;
  
  const payment = payments.get(paymentId);
  
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  
  if (payment.status !== 'PENDING' && payment.status !== 'AUTHORIZED') {
    return res.status(400).json({ 
      error: 'Payment cannot be cancelled', 
      status: payment.status 
    });
  }
  
  payment.status = 'CANCELLED';
  payment.cancelled_at = new Date().toISOString();
  
  payments.set(paymentId, payment);
  
  console.log('Payment cancelled:', payment);
  
  res.json({
    id: payment.id,
    status: payment.status
  });
});

// Payment approval page simulation
app.get('/approve/:paymentId', (req, res) => {
  const { paymentId } = req.params;
  const payment = payments.get(paymentId);
  
  if (!payment) {
    return res.status(404).send('Payment not found');
  }
  
  if (payment.status === 'PENDING') {
    payment.status = 'AUTHORIZED';
    payment.authorized_at = new Date().toISOString();
    payments.set(paymentId, payment);
    
    // Simulate webhook callback
    if (payment.callbackUrl) {
      console.log(`Would send webhook to ${payment.callbackUrl}`);
    }
  }
  
  res.send(`
    <html>
      <head>
        <title>Mock Payment Gateway</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
          .success { color: green; }
          .details { margin-top: 20px; background: #f5f5f5; padding: 10px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Payment ${payment.status}</h1>
          <p class="success">Your payment has been authorized successfully.</p>
          
          <div class="details">
            <h3>Payment Details</h3>
            <p>Payment ID: ${payment.id}</p>
            <p>Amount: ${payment.amount} ${payment.currency}</p>
            <p>Status: ${payment.status}</p>
            <p>Order ID: ${payment.orderId}</p>
          </div>
          
          <p>This is a mock payment gateway for testing purposes.</p>
        </div>
      </body>
    </html>
  `);
});

// Start the server
const PORT = process.env.MOCK_GATEWAY_PORT || 4000;
app.listen(PORT, () => {
  console.log(`Mock payment gateway running on http://localhost:${PORT}`);
  console.log(`Try the payment flow at http://localhost:${PORT}/payments`);
}); 