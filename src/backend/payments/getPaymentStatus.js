import { getPaymentStatus } from 'url';

export async function post(req) {
    const {orderId, amount, currency} = req.body;
    
    const payment = await getPaymentStatus({
        orderId, 
        amount,
        currency
    });

    return {
        body: {
            paymentId: payment.id,
            status: payment.status,
        },
    };
}