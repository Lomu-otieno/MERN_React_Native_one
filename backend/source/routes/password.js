import express from "express";
import crypto from "crypto";
import User from "../models/User.js";
import sendEmail from "../lib/sendEmail.js";
import bcrypt from "bcryptjs";

const password_router = express.Router();

password_router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  console.log("🔐 Forgot password request for:", email);

  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      console.log("❌ Email not found in database");
      return res
        .status(200)
        .json({ message: "A reset link has been sent within 24hrs" });
    }

    console.log("✅ User found:", user.email);

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const resetLink = `${process.env.PASSWORD_URI}/index.html?token=${resetToken}`;
    console.log("🔗 Reset link generated:", resetLink);

    // Send email
    try {
      const message = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #FF0050;">Password Reset Request</h2>
          <p>Hello ${user.username},</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetLink}" 
             style="background: #FF0050; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
          <p><strong>This link expires in 10 minutes.</strong></p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `;
      await sendEmail(user.email, "Password Reset Request", message);
      console.log("✅ Email sent successfully");
    } catch (emailError) {
      console.log("⚠️ Email not sent, but token saved. Reset link:", resetLink);
      // The reset link is still logged in the sendEmail function for manual use
    }

    res.status(200).json({
      message: "reset link has been sent",
      // Include debug info
      debug: process.env.NODE_ENV === "development" ? { resetLink } : undefined,
    });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({ message: "Server error occurred" });
  }
});
password_router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  console.log("Reset password attempt with token");

  try {
    if (!token) {
      return res.status(400).json({ message: "Reset token is required" });
    }

    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    // Update password
    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    console.log("Password reset successful for user:", user.email);

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default password_router;
