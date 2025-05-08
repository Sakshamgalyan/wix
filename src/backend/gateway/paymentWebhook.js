import { isValidsignature } from '../utils/security'
import { logger } from '../utils/logger';
import wixApi from 'wix-api';

export async function handlePaymentWebhook (req) {
    const { event, data } =req.body;

    if ( !isValidsignature(req, headers, data)){
        throw new Error("Invalid Signature");
    }
    try {
        switch (event) {
            case 'payment_success':
                logger.info(`Payment Success`);
                await wixApi.updateOrderStatus(data.orderId, {
                    status: 'PAID',
                    paymentId: data.paymentId,
                });
                break;

            case 'payment_failed':
                logger.info(`Payment Failed`);
                await wixApi.updateOrderStatus(data.orderId, {
                    status: 'FAILED',
                    paymentId: data.paymentId,
                });
                break;

            default:
                logger.info(`Unknown Event: ${event}`);
                break;
        }
        logger.paymentEvenr(data.paymentId, event, data);
        return {
            body: { success: true },
        }
    }catch (error) {
        logger.error(`Payment Webhook Error: ${error.message}`);
        throw new Error('Webhook Processing Failed');
    }
}

function isValidsignature(headers, data) {
    const signature = headers['signature'];
    const expectedSignature = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET)
        .update(JSON.stringify(data))
        .digest('hex');
    return signature === expectedSignature;
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

module.exports = { handlePaymentWebhook, validateWebhook };