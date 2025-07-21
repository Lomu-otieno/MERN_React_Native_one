// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protect = async(req, res, next) => {
    const authHeader = req.headers.authorization;

    // 1. Check if Authorization header exists and starts with "Bearer"
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Not authorized, no token" });
    }

    try {
        // 2. Extract token and verify
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3. Attach user to request (exclude password)
        req.user = await User.findById(decoded.id).select("-password");

        next(); // ✅ Proceed to the next middleware or route handler
    } catch (err) {
        console.error("JWT verification failed:", err);
        return res.status(401).json({ message: "Not authorized, token invalid" });
    }
};

export default protect;