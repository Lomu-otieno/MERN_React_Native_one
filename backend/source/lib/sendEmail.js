import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const sendEmail = async (to, subject, html) => {
  try {
    console.log(`📧 Attempting to send email to: ${to} via Gmail`);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("Gmail credentials not configured");
    }

    // Gmail transporter configuration
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Additional options for better compatibility
      pool: true,
      maxConnections: 1,
      rateDelta: 10000,
      rateLimit: 3,
      connectionTimeout: 30000,
      socketTimeout: 30000,
      secure: true,
      tls: {
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

    // Verify connection first
    await transporter.verify();
    console.log("✅ Gmail connection verified");

    // Send email
    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully via Gmail");
    console.log("📫 Message ID:", result.messageId);

    return result;
  } catch (error) {
    console.error("❌ Gmail error:", error);

    // Log the reset link for manual use if email fails
    const resetLinkMatch = html.match(/https?:\/\/[^\s"']+/);
    if (resetLinkMatch) {
      console.log("🔗 RESET LINK FOR MANUAL USE:", resetLinkMatch[0]);
    }

    throw new Error(
      "Email service unavailable. Reset link generated but not sent."
    );
  }
};

export default sendEmail;
