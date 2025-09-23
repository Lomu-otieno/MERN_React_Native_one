import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const sendEmail = async (to, subject, html) => {
  try {
    console.log(`📧 Attempting to send email to: ${to}`);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("Email credentials not configured");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Use app password, not regular password
      },
    });

    const mailOptions = {
      from: `"Lomu Dating" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully via Gmail");
    return result;
  } catch (error) {
    console.error("❌ Gmail error:", error);

    // Fallback: log the email details
    console.log("📝 Email details for manual sending:");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("HTML:", html);

    throw new Error("Email service temporary unavailable");
  }
};

export default sendEmail;
