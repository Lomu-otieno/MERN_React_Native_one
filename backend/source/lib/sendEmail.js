import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const sendEmail = async (to, subject, html) => {
  try {
    console.log(`📧 Attempting to send email to: ${to} via Gmail`);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("Gmail credentials not configured");
    }

    // Improved Gmail transporter configuration
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // Use TLS
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 10000, // Shorter timeout
      socketTimeout: 10000,
      greetingTimeout: 10000,
      // Remove pooling for simpler connections
      tls: {
        ciphers: "SSLv3",
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: `"Lomu Dating" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
    };

    console.log("🔧 Testing Gmail connection...");
    await transporter.verify();
    console.log("✅ Gmail connection verified");

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully via Gmail");
    return result;
  } catch (error) {
    console.error("❌ Gmail error:", error.message);

    // Fallback to Ethereal
    console.log("🔄 Falling back to Ethereal.email...");
    return await sendEmailWithEthereal(to, subject, html);
  }
};

// Fallback function using Ethereal.email
const sendEmailWithEthereal = async (to, subject, html) => {
  try {
    console.log("📧 Creating Ethereal test account...");

    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const result = await transporter.sendMail({
      from: `"Lomu" <${testAccount.user}>`,
      to: to,
      subject: subject,
      html: html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(result);
    console.log("✅ Email sent via Ethereal! Preview:", previewUrl);

    return result;
  } catch (fallbackError) {
    console.error("❌ Ethereal fallback also failed:", fallbackError);

    // Final fallback: just log the reset link
    const resetLinkMatch = html.match(/https?:\/\/[^\s"']+/);
    if (resetLinkMatch) {
      console.log("🔗 RESET LINK FOR MANUAL USE:", resetLinkMatch[0]);
    }

    throw new Error("All email services unavailable");
  }
};

export default sendEmail;
