
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Unique college roll number for students
    rollNumber: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      unique: true,
      required: function () {
        return this.role === "student";
      },
    },

    // Username for admin login
    username: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
    },

    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
