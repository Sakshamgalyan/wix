import React, { useState } from "react";
import { useWix } from '@wix/sdk-react'
import '../../compoents/checkout/styles.css'

export default async function Checkout({paymentId, amount, currency}) {
    const { wix } = useWix();
    const [ isProcessing, setisProcessing ] = useState(false);
    const [ error, setError ] = useState(null);

    const handlePayment = async () => {
        setisProcessing(true);
        setError(null);
    }

    try {
        const result = await wix.fetch('../../payments/createPayment', {
            method: 'POST',
            body: JSON.stringify({ paymentId})
        });

        if (result.success) {
            wix.redirectToThankYouPage();
        } else{
            setError("Payment failed. Please try again.");
        }

    } catch (err) {
        setError(err.message);
    } finally {
        setisProcessing(false);
    }
}

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
)