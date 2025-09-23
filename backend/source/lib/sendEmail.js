import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const sendEmail = async (to, subject, html) => {
  try {
    // Validate environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("Email credentials not configured");
    }

    console.log(`📧 Attempting to send email to: ${to}`);
    console.log(`🔧 Using email: ${process.env.EMAIL_USER}`);

    // Try multiple SMTP configurations with fallbacks
    const transporterConfigs = [
      // Configuration 1: Standard Gmail with optimized settings
      {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
          ciphers: "SSLv3",
        },
        pool: true,
        maxConnections: 1,
        maxMessages: 5,
        rateDelta: 20000,
        rateLimit: 5,
        connectionTimeout: 15000,
        socketTimeout: 15000,
        greetingTimeout: 10000,
        debug: true, // Enable debug logging
        logger: true,
      },
      // Configuration 2: Alternative Gmail settings
      {
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        pool: true,
        maxConnections: 1,
        socketTimeout: 20000,
        connectionTimeout: 20000,
        secure: true,
        requireTLS: true,
        debug: true,
        logger: true,
      },
      // Configuration 3: Simple direct connection
      {
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 10000,
        socketTimeout: 10000,
        debug: true,
        logger: true,
      },
    ];

    let lastError = null;

    // Try each configuration until one works
    for (let i = 0; i < transporterConfigs.length; i++) {
      try {
        console.log(`🔄 Trying SMTP configuration ${i + 1}...`);

        const transporter = nodemailer.createTransport(transporterConfigs[i]);

        // Verify connection with shorter timeout
        await Promise.race([
          transporter.verify(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Verification timeout")), 8000)
          ),
        ]);

        console.log(`✅ Configuration ${i + 1} connection verified`);

        const mailOptions = {
          from: `"Lomu" <${process.env.EMAIL_USER}>`,
          to,
          subject,
          html,
          // Add headers to improve deliverability
          headers: {
            "X-Priority": "3",
            "X-Mailer": "Lomu Dating App",
          },
        };

        const result = await Promise.race([
          transporter.sendMail(mailOptions),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Send timeout")), 15000)
          ),
        ]);

        console.log("✅ Email sent successfully:", result.messageId);
        console.log("✅ Response:", result.response);

        return result;
      } catch (configError) {
        lastError = configError;
        console.warn(`❌ Configuration ${i + 1} failed:`, configError.message);

        // If this is the last configuration, break and throw the error
        if (i === transporterConfigs.length - 1) {
          break;
        }

        // Wait a bit before trying next configuration
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // If all configurations failed, throw the last error
    throw lastError;
  } catch (error) {
    console.error("❌ All email sending attempts failed:", error);

    // Provide more specific error messages
    let errorMessage = "Failed to send email";

    if (error.code === "ETIMEDOUT") {
      errorMessage =
        "Connection to email server timed out. Please try again later.";
    } else if (error.code === "ECONNREFUSED") {
      errorMessage =
        "Unable to connect to email server. Check your network configuration.";
    } else if (error.message.includes("Invalid login")) {
      errorMessage =
        "Email authentication failed. Check your email credentials.";
    } else if (error.message.includes("Verification timeout")) {
      errorMessage = "Email server verification timeout. Server may be busy.";
    }

    throw new Error(`${errorMessage} (${error.message})`);
  }
};

// Test function to verify email configuration
export const testEmailConfig = async () => {
  try {
    console.log("🧪 Testing email configuration...");

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("EMAIL_USER or EMAIL_PASS environment variables not set");
    }

    const testHtml = `
      <h1>Email Configuration Test</h1>
      <p>This is a test email from Lomu Dating App.</p>
      <p>If you received this, your email configuration is working correctly.</p>
      <p>Timestamp: ${new Date().toISOString()}</p>
    `;

    // Send test email to yourself
    await sendEmail(process.env.EMAIL_USER, "Lomu Email Test", testHtml);

    console.log("✅ Email configuration test passed!");
    return true;
  } catch (error) {
    console.error("❌ Email configuration test failed:", error);
    return false;
  }
};

export default sendEmail;
