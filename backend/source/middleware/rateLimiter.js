// routes/user_router.js
import rateLimit from "express-rate-limit";

const locationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3,
  message: {
    message: "Too many location updates. Try again in a minute.",
  },
});

export default loginLimiter;
