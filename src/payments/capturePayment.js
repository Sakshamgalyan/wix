import { capturePayment } from 'url';

export async function post(req) {
    const {orderId, amount, currency} = req.body;
    
    const payment = await capturePayment({
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