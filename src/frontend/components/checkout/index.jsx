import React, { useState } from "react";
import './styles.css';

export default function Checkout({ paymentId, amount, currency }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);

    const handlePayment = async () => {
        setIsProcessing(true);
        setError(null);

        try {
            // Simulate payment processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log('Payment processed:', { paymentId, amount, currency });
            setError(null);
        } catch (err) {
            setError(err.message || "Payment processing failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="checkout-container">
            <h3>Complete Payment</h3>
            <p>Total: {amount} {currency}</p>

            <div className="payment-method">
                <label>
                    <input type="radio" name="paymentMethod" defaultChecked/>
                    Credit Card/Debit Card
                </label>
                <label>
                    <input type="radio" name="paymentMethod" />
                    UPI
                </label>
                <label>
                    <input type="radio" name="paymentMethod" />
                    Bank Transfer
                </label>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
                onClick={handlePayment}
                disabled={isProcessing} 
                className="pay-button"
            >
                {isProcessing ? "Processing..." : `Pay ${amount} ${currency}`}
            </button>
        </div>
    );
}