import express from "express";
import protect from "../middleware/protect.js";
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
  }
);

settings_router.put("/update-details", protect, async (req, res) => {
  const { bio, gender, dateOfBirth, interests, photos, location } = req.body;

  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields only if they are provided
    if (bio !== undefined) user.bio = bio;
    if (gender !== undefined) user.gender = gender;
    if (dateOfBirth !== undefined) user.dateOfBirth = new Date(dateOfBirth);
    if (interests !== undefined) user.interests = interests;
    if (photos !== undefined) user.photos = photos;
    if (location !== undefined) user.location = location;

    await user.save();

    const { password, ...userData } = user.toObject(); // Remove password from response

    res.status(200).json({
      message: "Profile updated successfully",
      user: userData,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

user_router.get("/view-profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      ...user.toObject(),
      likesCount: user.likes.length, // 👈 Add this
    });
  } catch (error) {
    console.error("View profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

settings_router.post(
  "/upload-photos",
  protect,
  upload.array("images", 5),
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
  }
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
      }
    );

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default settings_router;
