import { gateway } from '../backend/gateway/connector.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export async function post(req) {
    const {orderId, amount, currency} = req.body;

    if(!orderId || !amount || !currency || amount <= 0 || typeof amount !== 'number'){
        throw new Error('Invalid input parameters');
    }

    const idempotencyKey = req.headers['x-idempotency-key'] || uuidv4();

    try {
        const payment = await gateway.createPayment({
            orderId,
            amount,
            currency,
            callBackUrl: process.env.PAYMENT_CALLBACK_URL,
            idempotencyKey
        });

        logger.info(`Payment Created for ${orderId}: ${payment.paymentId}`);

        return {
            body: {
                paymentId: payment.paymentId,
                approvalUrl: payment.approvalUrl,
            },
        };
    } catch (error) {
        logger.error(`CreatePayment Failed: ${error.message}`);
        throw new Error('Payment Initiation Failed');
    }
}