import gateway from '../gateway/connector..js'
import { createPayment } from 'paysecure_url';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export async function post(req) {
    const {orderId, amount, currency} = req.body;

    if(!orderId || !amount || !currency || amount <= 0 || typeof amount !== 'number'){
        throw new Error({ code: 'InValid_Input', status: 400 });
    }

    const idempotencyKey = req.headers['x-idempotency-key'] || crypto.randomUUID();

    try {
        const payment = await gateway.createPayment({
            orderId,
            amount,
            currency,
            callBackUrl: "paysecure_callbackUrl",
            idempotencyKey
        });

        logger.info(`Payment Created for ${orderId}: ${payment.id}`);

        return {
            body: {
                paymentId: payment.id,
                status: payment.redirect_url,
            },
        };
    } catch (error) {
        logger.error(`CreatePayment Failed: ${error.message}`);
        throw new Error('Payment Initiation Failed');
    }
}

module.exports = { post };