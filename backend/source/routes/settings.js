import express from "express";
import protect from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import { storage } from "../lib/cloudinary.js";
import { cloudinary } from "../lib/cloudinary.js";
import multer from "multer";

const upload = multer({ storage });
const settings_router = express.Router();

settings_router.post(
  "/upload-profile",
  protect,
  upload.single("image"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Delete old image from Cloudinary (optional)
      if (user.profileImage) {
        const segments = user.profileImage.split("/");
        const fileWithExtension = segments.pop(); // e.g., photo.jpg
        const publicId = fileWithExtension.split(".")[0]; // e.g., photo

        await cloudinary.uploader.destroy(`dating_app_photos/${publicId}`);
      }

      // Save new image URL
      user.profileImage = req.file.path; // Cloudinary gives the URL here
      await user.save();

      res.status(200).json({
        message: "Profile image updated successfully",
        url: user.profileImage,
      });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

settings_router.post("/update-details", protect, async (req, res) => {
  const { bio, gender, dateOfBirth, interests, location } = req.body;

  try {
    // Check if user exists
    const user = await User.findById(req.user._id);
    console.log("User found:", user ? "Yes" : "No");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields one by one with logging
    if (bio !== undefined && bio !== null) {
      console.log("Updating bio:", bio);
      user.bio = bio;
    }

    if (gender !== undefined && gender !== null) {
      console.log("Updating gender:", gender);
      user.gender = gender;
    }

    if (dateOfBirth !== undefined && dateOfBirth !== null) {
      console.log("Updating dateOfBirth:", dateOfBirth);
      const dob = new Date(dateOfBirth);
      if (!isNaN(dob.getTime())) {
        user.dateOfBirth = dob;
      } else {
        console.log("Invalid date format:", dateOfBirth);
      }
    }

    if (interests !== undefined && interests !== null) {
      console.log("Updating interests:", interests);
      user.interests = Array.isArray(interests) ? interests : [];
    }

    if (location !== undefined && location !== null) {
      console.log("Updating location:", location);
      user.location = location;
    }

    console.log("Saving user...");
    await user.save();
    console.log("User saved successfully");

    const userData = user.toObject();
    delete userData.password;

    res.status(200).json({
      message: "Profile updated successfully",
      user: userData,
    });
  } catch (error) {
    console.error("=== ERROR IN UPDATE DETAILS ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    // Send detailed error in development
    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

settings_router.post(
  "/upload-photos",
  protect,
  upload.array("images", 12),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      const urls = req.files.map((file) => file.path);

      user.photos.push(...urls);
      await user.save();

      res.status(200).json({ message: "Photos uploaded", urls });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

settings_router.delete("/delete-account", protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Delete user
    await User.findByIdAndDelete(userId);

    // Optionally: Remove user from other users' matches/likes
    await User.updateMany(
      {},
      {
        $pull: {
          likes: userId,
          passes: userId,
          matches: userId,
        },
      },
    );

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default settings_router;
