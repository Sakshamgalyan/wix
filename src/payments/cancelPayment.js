import { gateway } from '../backend/gateway/connector.js';
import { logger } from '../utils/logger.js';

export async function post(req) {
    const {paymentId} = req.body;
    
    if (!paymentId) {
        throw new Error('Payment ID is required');
    }
    
    try {
        const payment = await gateway.cancelPayment({
            paymentId
        });
        
        logger.info(`Payment cancelled for ${paymentId}`);

        return {
            body: {
                paymentId: payment.paymentId,
                status: payment.status
            },
        };
    } catch (error) {
        logger.error(`Cancel Payment Failed: ${error.message}`);
        throw new Error('Failed to cancel payment');
    }
}