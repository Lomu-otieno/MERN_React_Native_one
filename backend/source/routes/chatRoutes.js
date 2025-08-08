import express from "express";
import UserChat from "../models/UserChat.js";
import User from "../models/User.js";

const router = express.Router();

// Get or create chat for user
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Find existing chat or create new one with default admin
    let chat = await UserChat.findOne({ userId })
      .populate("userId", "name email")
      .populate("adminId", "name email")
      .populate("messages.sender", "name");

    if (!chat) {
      // Find first available admin (you might want to implement proper admin assignment logic)
      const admin = await User.findOne({ role: "admin" });
      if (!admin) {
        return res.status(404).json({ message: "No admin available" });
      }

      chat = await UserChat.create({
        userId,
        adminId: admin._id,
        messages: [],
        status: "open",
      });
    }

    res.json({
      messages: chat.messages,
      chatId: chat._id,
      status: chat.status,
    });
  } catch (error) {
    console.error("Chat fetch error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch chat", error: error.message });
  }
});

// Send message
router.post("/send", async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!userId || !message) {
      return res
        .status(400)
        .json({ message: "User ID and message are required" });
    }

    // Find existing chat
    let chat = await UserChat.findOne({ userId });

    if (!chat) {
      // Find first available admin
      const admin = await User.findOne({ role: "admin" });
      if (!admin) {
        return res.status(404).json({ message: "No admin available" });
      }

      chat = await UserChat.create({
        userId,
        adminId: admin._id,
        messages: [],
        status: "open",
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

    // You might want to implement real-time notifications here

    res.status(201).json({
      newMessage,
      chatId: chat._id,
    });
  } catch (error) {
    console.error("Message send error:", error);
    res
      .status(500)
      .json({ message: "Failed to send message", error: error.message });
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
