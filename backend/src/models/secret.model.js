import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

const secretSchema = new Schema(
  {
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
    },
    secretID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
    },
    isBurned: {
      type: Boolean,
      default: false,
      index: true,
    },
    burnedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

secretSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

secretSchema.methods.isPasswordCorrect = async function (password) {
  if (!this.password) return true;
  return await bcrypt.compare(password, this.password);
};

export const Secret = mongoose.model("Secret", secretSchema);