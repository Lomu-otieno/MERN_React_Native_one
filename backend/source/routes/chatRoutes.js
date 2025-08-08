import express from "express";
import UserChat from "../models/UserChat.js";
import mongoose from "mongoose";
import User from "../models/User.js";

const router = express.Router();

// Get or create chat for user
const getAvailableAdmin = async () => {
  try {
    const admin = await User.aggregate([
      { $match: { role: "admin", isActive: true } },
      {
        $lookup: {
          from: "userchats",
          localField: "_id",
          foreignField: "adminId",
          as: "chats",
        },
      },
      { $addFields: { chatCount: { $size: "$chats" } } },
      { $sort: { chatCount: 1 } },
      { $limit: 1 },
    ]);

    return admin.length > 0 ? admin[0] : null;
  } catch (error) {
    console.error("Error finding admin:", error);
    return null;
  }
};

// Get or create chat for user
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid user ID",
        code: "INVALID_ID",
      });
    }

    let chat = await UserChat.findOne({ userId })
      .populate("userId", "name email profileImage")
      .populate("adminId", "name email profileImage")
      .populate("messages.sender", "name");

    if (!chat) {
      // Find an available admin or create chat without one
      const admin = await getAvailableAdmin();

      chat = await UserChat.create({
        userId,
        adminId: admin?._id || null, // Make adminId optional
        messages: [],
        status: admin ? "open" : "pending",
      });
    }

    res.json({
      messages: chat.messages,
      chatId: chat._id,
      status: chat.status,
      admin: chat.adminId || null,
    });
  } catch (error) {
    console.error("Chat fetch error:", error);
    res.status(500).json({
      message: "Failed to fetch chat",
      error: error.message,
      code: "SERVER_ERROR",
    });
  }
});

// Send message
router.post("/send", async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        message: "User ID and message are required",
        code: "MISSING_FIELDS",
      });
    }

    // Find or create chat (don't require admin to be available)
    let chat = await UserChat.findOne({ userId });

    if (!chat) {
      // Create chat without assigning admin immediately
      chat = await UserChat.create({
        userId,
        messages: [],
        status: "pending", // New status for unassigned chats
      });
    }

    // Add new message
    const newMessage = {
      sender: userId,
      message,
      timestamp: new Date(),
      read: false,
    };

    chat.messages.push(newMessage);
    await chat.save();

    // Admin will be assigned later when available
    res.status(201).json({
      newMessage,
      chatId: chat._id,
      status: chat.status,
      message: "Message received. Admin will respond when available.",
    });
  } catch (error) {
    console.error("Message send error:", error);
    res.status(500).json({
      message: "Failed to save message",
      error: error.message,
      code: "SERVER_ERROR",
    });
  }
});

// POST: Admin replies to user
router.post("/reply", async (req, res) => {
  try {
    const { chatId, adminId, message } = req.body;

    if (!chatId || !adminId || !message) {
      return res.status(400).json({
        message: "Chat ID, Admin ID, and message are required",
      });
    }

    const chat = await UserChat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const newMessage = {
      sender: adminId,
      message,
      timestamp: new Date(),
      read: false,
    };

    chat.messages.push(newMessage);
    chat.status = "open";
    chat.adminId = chat.adminId || adminId; // Assign if not already set
    await chat.save();

    res.status(201).json({
      newMessage,
      message: "Reply sent successfully",
    });
  } catch (error) {
    console.error("Admin reply error:", error);
    res.status(500).json({
      message: "Failed to send reply",
      error: error.message,
    });
  }
});

// Mark messages as read
router.patch("/:chatId/read", async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await UserChat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Mark all admin messages as read
    chat.messages.forEach((msg) => {
      if (msg.sender.toString() !== chat.userId.toString()) {
        msg.read = true;
      }
    });

    await chat.save();
    res.json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Mark read error:", error);
    res.status(500).json({
      message: "Failed to mark messages as read",
      error: error.message,
    });
  }
});

export default router;
