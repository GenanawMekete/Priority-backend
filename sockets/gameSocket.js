import Game from "../models/Game.js";
import { startDrawEngine, stopDrawEngine } from "../engine/drawEngine.js";

export default function gameSocket(io) {
  io.on("connection", (socket) => {
    console.log("🟢 Player connected:", socket.id);

    // Join game
    socket.on("joinGame", async (telegramId) => {
      let game = await Game.findOne({ status: "WAITING" });

      if (!game) {
        game = await Game.create({});
      }

      const exists = game.players.find(p => p.telegramId === telegramId);

      if (!exists) {
        game.players.push({ telegramId, cards: [] });
        await game.save();
      }

      socket.emit("joined", game._id);
      console.log("👤 Player joined:", telegramId);

      // Auto start when first player comes
      if (game.players.length === 1) {
        game.status = "RUNNING";
        await game.save();
        startDrawEngine(io, game);
        console.log("🚀 Game started");
      }
    });

    // Player says BINGO
    socket.on("bingo", async ({ telegramId }) => {
      const game = await Game.findOne({ status: "RUNNING" });

      if (!game) return;

      game.winners.push(telegramId);
      game.status = "FINISHED";
      await game.save();

      stopDrawEngine();

      io.emit("gameFinished", { winner: telegramId });

      console.log("🏆 Winner:", telegramId);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Player disconnected:", socket.id);
    });
  });
}
