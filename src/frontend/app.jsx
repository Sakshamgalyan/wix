import React from 'react';
import Checkout from './components/checkout';

export default function App() {
    // Development mode data
    const paymentData = {
        paymentId: "test-payment-123",
        amount: "99.99",
        currency: "USD"
    };

    return (
        <div className="app">
            <Checkout {...paymentData} />
        </div>
    );
}