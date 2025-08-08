import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
); // Keep _id for individual messages

const userChatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One chat per user
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    messages: [messageSchema],
    status: {
      type: String,
      enum: ["open", "closed", "pending"],
      default: "pending",
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Update lastActivity when messages change
userChatSchema.pre("save", function (next) {
  if (this.isModified("messages")) {
    this.lastActivity = new Date();
  }
  next();
});

const UserChat = mongoose.model("UserChat", userChatSchema);
export default UserChat;
