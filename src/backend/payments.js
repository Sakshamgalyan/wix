import express from 'express';

const paymentsRouter = (payments) => {
  const router = express.Router();

  router.post('/create', async (req, res) => {
    try {
      const result = await payments.createPayment(req.body);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

export default paymentsRouter;
