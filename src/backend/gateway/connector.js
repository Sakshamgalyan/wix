import axios from 'axios';
import { logger } from '../../utils/logger.js';

class CustomerGateway {
    constructor(){
        this.apiKey = process.env.GATEWAY_API_KEY;
        this.baseUrl = process.env.GATEWAY_URL;
    }
    
    async createPayment(order){
        try {
            const response = await axios.post(`${this.baseUrl}/payments`, {
                amount: order.amount,
                currency: order.currency,
                orderId: order.orderId,
                callbackUrl: order.callBackUrl,
                idempotencyKey: order.idempotencyKey
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
        } catch (error) {
            logger.error(`Create Payment Error: ${error.message}`);
            throw new Error('Payment Processing Failed');
        }
    }
    
    async getPaymentStatus(params){
        try {
            const response = await axios.get(`${this.baseUrl}/payments/${params.paymentId}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return {
                paymentId: response.data.id,
                status: response.data.status,
                amount: response.data.amount,
                currency: response.data.currency
            };
        } catch (error) {
            logger.error(`Get Payment Status Error: ${error.message}`);
            throw new Error('Payment Status Retrieval Failed');
        }
    }
    
    async capturePayment(params){
        try {
            const response = await axios.post(`${this.baseUrl}/payments/${params.paymentId}/capture`, {
                amount: params.amount
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return {
                paymentId: response.data.id,
                status: response.data.status
            };
        } catch (error) {
            logger.error(`Capture Payment Error: ${error.message}`);
            throw new Error('Payment Capture Failed');
        }
    }
    
    async refundPayment(params){
        try {
            const response = await axios.post(`${this.baseUrl}/payments/${params.paymentId}/refund`, {
                amount: params.amount,
                reason: params.reason || 'Customer requested'
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return {
                refundId: response.data.id,
                status: response.data.status
            };
        } catch (error) {
            logger.error(`Refund Payment Error: ${error.message}`);
            throw new Error('Payment Refund Failed');
        }
    }
    
    async cancelPayment(params){
        try {
            const response = await axios.post(`${this.baseUrl}/payments/${params.paymentId}/cancel`, {}, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return {
                paymentId: response.data.id,
                status: response.data.status
            };
        } catch (error) {
            logger.error(`Cancel Payment Error: ${error.message}`);
            throw new Error('Payment Cancellation Failed');
        }
    }
}

const gateway = new CustomerGateway();
export { gateway };