import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  telegramId: { type: String, unique: true },
  balance: { type: Number, default: 10 }, // initial bonus
  blocked: { type: Boolean, default: false }
});

export default mongoose.model("User", UserSchema);
