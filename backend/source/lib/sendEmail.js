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
