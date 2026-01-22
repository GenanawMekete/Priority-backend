import Game from "../models/Game.js";
import Card from "../models/Card.js";
import { startDrawEngine } from "../engine/drawEngine.js";
import { checkWinner } from "../engine/patternChecker.js";

let currentGame = null;

export const initGameSocket = (io) => {

  io.on("connection", (socket) => {
    console.log("🟢 Player connected:", socket.id);

    // Player joins lobby
    socket.on("join-game", async ({ telegramId }) => {

      if (!currentGame || currentGame.status !== "WAITING") {
        socket.emit("error", "Game already started");
        return;
      }

      const cards = await Card.aggregate([{ $sample: { size: 3 } }]);

      currentGame.players.push({
        telegramId,
        cards: cards.map(c => c._id),
        hasBingo: false
      });

      await currentGame.save();

      socket.emit("cards-assigned", cards);
    });

    // Manual bingo press
    socket.on("press-bingo", async ({ telegramId }) => {
      if (!currentGame || currentGame.status !== "RUNNING") return;

      const player = currentGame.players.find(p => p.telegramId === telegramId);
      if (!player || player.hasBingo) return;

      let valid = false;

      for (const cardId of player.cards) {
        const card = await Card.findById(cardId);
        if (checkWinner(card.numbers, currentGame.calledNumbers)) {
          valid = true;
          break;
        }
      }

      if (!valid) {
        socket.emit("false-bingo");
        return;
      }

      player.hasBingo = true;

      if (currentGame.winners.length === 0) {
        currentGame.status = "VERIFY";
      }

      currentGame.winners.push(telegramId);
      await currentGame.save();
    });

    socket.on("disconnect", () => {
      console.log("🔴 Player disconnected:", socket.id);
    });
  });

  // Start first game automatically
  startNewRound(io);
};

/* ------------------ GAME ROUND ENGINE ------------------ */

const startNewRound = async (io) => {
  currentGame = await Game.create({
    status: "WAITING",
    players: [],
    winners: [],
    calledNumbers: []
  });

  io.emit("new-round");

  // 30 seconds lobby
  setTimeout(() => {
    currentGame.status = "RUNNING";
    startDrawEngine(io, currentGame);
  }, 30000);
};
