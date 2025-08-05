import express from "express";
import protect from "../middleware/protect.js";
import User from "../models/User.js";
import { storage } from "../lib/cloudinary.js";
import { cloudinary } from "../lib/cloudinary.js";
import multer from "multer";

const upload = multer({ storage });
const user_router = express.Router();

user_router.post(
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

        await cloudinary.uploader.destroy(`dating_app/${publicId}`);
      }

      // Save new image URL
      user.profileImage = req.file.path; // Cloudinary gives the URL here
      await user.save();

      // Re-fetch the updated user
      const updatedUser = await User.findById(req.user._id);

      res.status(200).json({
        message: "Profile image updated successfully",
        url: updatedUser.profileImage,
        user: updatedUser, // returning the updated user document
      });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

user_router.put("/update-profile", protect, async (req, res) => {
  const { bio, gender, dateOfBirth, interests, photos, location } = req.body;

  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Gender and DOB can only be set once
    if (gender !== undefined) {
      if (user.gender) {
        return res.status(400).json({ message: "Gender can only be set once" });
      }
      user.gender = gender;
    }

    if (dateOfBirth !== undefined) {
      if (user.dateOfBirth) {
        return res
          .status(400)
          .json({ message: "Date of birth can only be set once" });
      }
      user.dateOfBirth = new Date(dateOfBirth);
    }

    // Allow updating these any time
    if (bio !== undefined) user.bio = bio;
    if (interests !== undefined) user.interests = interests;
    if (photos !== undefined) user.photos = photos;
    if (location !== undefined) user.location = location;

    await user.save();

    const { password, ...userData } = user.toObject();

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
      _id: user._id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      interests: user.interests,
      location: user.location,
      profileImage: user.profileImage,
      likes: user.likes,
      likesCount: user.likes.length,
      photos: user.photos,
    });
  } catch (error) {
    console.error("View profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

user_router.post(
  "/upload-photos",
  protect,
  upload.array("images", 5), // Max 5 at a time
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const filesToProcess = req.files;
      const uploadedPhotos = [];

      // Process all files (even if we're at the limit)
      for (const file of filesToProcess) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "dating_app/post_photos",
          transformation: { width: 1080, crop: "limit" },
        });

        uploadedPhotos.push({
          url: result.secure_url,
          public_id: result.public_id,
          createdAt: new Date(), // Add upload timestamp
        });
      }

      // Calculate how many photos we need to remove
      const totalPhotosAfterUpload = user.photos.length + uploadedPhotos.length;
      const photosToRemove = Math.max(0, totalPhotosAfterUpload - 18);

      // Remove oldest photos if needed (sorted by createdAt)
      if (photosToRemove > 0) {
        // Sort photos by date (oldest first)
        const sortedPhotos = [...user.photos].sort(
          (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
        );

        // Keep only the newest photos (skip the oldest ones we need to remove)
        const remainingPhotos = sortedPhotos.slice(photosToRemove);

        // Combine with new uploads
        user.photos = [...remainingPhotos, ...uploadedPhotos];
      } else {
        // Just append the new photos
        user.photos = [...user.photos, ...uploadedPhotos];
      }

      await user.save();

      res.status(200).json({
        message: `${uploadedPhotos.length} photo(s) uploaded`,
        photos: user.photos,
        remainingSlots: Math.max(0, 18 - user.photos.length),
        replacedCount: photosToRemove > 0 ? photosToRemove : 0,
      });
    } catch (err) {
      console.error("Upload error:", err);

      // Clean up any Cloudinary uploads that succeeded before the error
      try {
        for (const photo of uploadedPhotos) {
          await cloudinary.uploader.destroy(photo.public_id);
        }
      } catch (cleanupErr) {
        console.error("Cleanup error:", cleanupErr);
      }

      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update delete endpoint to handle both index and URL
user_router.delete("/delete-photo", protect, async (req, res) => {
  try {
    const { photoIndex, photoUrl } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "User not found" });

    // Handle both index and URL deletion
    let photoToDelete;
    if (photoIndex !== undefined) {
      photoToDelete = user.photos[photoIndex];
      user.photos.splice(photoIndex, 1);
    } else if (photoUrl) {
      user.photos = user.photos.filter(
        (p) => (typeof p === "string" ? p : p.url) !== photoUrl
      );
      photoToDelete = photoUrl;
    }

    // Delete from Cloudinary
    if (photoToDelete?.public_id) {
      await cloudinary.uploader.destroy(photoToDelete.public_id);
    } else if (typeof photoToDelete === "object") {
      await cloudinary.uploader.destroy(photoToDelete.public_id);
    }

    await user.save();
    res.status(200).json({ photos: user.photos });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Failed to delete photo" });
  }
});

user_router.get("/explore", protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const excludedUserIds = [
      ...(currentUser.likes || []),
      ...(currentUser.passes || []),
      currentUser._id,
    ];

    const query = {
      _id: { $nin: excludedUserIds },
    };

    // 👇 Default to opposite gender if no query param provided
    if (req.query.gender) {
      query.gender = req.query.gender;
    } else if (currentUser.gender === "male") {
      query.gender = "female";
    } else if (currentUser.gender === "female") {
      query.gender = "male";
    }

    const users = await User.find(query).select("-password").limit(20);

    res.status(200).json(users);
  } catch (err) {
    console.error("Explore error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

user_router.post("/like/:targetUserId", protect, async (req, res) => {
  const currentUserId = req.user._id;
  const targetUserId = req.params.targetUserId;

  try {
    if (currentUserId.toString() === targetUserId) {
      return res.status(400).json({ message: "You can't like yourself" });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    if (currentUser.likes.includes(targetUserId)) {
      return res.status(400).json({ message: "You already liked this user" });
    }

    currentUser.likes.push(targetUserId);

    // Check if target user also liked current user → MATCH
    const isMatch = targetUser.likes.includes(currentUserId);

    if (isMatch) {
      currentUser.matches.push(targetUserId);
      targetUser.matches.push(currentUserId);

      await currentUser.save();
      await targetUser.save();

      return res.status(200).json({ message: "It's a match!", match: true });
    }

    await currentUser.save();

    res.status(200).json({ message: "User liked", match: false });
  } catch (error) {
    console.error("Like error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

user_router.post("/pass/:targetUserId", protect, async (req, res) => {
  const currentUserId = req.user._id;
  const targetUserId = req.params.targetUserId;

  try {
    if (currentUserId.toString() === targetUserId) {
      return res.status(400).json({ message: "You can't pass yourself" });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    if (currentUser.passes.includes(targetUserId)) {
      return res.status(400).json({ message: "You already passed this user" });
    }

    currentUser.passes.push(targetUserId);
    await currentUser.save();

    res.status(200).json({ message: "User passed" });
  } catch (error) {
    console.error("Pass error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

user_router.get("/matches", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "matches",
      "-password"
    );

    res.status(200).json(user.matches);
  } catch (error) {
    console.error("Fetch matches error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default user_router;
