import express from "express";
import axios from "axios";

const revenueRouter = express.Router(); // Fixed: Router is a function, so call it.

// M-Pesa Authentication (Get Access Token)
const getAuthToken = async () => {
  try {
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString("base64");
    const response = await axios.get(process.env.MPESA_AUTH_URL, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });
    return response.data.access_token;
  } catch (error) {
    console.error("Error getting M-Pesa token:", error.response?.data);
    throw error;
  }
};

// M-Pesa STK Push Route
revenueRouter.post("/stkpush", async (req, res) => {
  try {
    const { phone, amount } = req.body; // Format: 254712345678

    const accessToken = await getAuthToken();
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, -3);
    const password = Buffer.from(
      `${process.env.MPESA_BUSINESS_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString("base64");

    const payload = {
      BusinessShortCode: process.env.MPESA_BUSINESS_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: process.env.MPESA_BUSINESS_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: "Test Payment",
      TransactionDesc: "Payment for services",
    };

    const response = await axios.post(process.env.MPESA_STKPUSH_URL, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error("STK Push Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to initiate STK Push" });
  }
});

revenueRouter.post("/api/mpesa-callback", (req, res) => {
  const paymentData = req.body;
  console.log("💰 Payment Received:", paymentData);

  // Validate the transaction
  if (paymentData.ResultCode === 0) {
    console.log("✅ Payment Successful!");
    // Update your database here
  } else {
    console.log("❌ Payment Failed:", paymentData.ResultDesc);
  }

  res.status(200).send(); // Always acknowledge receipt
});

export default revenueRouter; // Export the router
