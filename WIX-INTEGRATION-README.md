# Wix Integration Setup Guide

This guide explains how to set up Wix OAuth integration for payment processing in your application.

## Prerequisites

1. A Wix Developer account
2. A registered Wix app
3. Your Wix app credentials (App ID and App Secret)

## OAuth Authentication Setup

The application uses OAuth Client Credentials for authentication as recommended by Wix (rather than the legacy custom authentication). This approach is more secure and easier to implement.

### 1. Create a .env File

Create a `.env` file in the root directory of your project and add the following environment variables:

```
# Wix OAuth credentials
WIX_APP_ID=your_app_id_here
WIX_APP_SECRET=your_app_secret_here
```

Replace the placeholder values with your actual Wix app credentials.

### 2. Install Required Packages

Make sure you have the necessary Wix SDK packages installed:

```bash
npm install @wix/sdk @wix/ecom
```

### 3. Authentication Process

The application uses the App credentials strategy from the Wix SDK to authenticate API calls with OAuth. This implementation:

- Automatically falls back to mock implementation if Wix credentials are missing
- Provides graceful error handling
- Uses secure credential storage via environment variables

## Wix eCommerce Modules

The integration uses the following modules from the @wix/ecom package:

- `currentCart`: For accessing cart settings and operations
- `orders`: For managing orders
- `orderTransactions`: For handling payment transactions

These modules are used to provide payment processing functionality in the application, with a fallback mock implementation when Wix integration is not available.

## Testing the Integration

You can test if your Wix integration is working by accessing the following endpoints:

1. **Health Check**:
   ```
   GET http://localhost:3000/health
   ```
   This will show if the Wix client is connected.

2. **Payments Health Check**:
   ```
   GET http://localhost:3000/payments/health
   ```
   This will display the payment system status, including whether it's using the real Wix API or the mock implementation.

3. **Create a Test Payment**:
   ```
   POST http://localhost:3000/payments/create
   Content-Type: application/json

   {
     "orderId": "test_123",
     "amount": 10.99,
     "currency": "USD",
     "customerInfo": {
       "email": "test@example.com",
       "name": "Test Customer"
     }
   }
   ```

4. **Check Payment Status**:
   ```
   GET http://localhost:3000/payments/{paymentId}/status
   ```

5. **Capture a Payment**:
   ```
   POST http://localhost:3000/payments/{paymentId}/capture
   ```

## OAuth vs. Legacy Authentication

As per the [Wix documentation](https://dev.wix.com/docs/build-apps/develop-your-app/access/authentication/about-oauth), OAuth is the recommended method for authentication because:

1. It helps prevent corrupted installations
2. It's simpler to implement (no need for redirects or refresh token management)
3. It avoids issues with cloned sites bypassing consent flows

## Troubleshooting

If you encounter issues with the Wix integration:

1. **Verify Credentials**: Ensure your App ID and App Secret are correct
2. **Check Connection**: Make sure your application can connect to Wix servers
3. **Examine Logs**: Review the application logs for error details
4. **Fallback Mode**: The application will automatically fall back to a mock implementation if Wix authentication fails

## Implementation Notes

- If the real Wix integration fails, the application will use a mock implementation to ensure functionality
- The mock implementation stores payment data in memory and simulates all payment operations
- The integration automatically detects if proper Wix credentials are available and chooses the appropriate implementation

## Additional Resources

- [Wix OAuth Documentation](https://dev.wix.com/docs/build-apps/develop-your-app/access/authentication/about-oauth)
- [Wix E-commerce API Documentation](https://dev.wix.com/api/rest/wix-e-commerce) 