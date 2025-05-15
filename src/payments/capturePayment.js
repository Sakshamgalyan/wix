import { gateway } from '../backend/gateway/connector.js';
import { logger } from '../utils/logger.js';

export async function post(req) {
    const {paymentId, amount} = req.body;
    
    if (!paymentId) {
        throw new Error('Payment ID is required');
    }
    
    try {
        const payment = await gateway.capturePayment({
            paymentId,
            amount
        });
        
        logger.info(`Payment captured for ${paymentId}`);

        return {
            body: {
                paymentId: payment.paymentId,
                status: payment.status
            },
        };
    } catch (error) {
        logger.error(`Capture Payment Failed: ${error.message}`);
        throw new Error('Failed to capture payment');
    }
}