import express from "express";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

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

(async () => {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  try {
    const res = await axios.get(process.env.MPESA_AUTH_URL, {
      headers: { Authorization: `Basic ${auth}` },
    });
    console.log("✅ Access Token:", res.data.access_token);
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
  }
})();

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

revenueRouter.post("/mpesa-callback", (req, res) => {
  const paymentData = req.body;
  console.log("💰 Payment Notification:", paymentData);

  // Handle success (ResultCode 0) or failure
  if (paymentData.Body?.stkCallback?.ResultCode === 0) {
    const metadata = paymentData.Body.stkCallback.CallbackMetadata?.Item;
    console.log("✅ Payment Successful! Metadata:", metadata);
    // TODO: Update database here
  } else {
    console.log(
      "❌ Payment Failed:",
      paymentData.Body?.stkCallback?.ResultDesc
    );
  }

  res.status(200).send(); // Always acknowledge
});

export default revenueRouter; // Export the router
