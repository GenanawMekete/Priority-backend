// backend/engine/drawEngine.js

import Game from "../models/Game.js";
import { checkAllPatterns } from "./patternChecker.js";

let activeDraws = {}; // roomId -> interval

export function startDrawEngine(io, roomId) {
  if (activeDraws[roomId]) return; // already running

  let available = Array.from({ length: 75 }, (_, i) => i + 1);
  let called = [];

  console.log("🎯 Draw engine started for room:", roomId);

  const interval = setInterval(async () => {
    if (available.length === 0) {
      clearInterval(interval);
      delete activeDraws[roomId];
      return;
    }

    // Draw random number
    const index = Math.floor(Math.random() * available.length);
    const number = available.splice(index, 1)[0];
    called.push(number);

    // Save in DB
    await Game.updateOne(
      { roomId },
      { $push: { calledNumbers: number } }
    );

    // Broadcast number
    io.to(roomId).emit("number-drawn", number);
    console.log("🔢 Drawn:", number);

  }, 3000); // 3 seconds

  activeDraws[roomId] = interval;
}

/* Stop engine when game finishes */
export function stopDrawEngine(roomId) {
  if (activeDraws[roomId]) {
    clearInterval(activeDraws[roomId]);
    delete activeDraws[roomId];
    console.log("⛔ Draw engine stopped for room:", roomId);
  }
}
