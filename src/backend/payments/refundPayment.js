import { refundPayment } from 'url';
import { logger } from '../logger.js';

export async function post(req) {
    const {paymentId, amount, reason} = req.body;
    
    try {
        const refund = await refundPayment({
            paymentId,
            amount,
            reason: reason || 'Requested by customer',
        });

        logger.info(`Refund processed: ${refund.id}`);

        return {
            body: { success: true, refundId: refund.id},
        };
    }
    catch (error) {
        logger.error(`RefundPayment Failed: ${error.message}`);
        throw new Error('Refund processing failed');
    }
}

module.exports = { post };