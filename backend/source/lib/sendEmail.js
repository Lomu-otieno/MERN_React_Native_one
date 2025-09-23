import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const sendEmail = async (to, subject, html) => {
  try {
    console.log("=== EMAIL DEBUG INFO ===");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("From email:", process.env.EMAIL_USER);
    console.log("PASSWORD_URI:", process.env.PASSWORD_URI);

    // Extract reset token from HTML for debugging
    const tokenMatch = html.match(/token=([a-f0-9]+)/);
    if (tokenMatch) {
      console.log("🔐 Reset token generated:", tokenMatch[1]);
    }

    // For now, just log the email instead of sending
    console.log("📧 Email would be sent with content:");
    console.log(html);

    // Simulate success for testing
    console.log("✅ Email simulation successful (not actually sent)");

    return { messageId: "simulated-" + Date.now() };
  } catch (error) {
    console.error("❌ Email simulation error:", error);
    throw new Error(`Email service unavailable: ${error.message}`);
  }
};

export default sendEmail;
