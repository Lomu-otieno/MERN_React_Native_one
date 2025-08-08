import express from "express";
import mongoose from "mongoose";
import UserChat from "../models/UserChat.js";
import User from "../models/User.js";

const router = express.Router();

// Modified to always allow message sending
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

// Modified get messages endpoint
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
      // Create empty chat if none exists
      chat = await UserChat.create({
        userId,
        messages: [],
        status: "pending",
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
