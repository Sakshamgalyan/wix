import { gateway } from '../backend/gateway/connector.js';
import { logger } from '../utils/logger.js';

export async function post(req) {
    const {paymentId, amount, reason} = req.body;
    
    if (!paymentId || !amount || amount <= 0) {
        throw new Error('Valid payment ID and amount are required');
    }
    
    try {
        const refund = await gateway.refundPayment({
            paymentId,
            amount,
            reason: reason || 'Requested by customer',
        });

        logger.info(`Refund processed: ${refund.refundId}`);

        return {
            body: { 
                success: true, 
                refundId: refund.refundId,
                status: refund.status
            },
        };
    }
    catch (error) {
        logger.error(`RefundPayment Failed: ${error.message}`);
        throw new Error('Refund processing failed');
    }
}