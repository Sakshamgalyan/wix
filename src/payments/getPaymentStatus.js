import { gateway } from '../backend/gateway/connector.js';
import { logger } from '../utils/logger.js';

export async function post(req) {
    const {paymentId} = req.body;
    
    if (!paymentId) {
        throw new Error('Payment ID is required');
    }
    
    try {
        const payment = await gateway.getPaymentStatus({
            paymentId
        });
        
        logger.info(`Payment status retrieved for ${paymentId}: ${payment.status}`);

        return {
            body: {
                paymentId: payment.paymentId,
                status: payment.status,
                amount: payment.amount,
                currency: payment.currency
            },
        };
    } catch (error) {
        logger.error(`Get Payment Status Failed: ${error.message}`);
        throw new Error('Failed to retrieve payment status');
    }
}