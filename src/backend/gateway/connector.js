import axios from 'axios';
import { logger } from '../../utils/logger';

class CustomerGateway {
    constructor(){
        this.apiKey = process.env.GATEWAY_API_KEY;
        this.baseUrl = process.env.GATEWAY_URL;
    }
    //createpayment
    async createPayment(order){
        try {
            const response = await axios.post(`${this.baseUrl}/payments`, {
                amount: order.amount,
                currency: order.currency,
                orderId: order.id,
                callbackUrl: `${this.baseUrl}/webhooks/payment`,
            }, {
                headers: {      
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return {
                paymentId: response.data.id,
                approvalUrl: response.data.approval_Url,
            };
        } catch ( error ) {
            logger.error(`Create Payment Error: ${error.message}`);
            throw new Error('Payment Processing Failed');
        }
    }
    //capturePayment

    
}