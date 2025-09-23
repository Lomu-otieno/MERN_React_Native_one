import express from "express";
import crypto from "crypto";
import User from "../models/User.js";
import sendEmail from "../lib/sendEmail.js";
import bcrypt from "bcryptjs";

const password_router = express.Router();

password_router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  console.log("Forgot password request for:", email);

  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      console.log("Email not found:", email);
      // For security, don't reveal if email exists or not
      return res.status(200).json({
        message: "If that email exists, a reset link has been sent",
      });
    }

    // Generate reset token and hash it
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save hashed token to user with expiration
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Create reset link
    const resetLink = `${process.env.PASSWORD_URI}/reset-password?token=${resetToken}`;

    // Email content
    const message = `
      <h2>Password Reset Request</h2>
      <p>Hello ${user.username},</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}" target="_blank" style="padding: 10px; background: #FF0050; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>This link will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    // Send email
    await sendEmail(user.email, "Password Reset Request", message);

    console.log("Reset link sent to:", user.email);

    res.status(200).json({
      message: "If that email exists, a reset link has been sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      message: "Server error occurred",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
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
