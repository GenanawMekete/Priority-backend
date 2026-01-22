import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    unique: true
  },
  balance: {
    type: Number,
    default: 10   // initial bonus
  },
  blocked: {
    type: Boolean,
    default: false
  }
});

const User = mongoose.model("User", userSchema);

export default User;
