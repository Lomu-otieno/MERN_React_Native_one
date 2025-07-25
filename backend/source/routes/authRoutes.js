import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import generateToken from "../lib/generateToken.js"
import loginLimiter from "../middleware/rateLimiter.js";
import protect from "../middleware/authMiddleware.js";
import crypto from "crypto";
import sendEmail from "../lib/sendEmail.js";

const router = express.Router();

router.post("/register", async(req, res) => {
    try {
        const { email, username, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password should be at least 6 characters long" });
        }

        if (username.length < 3) {
            return res.status(400).json({ message: "Username should be at least 3 characters long" });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "Username already exists" });
        }

        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const profileImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

        const user = new User({
            email,
            username,
            password: hashedPassword,
            profileImage,
        });

        await user.save();

        const token = generateToken(user._id);
        res.status(201).json({
            message: "Register successful",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/login", loginLimiter, async(req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Validate input
        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        // 2. Find user by username
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // 3. Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // 4. Create JWT token
        const token = jwt.sign({ id: user._id, username: user.username },
            process.env.JWT_SECRET, { expiresIn: "1h" }
        );

        // 5. Respond
        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server error" });
    }
    // Example of a protected route:
});



router.post("/reset-password/:token", async(req, res) => {
    const { password } = req.body;
    const { token } = req.params;

    try {
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        // Validate password
        if (!password || password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/profile", protect, async(req, res) => {
    res.json({
        message: "Protected route accessed",
        user: req.user, // Available because protect added it
    });
});


export default router;