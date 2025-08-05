import mongoose from "mongoose";

// Validator function for photos array limit
function arrayLimit(val) {
  return val.length <= 18;
}

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profileImage: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
    },
    location: {
      type: String,
    },
    interests: {
      type: [String],
      default: [],
    },
    photos: {
      type: [
        new mongoose.Schema({
          url: { type: String, required: true },
          public_id: { type: String, required: true },
          createdAt: { type: Date, default: Date.now },
        }),
      ],
      validate: [arrayLimit, "{PATH} exceeds the limit of 18"],
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    passes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    matches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
