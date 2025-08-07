// routes/user_router.js
import rateLimit from "express-rate-limit";

const locationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3,
  message: {
    message: "Too many location updates. Try again in a minute.",
  },
});

user_router.put(
  "/location",
  authMiddleware,
  locationLimiter,
  async (req, res) => {
    const { latitude, longitude } = req.body;

    try {
      await User.findByIdAndUpdate(req.user.id, {
        location: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
      });

      res.status(200).json({ message: "Location updated" });
    } catch (err) {
      console.error("Location update error:", err);
      res.status(500).json({ message: "Failed to update location" });
    }
  }
);
