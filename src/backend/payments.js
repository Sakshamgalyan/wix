import express from 'express';

const paymentsRouter = (payments) => {
  const router = express.Router();

  router.post('/create', async (req, res) => {
    try {
      // Input validation
      const { orderId, amount, currency } = req.body;
      
      if (!orderId || !amount || !currency) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['orderId', 'amount', 'currency']
        });
      }

      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          error: 'Invalid amount',
          message: 'Amount must be a positive number'
        });
      }

      // Process payment
      const result = await payments.createPayment({
        orderId,
        amount: Number(amount),
        currency
      });

      // Standardized successful response
      res.json({
        success: true,
        paymentId: result.id || `mock_${Date.now()}`,
        status: 'pending',
        redirectUrl: result.url || 'http://localhost:3000/mock-checkout',
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      // Enhanced error handling
      const status = err.status || 500;
      res.status(status).json({
        success: false,
        error: err.message || 'Payment processing failed',
        ...(process.env.NODE_ENV === 'development' && {
          stack: err.stack
        })
      });
    }
  });

  return router;
};

export default paymentsRouter;