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

        await cloudinary.uploader.destroy(`dating_app_photos/${publicId}`);
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
  upload.array("photos", 5), // Changed from "images" to "photos"
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const remainingSlots = 18 - user.photos.length;
      if (remainingSlots <= 0) {
        return res.status(400).json({
          message: "Maximum 18 photos reached",
        });
      }

      // Process only what can fit
      const filesToProcess = req.files.slice(0, remainingSlots);
      const newPhotos = [];

      // Upload with deduplication checks
      for (const file of filesToProcess) {
        // Generate unique public_id
        const publicId = `user_${user._id}_${Date.now()}_${file.originalname}`;

        const result = await cloudinary.uploader.upload(file.path, {
          public_id: publicId,
          folder: "user_uploads",
          overwrite: false, // Prevent overwrites
          invalidate: true,
        });

        // Check if URL already exists
        if (!user.photos.includes(result.secure_url)) {
          newPhotos.push(result.secure_url);
        }
      }

      // Update user photos
      user.photos = [...user.photos, ...newPhotos];
      await user.save();

      res.status(200).json({
        message: `${newPhotos.length} photo(s) added`,
        photos: user.photos,
        addedCount: newPhotos.length,
      });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

user_router.delete("/delete-photo/:index", protect, async (req, res) => {
  try {
    const { index } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const photoIndex = parseInt(index);

    if (
      isNaN(photoIndex) ||
      photoIndex < 0 ||
      photoIndex >= user.photos.length
    ) {
      return res.status(400).json({ message: "Invalid photo index" });
    }

    // Get Cloudinary public_id from stored publicIds
    const publicId = user.photoPublicIds?.[photoIndex];
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.warn(`Failed to delete image on Cloudinary: ${err.message}`);
      }
    }

    // Remove the photo and public_id from arrays
    user.photos.splice(photoIndex, 1);
    if (user.photoPublicIds) {
      user.photoPublicIds.splice(photoIndex, 1);
    }

    await user.save();

    res.status(200).json({ message: "Photo deleted successfully" });
  } catch (err) {
    console.error("Delete photo error:", err);
    res.status(500).json({ message: "Server error" });
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
