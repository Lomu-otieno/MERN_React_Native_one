import express from "express";
import protect from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import { storage } from "../lib/cloudinary.js";
import { cloudinary } from "../lib/cloudinary.js";
import multer from "multer";
import { getLocationName } from "../middleware/geolocation.js";
import { loginLimiter } from "../middleware/rateLimiter.js";
import mongoose from "mongoose";

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
  const { bio, gender, dateOfBirth, interests, locationName } = req.body;

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
user_router.post("/set-gender", async (req, res) => {
  try {
    const { email, gender } = req.body;

    if (!email || !gender) {
      return res.status(400).json({ message: "Email and gender are required" });
    }

    if (!["male", "female"].includes(gender)) {
      return res
        .status(400)
        .json({ message: "Gender must be 'male' or 'female'" });
    }

    const user = await User.findOneAndUpdate(
      { email },
      { gender },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Gender updated successfully", user });
  } catch (err) {
    console.error(err);
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

    let isMatch = false;

    if (targetUser.likes.includes(currentUserId)) {
      // It's a match!
      currentUser.matches.push(targetUserId);
      targetUser.matches.push(currentUserId);
      isMatch = true;

      await targetUser.save();
    }

    await currentUser.save();

    res.status(200).json({
      message: isMatch ? "It's a match!" : "User liked",
      match: isMatch,
    });
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
    const { id } = req.params;

    // Validate that ID is a valid MongoDB ObjectId
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(id).select("-password"); // Changed from req.params.id to id

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
      age: age,
      interests: user.interests,
      location: user.locationName,
      profileImage: user.profileImage,
      photos: user.photos,
    });
  } catch (error) {
    console.error("Fetch match error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
user_router.put("/location", protect, loginLimiter, async (req, res) => {
  const { latitude, longitude } = req.body;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res.status(400).json({ message: "Invalid coordinates" });
  }

  try {
    // Get location name with improved error handling
    const locationName = await getLocationName(latitude, longitude);

    await User.findByIdAndUpdate(req.user.id, {
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      locationName,
    });

    res.status(200).json({
      message: "Location updated successfully",
      locationName,
      coordinates: { latitude, longitude },
    });
  } catch (err) {
    console.error("Location update error:", err);

    // Even if geocoding fails, still update coordinates
    await User.findByIdAndUpdate(req.user.id, {
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      locationName: "Location Not Available",
    });

    res.status(200).json({
      message: "Location coordinates updated (geocoding service unavailable)",
      locationName: "Location Not Available",
      coordinates: { latitude, longitude },
    });
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
      location: user.location,
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
    const currentUser = await User.findById(req.user.id);

    if (!currentUser || !currentUser.location) {
      return res.status(400).json({ message: "User location not set" });
    }

    const maxDistance = 50000; // 50km in meters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build aggregation pipeline
    const pipeline = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: currentUser.location.coordinates,
          },
          distanceField: "distance",
          maxDistance: maxDistance,
          spherical: true,
          query: {
            _id: { $ne: new mongoose.Types.ObjectId(req.user.id) },
          },
        },
      },
      // Add exclusion for liked/passed users
      {
        $match: {
          $and: [
            currentUser.likedUsers?.length > 0
              ? {
                  _id: {
                    $nin: currentUser.likedUsers.map(
                      (id) => new mongoose.Types.ObjectId(id)
                    ),
                  },
                }
              : {},
            currentUser.passedUsers?.length > 0
              ? {
                  _id: {
                    $nin: currentUser.passedUsers.map(
                      (id) => new mongoose.Types.ObjectId(id)
                    ),
                  },
                }
              : {},
          ].filter((condition) => Object.keys(condition).length > 0), // Remove empty conditions
        },
      },
      // Pagination
      { $skip: skip },
      { $limit: limit },
      // Project fields
      {
        $project: {
          password: 0,
          email: 0,
          likedUsers: 0,
          passedUsers: 0,
        },
      },
    ];

    // Remove empty match conditions
    pipeline[1].$match.$and = pipeline[1].$match.$and.filter(
      (condition) => Object.keys(condition).length > 0
    );
    if (pipeline[1].$match.$and.length === 0) {
      pipeline.splice(1, 1); // Remove the $match stage if no conditions
    }

    const users = await User.aggregate(pipeline);

    // Safe processing of users data
    const exploreUsers = users.map((user) => {
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

      return {
        _id: user._id,
        username: user.username || "Unknown",
        bio: user.bio || "",
        age: calculateAge(user.dateOfBirth),
        interests: user.interests || [],
        location: user.locationName || "Unknown Location",
        profileImage: user.profileImage || "",
        photos: user.photos || [],
        distance: user.distance || 0,
      };
    });

    // Get total count separately for pagination
    const countPipeline = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: currentUser.location.coordinates,
          },
          distanceField: "distance",
          maxDistance: maxDistance,
          spherical: true,
          query: {
            _id: { $ne: new mongoose.Types.ObjectId(req.user.id) },
          },
        },
      },
    ];

    // Add exclusion conditions to count pipeline
    if (
      currentUser.likedUsers?.length > 0 ||
      currentUser.passedUsers?.length > 0
    ) {
      countPipeline.push({
        $match: {
          $and: [
            currentUser.likedUsers?.length > 0
              ? {
                  _id: {
                    $nin: currentUser.likedUsers.map(
                      (id) => new mongoose.Types.ObjectId(id)
                    ),
                  },
                }
              : {},
            currentUser.passedUsers?.length > 0
              ? {
                  _id: {
                    $nin: currentUser.passedUsers.map(
                      (id) => new mongoose.Types.ObjectId(id)
                    ),
                  },
                }
              : {},
          ].filter((condition) => Object.keys(condition).length > 0),
        },
      });
    }

    countPipeline.push({ $count: "total" });

    const countResult = await User.aggregate(countPipeline);
    const totalUsers = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(totalUsers / limit);

    res.status(200).json({
      users: exploreUsers,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Explore error:", error);
    res.status(500).json({
      message: "Error fetching users",
      error: error.message,
    });
  }
});
user_router.put("/push-token", protect, async (req, res) => {
  const { pushToken } = req.body;
  if (!pushToken)
    return res.status(400).json({ message: "Push token required" });

  try {
    await User.findByIdAndUpdate(req.user.id, { pushToken });
    res.status(200).json({ message: "Push token saved" });
  } catch (err) {
    console.error("Push token error:", err);
    res.status(500).json({ message: "Failed to save token" });
  }
});
// Add this test route to help debug
user_router.get("/test-geocoding", async (req, res) => {
  const testCoords = [
    { lat: -0.0012931, lon: 34.6183878 }, // Your problem coordinates
    { lat: 40.7128, lon: -74.006 }, // New York City
    { lat: 51.5074, lon: -0.1278 }, // London
  ];

  const results = [];

  for (const coord of testCoords) {
    try {
      console.log(`\n🧪 Testing coordinates: (${coord.lat}, ${coord.lon})`);
      const location = await getLocationName(coord.lat, coord.lon);
      results.push({
        coordinates: coord,
        result: location,
        status: "success",
      });
    } catch (error) {
      results.push({
        coordinates: coord,
        result: error.message,
        status: "error",
      });
    }
  }

  res.json({ geocodingTest: results });
});
export default user_router;
