import mongoose from "mongoose";

const TxSchema = new mongoose.Schema({
  telegramId: String,
  provider: String,        // telebirr | cbe
  txId: { type: String, unique: true },
  amount: Number,
  rawText: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Transaction", TxSchema);
