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

      // Delete old profile image
      if (user.profileImagePublicId) {
        await cloudinary.uploader.destroy(user.profileImagePublicId);
      }

      // Upload new profile image
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "dating_app/profile_images",
      });

      user.profileImage = result.secure_url;
      user.profileImagePublicId = result.public_id;
      await user.save();

      res.status(200).json({
        message: "Profile image updated",
        profileImage: user.profileImage,
      });
    } catch (err) {
      console.error("Upload profile error:", err);
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
  upload.array("images", 18),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const existingCount = user.photos.length;
      const newCount = req.files.length;
      let totalCount = existingCount + newCount;

      // If user has >=12, remove oldest photos to make space
      while (totalCount > 18) {
        // Remove oldest photo
        const removedPublicId = user.photoPublicIds?.shift();
        user.photos.shift();
        totalCount--;

        // Delete from Cloudinary
        if (removedPublicId) {
          try {
            await cloudinary.uploader.destroy(removedPublicId);
          } catch (err) {
            console.warn(
              `Failed to delete old image on Cloudinary: ${err.message}`
            );
          }
        }
      }

      // Upload new images
      const uploadResults = await Promise.all(
        req.files.map((file) =>
          cloudinary.uploader.upload(file.path, {
            folder: "dating_app/post_photos",
          })
        )
      );

      const urls = uploadResults.map((r) => r.secure_url);
      const ids = uploadResults.map((r) => r.public_id);

      // Save new images
      user.photos.push(...urls);
      user.photoPublicIds = (user.photoPublicIds || []).concat(ids);

      await user.save();

      res.status(200).json({
        message: `Uploaded ${urls.length} photo(s)`,
        photos: urls,
      });
    } catch (err) {
      console.error("Upload photos error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

user_router.delete("/delete-photo/:index", protect, async (req, res) => {
  try {
    const { index } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const i = parseInt(index);
    if (isNaN(i) || i < 0 || i >= user.photos.length) {
      return res.status(400).json({ message: "Invalid photo index" });
    }

    const publicId = user.photoPublicIds?.[i];
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }

    user.photos.splice(i, 1);
    if (user.photoPublicIds) user.photoPublicIds.splice(i, 1);
    await user.save();

    res.status(200).json({ message: "Photo deleted" });
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
