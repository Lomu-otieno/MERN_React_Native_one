import rateLimit from "express-rate-limit";

// Class for internal API rate limiting (Nominatim)
class RateLimiter {
  constructor(delayMs) {
    this.delayMs = delayMs;
    this.lastRequest = 0;
  }

  async wait() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;

    if (timeSinceLastRequest < this.delayMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.delayMs - timeSinceLastRequest)
      );
    }

    this.lastRequest = Date.now();
  }
}

// Create a rate limiter with 1 second delay between requests for Nominatim API
export const nominatimLimiter = new RateLimiter(1000);

// Express rate limiter middleware for endpoint protection
export const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3, // Limit each IP to 3 location updates per minute
  message: {
    message: "Too many location updates. Try again in a minute.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Optional: General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    message: "Too many requests from this IP, please try again later.",
  },
});

export default loginLimiter;
export { nominatimLimiter, apiLimiter };
