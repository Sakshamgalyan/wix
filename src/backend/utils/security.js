const crypto = require('crypto');
// const { json } = require('stream/consumers');

function validateRequest (req, res , next) {
    const apiKey = req.header('api-key');

    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized'})
    }
    next();
}

function isValidsignature ( header, body, secret) {
    const signature = header['x-signature'];
    const excepted = crypto.createHmac('sha256', secret).update(json.stringify(body)).digest('hex');
    
    if (signature !== excepted) {
        throw new Error('Invalid Signature');
    }
}

function validateWebhook (req){
    const signature = req.header('x-signature');
    const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');
    if (signature !== hmac) {
        throw new Error('Invalid Signature');
    }

}


module.exports = {
    validateRequest,
    isValidsignature,
    validateWebhook,
};