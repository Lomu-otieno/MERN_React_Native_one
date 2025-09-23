import nodemailer from "nodemailer";

const sendEmail = async (to, subject, html) => {
  try {
    console.log(`📧 Creating test email account for: ${to}`);

    // Create a FREE test email account (no signup required)
    const testAccount = await nodemailer.createTestAccount();

    console.log("✅ Ethereal test account created!");
    console.log("📧 Test email:", testAccount.user);
    console.log("🔑 Test password:", testAccount.pass);
    console.log("🌐 Check inbox at: https://ethereal.email");

    // Create transporter using Ethereal
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const mailOptions = {
      from: `"Lomu Dating" <${testAccount.user}>`,
      to: to,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF0050;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You requested a password reset. Click the button below:</p>
          <a href="${html.match(/https?:\/\/[^\s]+/)[0]}" 
             style="background: #FF0050; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
          <p><strong>This link expires in 10 minutes.</strong></p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            Or copy this link: ${html.match(/https?:\/\/[^\s]+/)[0]}
          </p>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);

    // Get the preview URL to view the sent email
    const previewUrl = nodemailer.getTestMessageUrl(result);
    console.log("✅ Email sent successfully!");
    console.log("👀 Preview URL:", previewUrl);

    return result;
  } catch (error) {
    console.error("❌ Email sending failed:", error);

    // Fallback: log the reset link for manual testing
    const resetLink = html.match(/https?:\/\/[^\s]+/)[0];
    console.log("🔗 RESET LINK FOR MANUAL TESTING:", resetLink);

    throw new Error("Email service temporary unavailable");
  }
};

export default sendEmail;
