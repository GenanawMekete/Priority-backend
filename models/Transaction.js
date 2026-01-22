import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  telegramId: String,
  amount: Number,
  method: String, // telebirr / cbe
  txId: String,
  status: {
    type: String,
    default: "PENDING"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
