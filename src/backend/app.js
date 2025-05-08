require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./utils/logger');
const { validateRequest } = require('./utils/security');
const { Wix } = require('@wix/sdk');
const cors = require('cors');

const app = express();

const wix = new Wix({
    appKey: process.env.WIX_APP_KEY,
    appSecret: process.env.WIX_APP_SECRET,
});

app.use(cors({
    origin: [
        'https://localhost:3000',
        'https://your-production-domain.com'
    ]
}));

app.use(bodyParser.json());
app.use(validateRequest);
app.use((req, res, next) => {
    logger.info(`Incoming ${req.method} request to ${req.path}`);
    next();
})

app.use('/payments', require('./payments')(wix));
app.use('/webhooks', require('./gateway/paymentWebhook'));

app.use((err, req, res, next) => {
    logger.error(`Payment Error: ${err.message}`);
    res.status(500).json({ error: 'Payment processing failed' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`Server is running on port ${PORT}`));