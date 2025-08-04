import mongoose from "mongoose";

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
    photos: [
      {
        url: { type: String },
        public_id: { type: String },
      },
    ],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    passes: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] },
    ],
    matches: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] },
    ],

    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
