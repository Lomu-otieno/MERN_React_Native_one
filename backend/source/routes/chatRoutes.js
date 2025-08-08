// routes/userChatRoutes.js
import express from "express";
import UserChat from "../models/UserChat.js";
import User from "../models/User.js";

const chat_router = express.Router();

/**
 *  Start a new chat with admin
 *  POST /api/chats
 */

chat_router.post("/", async (req, res) => {
  try {
    const { userId, adminId, message } = req.body;

    if (!userId || !adminId || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newChat = await UserChat.create({
      userId,
      adminId,
      messages: [{ sender: userId, message }],
    });

    res.status(201).json(newChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 *  Get all chats for a specific user
 *  GET /api/chats/:userId
 */
chat_router.get("/:userId", async (req, res) => {
  try {
    const chats = await UserChat.find({ userId: req.params.userId })
      .populate("adminId", "username email")
      .populate("messages.sender", "username email");
    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 *  Get all chats for admin
 *  GET /api/chats/admin/:adminId
 */
chat_router.get("/admin/:adminId", async (req, res) => {
  try {
    const chats = await UserChat.find({ adminId: req.params.adminId })
      .populate("userId", "username email")
      .populate("messages.sender", "username email");
    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 *  Send a message in a chat
 *  POST /api/chats/:chatId/message
 */
chat_router.post("/:chatId/message", async (req, res) => {
  try {
    const { senderId, message } = req.body;

    if (!senderId || !message) {
      return res
        .status(400)
        .json({ message: "Sender and message are required" });
    }

    const chat = await UserChat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    chat.messages.push({ sender: senderId, message });
    await chat.save();

    res.status(200).json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 *  Mark messages as read
 *  PATCH /api/chats/:chatId/read
 */
chat_router.patch("/:chatId/read", async (req, res) => {
  try {
    const chat = await UserChat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    chat.messages.forEach((msg) => (msg.read = true));
    await chat.save();

    res.json({ message: "All messages marked as read", chat });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 *  Change chat status
 *  PATCH /api/chats/:chatId/status
 */
chat_router.patch("/:chatId/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["open", "closed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const chat = await UserChat.findByIdAndUpdate(
      req.params.chatId,
      { status },
      { new: true }
    );

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 *  Delete a chat (admin only)
 *  DELETE /api/chats/:chatId
 */
chat_router.delete("/:chatId", async (req, res) => {
  try {
    await UserChat.findByIdAndDelete(req.params.chatId);
    res.json({ message: "Chat deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default chat_router;
