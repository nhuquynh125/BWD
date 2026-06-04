You are an expert Node.js and Express developer. Your task is to implement a Booking API AdapterFactory architecture based on the provided plan.

<objective>
Build a Factory/Adapter Pattern architecture to flexibly handle multiple payment methods and tour booking services (VNPay, MoMo, Klook, Direct) without bloating the main Booking route.
</objective>

<context>
- The adapters will require mock environment variables for the Secret Keys of VNPay and MoMo. You should simulate the payment URL generation logic and signature encryption (HMAC SHA512 for VNPay and SHA256 for MoMo).
- The current focus is on VNPay and MoMo instead of Ticketbox, as these providers are more popular in Vietnam and their payment logic is well-suited for a direct tour booking system.
</context>

<instructions>
Please implement the following files exactly as described:

1. `services/booking/adapters/BaseAdapter.js` [NEW]
Create an abstract base class to ensure all adapters (VNPay, MoMo, etc.) follow the same interface standard, including:
- `createPaymentUrl(bookingData)`: Generates a URL to redirect the user to the payment page.
- `verifyWebhook(payload, signature)`: Returns true/false to ensure the webhook's security.
- `processPaymentReturn(query)`: Handles the logic when a user is redirected back to the website from the payment gateway.

2. `services/booking/adapters/VNPayAdapter.js` [NEW]
Inherits from `BaseAdapter`, specifically handling the VNPay gateway:
- Build the `vnp_Params` object and create a secure signature using the HMAC SHA512 algorithm.
- Check if `vnp_ResponseCode === '00'` on the return URL.

3. `services/booking/adapters/MoMoAdapter.js` [NEW]
Inherits from `BaseAdapter`, specifically handling the MoMo e-wallet:
- Create a request signature using HMAC SHA256 with keys: `accessKey`, `secretKey`, `partnerCode`.
- Communicate with the MoMo gateway to get the `payUrl`.

4. `services/booking/adapters/DirectAdapter.js` [NEW]
- Handles cash payment bookings.
- Automatically returns a "pending" status and does not need to create a payment URL (returns directly to the success page).

5. `services/booking/AdapterFactory.js` [NEW]
A factory to distribute Adapters:
- `getAdapter(providerName)`: Initializes and returns the corresponding payment provider instance based on `providerName` ('vnpay', 'momo', 'cash').

6. `routes/bookingRoutes.js` [MODIFY]
Change the logic to integrate the Factory:
- Remove hardcoded direct payment logic.
- `POST /`: Use `AdapterFactory.getAdapter(paymentProvider)` to call `createPaymentUrl`. Return the payment URL to the Frontend instead of automatically reporting "confirmed".
- `GET /payment/return/:provider`: Route to catch the return URL from the payment gateway. Call the `processPaymentReturn` logic of the corresponding Adapter to update the status in MongoDB (success / failed).
- `POST /webhook/:provider`: Update the webhook to verify secure signatures (`verifyWebhook`) and update the database.
</instructions>

<requirements>
- Provide the full, complete code for each new file.
- For `routes/bookingRoutes.js`, please provide the complete updated file or clear diffs showing exactly what needs to be changed.
- Ensure the code uses modern JavaScript (ES6+), handles errors gracefully, and follows best practices for Express applications.
</requirements>
