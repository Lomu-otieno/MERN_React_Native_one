import express from "express";
import protect from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import { storage } from "../lib/cloudinary.js";
import { cloudinary } from "../lib/cloudinary.js";
import multer from "multer";
import { getLocationName } from "../middleware/geolocation.js";

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
    // if (photos !== undefined) user.photos = photos;
    // if (location !== undefined) user.location = location;

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
user_router.post(
  "/upload-photos",
  protect,
  upload.array("images", 5), // Max 5 at a time
  async (req, res) => {
    let uploadedPhotos = [];
    let photosToDelete = []; // Track photos to delete from Cloudinary

    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Process all files (even if we're at the limit)
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "dating_app/post_photos",
          transformation: { width: 1080, crop: "limit" },
        });

        uploadedPhotos.push({
          url: result.secure_url,
          public_id: result.public_id,
          createdAt: new Date(),
        });
      }

      // Calculate how many photos we need to remove
      const totalPhotosAfterUpload = user.photos.length + uploadedPhotos.length;
      const photosToRemove = Math.max(0, totalPhotosAfterUpload - 18);

      // Remove oldest photos if needed
      if (photosToRemove > 0) {
        // Sort photos by date (oldest first)
        const sortedPhotos = [...user.photos].sort(
          (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
        );

        // Identify photos to delete (oldest ones)
        photosToDelete = sortedPhotos.slice(0, photosToRemove);

        // Keep only the newest photos
        const remainingPhotos = sortedPhotos.slice(photosToRemove);

        // Combine with new uploads
        user.photos = [...remainingPhotos, ...uploadedPhotos];
      } else {
        // Just append the new photos
        user.photos = [...user.photos, ...uploadedPhotos];
      }

      // Save the user first
      await user.save();

      // Now delete the old photos from Cloudinary
      if (photosToDelete.length > 0) {
        const deletePromises = photosToDelete.map((photo) =>
          cloudinary.uploader.destroy(photo.public_id).catch((err) => {
            console.error(`Failed to delete image ${photo.public_id}:`, err);
          })
        );

        await Promise.all(deletePromises);
      }

      res.status(200).json({
        message: `${uploadedPhotos.length} photo(s) uploaded`,
        photos: user.photos,
        remainingSlots: Math.max(0, 18 - user.photos.length),
        replacedCount: photosToDelete.length,
      });
    } catch (err) {
      console.error("Upload error:", err);

      // Cleanup procedure for failed upload
      try {
        // Delete any newly uploaded photos from Cloudinary
        const cleanupPromises = uploadedPhotos.map((photo) =>
          cloudinary.uploader.destroy(photo.public_id).catch((cleanupErr) => {
            console.error(`Cleanup failed for ${photo.public_id}:`, cleanupErr);
          })
        );

        await Promise.all(cleanupPromises);
      } catch (cleanupErr) {
        console.error("Cleanup error:", cleanupErr);
      }

      res.status(500).json({
        message: "Server error",
        details: err.message,
      });
    }
  }
);
user_router.delete("/delete-photo", protect, async (req, res) => {
  try {
    const { photoIndex, photoPublicId } = req.body;

    if (typeof photoIndex !== "number" || !photoPublicId) {
      return res.status(400).json({
        message: "Invalid request parameters",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify the photo exists at this index
    if (photoIndex < 0 || photoIndex >= user.photos.length) {
      return res.status(400).json({ message: "Invalid photo index" });
    }

    // Verify the public ID matches
    if (user.photos[photoIndex].public_id !== photoPublicId) {
      return res.status(400).json({ message: "Photo ID mismatch" });
    }

    // Delete from Cloudinary first
    await cloudinary.uploader.destroy(photoPublicId);

    // Remove from user's photos array
    user.photos.splice(photoIndex, 1);
    await user.save();

    res.status(200).json({
      message: "Photo deleted successfully",
      photos: user.photos,
    });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({
      message: "Failed to delete photo",
      error: err.message,
    });
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
user_router.get("/match/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Function to calculate age from dateOfBirth
    const calculateAge = (birthDate) => {
      if (!birthDate) return null;
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();

      // Adjust if birthday hasn't occurred yet this year
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birth.getDate())
      ) {
        age--;
      }
      return age;
    };

    const age = calculateAge(user.dateOfBirth);

    res.status(200).json({
      _id: user._id,
      username: user.username,
      bio: user.bio,
      dateOfBirth: user.dateOfBirth,
      age: age, // Include calculated age
      interests: user.interests,
      location: user.location,
      profileImage: user.profileImage,
      photos: user.photos,
    });
  } catch (error) {
    console.error("Fetch match error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
user_router.put("/location", protect, async (req, res) => {
  const { latitude, longitude } = req.body;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res.status(400).json({ message: "Invalid coordinates" });
  }

  try {
    // Fetch readable location
    const locationName = await getLocationName(latitude, longitude);

    // Update user location and readable location
    await User.findByIdAndUpdate(req.user.id, {
      location: {
        type: "Point",
        coordinates: [longitude, latitude], // GeoJSON format
      },
      locationName: locationName, // Save to a field in User schema
    });

    res.status(200).json({
      message: "Location updated successfully",
      readableLocation: locationName,
    });
  } catch (err) {
    console.error("Error updating location:", err);
    res.status(500).json({ message: "Failed to update location" });
  }
});
user_router.get("/view-profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const calculateAge = (birthDate) => {
      if (!birthDate) return null;
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birth.getDate())
      ) {
        age--;
      }
      return age;
    };

    const age = calculateAge(user.dateOfBirth);

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      age,
      interests: user.interests,
      location: user.location, // coordinates
      locationName: user.locationName,
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
user_router.get("/explore", protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);

    if (!currentUser || !currentUser.location?.coordinates) {
      return res.status(400).json({ message: "User location not set" });
    }

    const [userLng, userLat] = currentUser.location.coordinates;

    const excludedUserIds = [
      ...(currentUser.likes || []),
      ...(currentUser.passes || []),
      currentUser._id,
    ];

    const genderFilter =
      req.query.gender ||
      (currentUser.gender === "male"
        ? "female"
        : currentUser.gender === "female"
        ? "male"
        : undefined);

    const geoQuery = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [userLng, userLat],
          },
          distanceField: "distance",
          spherical: true,
          maxDistance: 50000,
          query: {
            _id: { $nin: excludedUserIds },
            ...(genderFilter && { gender: genderFilter }),
          },
        },
      },
      {
        $limit: 20,
      },
    ];

    const users = await User.aggregate(geoQuery);

    const calculateAge = (birthDate) => {
      if (!birthDate) return null;
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birth.getDate())
      ) {
        age--;
      }
      return age;
    };

    const formattedUsers = users.map((user) => ({
      _id: user._id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      age: calculateAge(user.dateOfBirth),
      interests: user.interests,
      location: user.location,
      profileImage: user.profileImage,
      likes: user.likes,
      likesCount: user.likes.length,
      photos: user.photos,
      distance: (user.distance / 1000).toFixed(1), // km
    }));

    res.status(200).json(formattedUsers);
  } catch (err) {
    console.error("Explore error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default user_router;
