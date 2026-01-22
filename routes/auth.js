import express from "express";
import User from "../models/User.js";
import crypto from "crypto";

const router = express.Router();

// Telegram WebApp authentication
router.post("/telegram", async (req, res) => {
  const { initData } = req.body;

  // Verify hash to prevent spoofing
  const SECRET = process.env.TG_BOT_TOKEN;
  const hashString = Object.entries(initData)
    .filter(([k]) => k !== "hash")
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const hash = crypto.createHmac("sha256", SECRET).update(hashString).digest("hex");

  if (hash !== initData.hash) return res.status(403).json({ error: "Invalid initData" });

  const tgId = initData.user.id.toString();
  const name = initData.user.first_name;

  let user = await User.findOne({ telegramId: tgId });
  if (!user) {
    user = await User.create({
      telegramId: tgId,
      name,
      balance: 10 // first-time bonus
    });
  }

  res.json({ success: true, user });
});

export default router;
