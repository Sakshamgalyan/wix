import crypto from 'crypto';

export const verifyWixWebhook = (secret) => (req, res, next) => {
  try {
    const signature = req.headers['x-wix-signature'];
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(JSON.stringify(req.body)).digest('base64');
    
    if (signature !== digest) {
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: 'Webhook verification failed' });
  }
};