import express from "express";
import UserChat from "../models/UserChat.js";
import mongoose from "mongoose";
import User from "../models/User.js";

const router = express.Router();

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
      // populate both message sender and reply sender
      .populate("messages.sender", "name email profileImage")
      .populate("messages.reply.sender", "name email profileImage");

    if (!chat) {
      const admin = await getAvailableAdmin();

      chat = await UserChat.create({
        userId,
        adminId: admin?._id || null,
        messages: [],
        status: admin ? "open" : "pending",
      });

      // populate newly created chat for response
      chat = await UserChat.findById(chat._id)
        .populate("userId", "name email profileImage")
        .populate("adminId", "name email profileImage")
        .populate("messages.sender", "name email profileImage")
        .populate("messages.reply.sender", "name email profileImage");
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
/* Send message (unchanged) */
router.post("/send", async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        message: "User ID and message are required",
        code: "MISSING_FIELDS",
      });
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
//all messages
router.get("/messages/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
        code: "MISSING_USER_ID",
      });
    }

    const chat = await UserChat.findOne({ userId });

    if (!chat) {
      return res.status(404).json({
        message: "No chat found for this user",
        code: "CHAT_NOT_FOUND",
      });
    }

    res.status(200).json({
      messages: chat.messages,
      chatId: chat._id,
      status: chat.status,
      message: "Messages retrieved successfully",
    });
  } catch (error) {
    console.error("Message retrieval error:", error);
    res.status(500).json({
      message: "Failed to retrieve messages",
      error: error.message,
      code: "SERVER_ERROR",
    });
  }
});

// GET single chat messages
router.get("/chat/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await UserChat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    res.status(200).json({
      chatId: chat._id,
      adminId: chat.adminId,
      status: chat.status,
      messages: chat.messages, // array of messages
    });
  } catch (error) {
    console.error("Fetch chat error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch chat", error: error.message });
  }
});

/* POST: Admin replies — now supports replying to a specific messageId (reply field)
   If messageId is provided, set reply on that message.
   If messageId is omitted, push a standalone admin message into messages[] (backwards-compatible).
*/
router.post("/reply", async (req, res) => {
  try {
    const { chatId, adminId, message, messageId } = req.body;

    if (!chatId || !adminId || !message) {
      return res.status(400).json({
        message: "Chat ID, Admin ID, and message are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    const chat = await UserChat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // If messageId provided -> attach reply to that message
    if (messageId) {
      const target = chat.messages.id(messageId);
      if (!target) {
        return res.status(404).json({ message: "Target message not found" });
      }

      target.reply = {
        sender: adminId,
        message,
        timestamp: new Date(),
        read: false,
      };
    } else {
      // Fallback: push as a standalone admin message (existing behaviour)
      chat.messages.push({
        sender: adminId,
        message,
        timestamp: new Date(),
        read: false,
      });
    }

    chat.status = "open";
    chat.adminId = chat.adminId || adminId;
    await chat.save();

    return res.status(201).json({
      message: "Reply saved successfully",
      chatId: chat._id,
    });
  } catch (error) {
    console.error("Admin reply error:", error);
    res.status(500).json({
      message: "Failed to send reply",
      error: error.message,
    });
  }
});
/* GET admin replies for a specific chat
   Returns replies attached to messages and standalone admin messages.
*/
router.get("/reply/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Valid chat ID is required" });
    }

    const chat = await UserChat.findById(chatId)
      .populate("messages.sender", "name email profileImage")
      .populate("messages.reply.sender", "name email profileImage")
      .populate("adminId", "name email profileImage");

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const adminIdStr = chat.adminId ? chat.adminId.toString() : null;

    // replies that are attached to user messages
    const repliesOnMessages = chat.messages
      .filter(
        (msg) =>
          msg.reply &&
          (!adminIdStr || msg.reply.sender?.toString() === adminIdStr)
      )
      .map((msg) => ({
        parentMessageId: msg._id,
        parentMessage: msg.message,
        reply: msg.reply,
      }));

    // admin standalone messages (messages where sender === adminId)
    const adminMessages = chat.messages
      .filter((msg) => adminIdStr && msg.sender?.toString() === adminIdStr)
      .map((msg) => ({
        messageId: msg._id,
        message: msg.message,
        timestamp: msg.timestamp,
        read: msg.read,
      }));

    res.status(200).json({
      chatId: chat._id,
      adminId: chat.adminId,
      repliesOnMessages: repliesOnMessages,
      adminMessages: adminMessages,
    });
  } catch (error) {
    console.error("Error fetching admin replies:", error);
    res.status(500).json({
      message: "Failed to fetch admin replies",
      error: error.message,
    });
  }
});

/* Mark messages as read (also mark nested replies as read) */
router.patch("/:chatId/read", async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    const chat = await UserChat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const userIdStr = chat.userId.toString();

    chat.messages.forEach((msg) => {
      // mark admin messages (those not from the user) as read
      if (msg.sender?.toString() !== userIdStr) {
        msg.read = true;
      }
      // mark nested reply read if it's from admin (not from user)
      if (
        msg.reply &&
        msg.reply.sender &&
        msg.reply.sender.toString() !== userIdStr
      ) {
        msg.reply.read = true;
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
