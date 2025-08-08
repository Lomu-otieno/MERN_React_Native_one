import express from "express";
import UserChat from "../models/UserChat.js";
import mongoose from "mongoose";

const router = express.Router();

// Helper function to validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Get all chats (for admin panel)

router.get("/chats", async (req, res) => {
  try {
    const chats = await UserChat.find()
      .sort({ updatedAt: -1 })
      .populate("userId", "name email")
      .populate("adminId", "name email");
    res.status(200).json({ chats });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch chats",
      error: error.message,
    });
  }
});

// Get a specific chat with messages
router.get("/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    const chat = await UserChat.findById(chatId)
      .populate("userId", "name email")
      .populate("adminId", "name email");

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const messagesWithAdminFlag = chat.messages.map((msg) => ({
      ...msg.toObject(),
      isAdmin: msg.sender.toString() === chat.adminId?.toString(),
    }));

    res.status(200).json({
      chatId: chat._id,
      userId: chat.userId,
      adminId: chat.adminId,
      status: chat.status,
      messages: chat.messages,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch chat",
      error: error.message,
    });
  }
});

// User sends a message
router.post("/send", async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        message: "User ID and message are required",
      });
    }

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    let chat = await UserChat.findOne({ userId });

    if (!chat) {
      chat = await UserChat.create({
        userId,
        messages: [],
        status: "pending",
      });
    }

    const newMessage = {
      sender: userId,
      message,
      timestamp: new Date(),
      read: false,
    };

    chat.messages.push(newMessage);
    await chat.save();

    res.status(201).json({
      message: "Message sent successfully",
      chatId: chat._id,
      newMessage,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to send message",
      error: error.message,
    });
  }
});

// Admin sends a reply (either new message or reply to existing)
router.post("/reply", async (req, res) => {
  try {
    const { chatId, message, messageId } = req.body;
    const adminId = process.env.ADMIN_ID; // Set in your environment

    if (!chatId || !message) {
      return res.status(400).json({
        message: "Chat ID and message are required",
      });
    }

    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    const chat = await UserChat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Create the reply/message object
    const replyData = {
      message,
      timestamp: new Date(),
      read: false,
    };

    if (messageId) {
      // This is a reply to an existing message
      const targetMessage = chat.messages.id(messageId);
      if (!targetMessage) {
        return res.status(404).json({ message: "Target message not found" });
      }
      targetMessage.reply = {
        ...replyData,
        sender: adminId, // Add sender for replies if needed
      };
    } else {
      // This is a new admin message
      chat.messages.push({
        sender: adminId,
        ...replyData,
        isAdmin: true,
      });
    }

    chat.status = "open";
    chat.adminId = chat.adminId || adminId;
    await chat.save();

    res.status(201).json({
      message: "Reply sent successfully",
      chatId: chat._id,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to send reply",
      error: error.message,
    });
  }
});

// Mark messages as read
router.post("/mark-read", async (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ message: "Chat ID is required" });
    }

    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    const chat = await UserChat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Mark all user messages as read
    chat.messages.forEach((msg) => {
      if (msg.sender.toString() !== chat.adminId?.toString()) {
        msg.read = true;
      }
      if (msg.reply) {
        msg.reply.read = true;
      }
    });

    await chat.save();
    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to mark messages as read",
      error: error.message,
    });
  }
});

// Close a chat
router.post("/close", async (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ message: "Chat ID is required" });
    }

    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    const chat = await UserChat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    chat.status = "closed";
    await chat.save();

    res.status(200).json({
      message: "Chat closed successfully",
      chatId: chat._id,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to close chat",
      error: error.message,
    });
  }
});

export default router;
