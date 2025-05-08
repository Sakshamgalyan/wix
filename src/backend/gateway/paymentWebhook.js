import axios from 'axios';

export default async function handlePaymentWebhook(req) {
    const { event, data } = req.body;

    if (!isValidsignature(req, headers, data)) {
        throw new Error("Invalid Signature");
    }

    try {
        switch (event) {
            case 'payment_success':
                logger.info(`Payment Success`);
                await axios.post('https://api.wix.com/updateOrderStatus', {
                    orderId: data.orderId,
                    status: 'PAID',
                    paymentId: data.paymentId,
                });
                break;

            case 'payment_failed':
                logger.info(`Payment Failed`);
                await axios.post('https://api.wix.com/updateOrderStatus', {
                    orderId: data.orderId,
                    status: 'FAILED',
                    paymentId: data.paymentId,
                });
                break;

            default:
                logger.info(`Unknown Event: ${event}`);
                break;
        }
        logger.paymentEvent(data.paymentId, event, data);
        return {
            body: { success: true },
        };
    } catch (error) {
        logger.error(`Payment Webhook Error: ${error.message}`);
        throw new Error('Webhook Processing Failed');
    }
}
