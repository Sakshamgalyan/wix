import dotenv from 'dotenv';
// Load test environment variables
dotenv.config({ path: '.env' });

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Create test data
const orderId = `order_${Date.now()}`;
const amount = 49.99;
const currency = 'USD';
const idempotencyKey = uuidv4();

// Mock server configuration
const MOCK_SERVER_URL = 'http://localhost:4000';

// Start the test
console.log('======= PAYMENT INTEGRATION TEST ========');
console.log('Testing with gateway URL:', MOCK_SERVER_URL);

// Create a new payment
async function runTests() {
  try {
    // 1. Create payment
    console.log('\n1. Creating payment...');
    const createResponse = await axios.post(`${MOCK_SERVER_URL}/payments`, {
      amount,
      currency,
      orderId,
      callbackUrl: 'http://localhost:4000/callback',
      idempotencyKey
    });
    
    const paymentId = createResponse.data.id;
    console.log('Payment created with ID:', paymentId);
    console.log('Approval URL:', createResponse.data.approval_Url);
    
    // 2. Check payment status
    console.log('\n2. Checking payment status...');
    const statusResponse = await axios.get(`${MOCK_SERVER_URL}/payments/${paymentId}`);
    console.log('Payment status:', statusResponse.data.status);
    
    // 3. Capture payment (will only work after approval in real scenario)
    console.log('\n3. Capturing payment...');
    const captureResponse = await axios.post(`${MOCK_SERVER_URL}/payments/${paymentId}/capture`, {
      amount
    });
    console.log('Capture response:', captureResponse.data);
    
    // 4. Process a partial refund
    console.log('\n4. Processing partial refund...');
    const refundResponse = await axios.post(`${MOCK_SERVER_URL}/payments/${paymentId}/refund`, {
      amount: amount / 2,
      reason: 'Customer requested partial refund'
    });
    console.log('Refund response:', refundResponse.data);
    
    // 5. Check payment status again
    console.log('\n5. Checking payment status after refund...');
    const statusAfterRefundResponse = await axios.get(`${MOCK_SERVER_URL}/payments/${paymentId}`);
    console.log('Payment status after refund:', statusAfterRefundResponse.data.status);
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

runTests(); 