// backend/engine/drawEngine.js
import Game from "../models/Game.js";

let drawIntervals = {}; // roomId -> interval

/* Generate numbers 1–75 randomly */
function generateShuffledNumbers() {
  const nums = Array.from({ length: 75 }, (_, i) => i + 1);
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  return nums;
}

/* Start automatic drawing for a room */
export function startDrawEngine(io, roomId) {
  console.log("🎯 Starting draw engine for room:", roomId);

  let numbers = generateShuffledNumbers();
  let index = 0;

  drawIntervals[roomId] = setInterval(async () => {
    if (index >= numbers.length) {
      clearInterval(drawIntervals[roomId]);
      delete drawIntervals[roomId];

      await Game.updateOne(
        { roomId },
        { status: "finished" }
      );

      io.to(roomId).emit("game-finished");
      console.log("🏁 Game finished:", roomId);
      return;
    }

    const number = numbers[index++];
    console.log("🔢 Drawn:", number);

    // Save to DB
    await Game.updateOne(
      { roomId },
      { $push: { calledNumbers: number }, status: "running" }
    );

    // Broadcast to players
    io.to(roomId).emit("number-drawn", number);

  }, 4000); // draw every 4 seconds
}

/* Stop a game manually if needed (future admin feature) */
export function stopDrawEngine(roomId) {
  if (drawIntervals[roomId]) {
    clearInterval(drawIntervals[roomId]);
    delete drawIntervals[roomId];
    console.log("🛑 Draw stopped for room:", roomId);
  }
}
