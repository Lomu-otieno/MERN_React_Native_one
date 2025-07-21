import rateLimit from "express-rate-limit";

// Limit to 5 requests every 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        message: "Too many login attempts. Try again after 15 minutes.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export default loginLimiter;