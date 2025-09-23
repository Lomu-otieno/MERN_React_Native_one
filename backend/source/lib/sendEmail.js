import nodemailer from "nodemailer";

const sendEmail = async (to, subject, html) => {
  try {
    // Create a test account (works immediately, no setup)
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
    console.log("✅ Email sent! Preview:", previewUrl);

    return result;
  } catch (error) {
    console.error("❌ Email failed:", error);
    throw error;
  }
};

export default sendEmail;
