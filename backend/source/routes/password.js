// source/routes/passwordRoutes.js
import express from "express";
import crypto from "crypto";
import User from "../models/User.js";
import sendEmail from "../lib/sendEmail.js";
import bcrypt from "bcryptjs";

const password_router = express.Router();

password_router.post("/forgot-password", async(req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Email not found" });
        }

        // Generate reset token and hash it
        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

        // Save hashed token to user with expiration
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        // Create reset link
        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        // Email content
        const message = `
            <h2>Password Reset Request</h2>
            <p>Hello ${user.username},</p>
            <p>Click the link below to reset your password:</p>
            <a href="${resetLink}" target="_blank">${resetLink}</a>
            <p>This link will expire in 10 minutes.</p>
        `;

        // Send email
        await sendEmail(email, "Password Reset Request", message);

        res.status(200).json({ message: "Reset link sent to email" });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ message: "Server error" });
    }
});

password_router.post("/reset-password/:token", async(req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        // Validate password
        if (!password || password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        // Hash the token from the URL
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        // Find the user by the hashed token and check if token hasn't expired
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired reset token" });
        }

        // Update the user's password
        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.status(200).json({ message: "Password reset successful. You can now log in." });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: "Server error" });
    }
});


export default password_router;