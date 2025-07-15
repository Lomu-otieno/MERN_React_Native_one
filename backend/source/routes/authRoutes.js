import express from "express"
import User from "../models/User.js";

const router = express.Router();

router.post("/register", async(req, res) => {
    try {
        const { email, username, password } = req.body;

        if (!username || !email || password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password Should be at least 6 characters long" });

        }
        if (username.length < 3) {
            return res.status(400).json({ message: "Username should be at least 3 characters long" })

        }
        const existingUser = await User.findOne({ username })
        if (existingUser) {
            return res.status(400).json({ message: "Username already exists" })
        };
        const existingEmail = await User.findOne({ email })
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" })
        };
        // getting  avator

        const profileImage = ``
        const user = new User({
            email,
            username,
            password,
            profileImage
        })
    } catch (error) {

    }
});

router.post("/login", async(req, res) => {
    res.send("Login")
});


export default router;