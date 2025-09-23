import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, html) => {
  try {
    console.log(`📧 Attempting to send email to: ${to}`);

    const { data, error } = await resend.emails.send({
      from: "Lomu <noreply@lomu.com>",
      to: to,
      subject: subject,
      html: html,
    });

    if (error) {
      // console.error("❌ Resend error:", error);
      throw new Error(error.message);
    }

    // console.log("✅ Email sent successfully via Resend");
    // console.log("📫 Email ID:", data?.id);
    return data;
  } catch (error) {
    // console.error("❌ Email sending failed:", error);

    // Fallback: log the reset link for manual testing
    const resetLinkMatch = html.match(/https?:\/\/[^\s"']+/);
    if (resetLinkMatch) {
      // console.log("🔗 RESET LINK FOR MANUAL TESTING:", resetLinkMatch[0]);
    }

    throw new Error("Email service temporary unavailable");
  }
};

export default sendEmail;
