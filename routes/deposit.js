import express from "express";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import { parseTelebirrSMS, parseCBEBirrSMS } from "../engine/smsParser.js";

const router = express.Router();
// POST /api/deposit
router.post("/", async (req, res) => {
  try {
    const { telegramId, smsText } = req.body;

    if (!telegramId || !smsText) {
      return res.status(400).json({ error: "Missing telegramId or smsText" });
    }

    let data = null;

    if (smsText.includes("telebirr")) {
      data = parseTelebirrSMS(smsText);
    } else if (smsText.includes("CBE") || smsText.includes("Br.")) {
      data = parseCBEBirrSMS(smsText);
    } else {
      return res.status(400).json({ error: "Unsupported SMS format" });
    }

    if (!data) {
      return res.status(400).json({ error: "Failed to parse SMS" });
    }

    // prevent duplicate transaction
    const exists = await Transaction.findOne({ txnId: data.txnId });
    if (exists) {
      return res.status(400).json({ error: "Transaction already used" });
    }

    // save transaction
    await Transaction.create({
      telegramId,
      amount: data.amount,
      sender: data.sender,
      txnId: data.txnId,
      provider: data.provider
    });

    // update wallet
    let user = await User.findOne({ telegramId });

    if (!user) {
      user = await User.create({
        telegramId,
        balance: 10 // bonus on first join
      });
    }

    user.balance += data.amount;
    await user.save();

    res.json({
      success: true,
      amount: data.amount,
      newBalance: user.balance
    });

  } catch (err) {
    console.error("❌ Deposit error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
