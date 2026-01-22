import { Server } from "socket.io";
import Card from "../models/Card.js";
import Game from "../models/Game.js";
import { checkWinner } from "../engine/patternChecker.js";
import { startDrawEngine } from "../engine/drawEngine.js";

let currentGame = null;

export default function initGameSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Player joins the game
    socket.on("join-game", async ({ telegramId }) => {
      if (!currentGame) {
        currentGame = new Game({
          status: "WAITING",
          players: [],
          calledNumbers: [],
        });
        await currentGame.save();
      }

      if (currentGame.status !== "WAITING") {
        socket.emit("game-started");
        return;
      }

      // Add player if not already
      if (!currentGame.players.find((p) => p.telegramId === telegramId)) {
        currentGame.players.push({
          telegramId,
          cards: [],
          hasBingo: false,
        });
      }

      await currentGame.save();
      socket.emit("joined-game", { message: "Joined lobby" });
      io.emit("player-count", { count: currentGame.players.length });
    });

    // Player selects a card from lobby (1-400)
    socket.on("select-card", async ({ telegramId, number }) => {
      if (!currentGame) return;
      const player = currentGame.players.find((p) => p.telegramId === telegramId);
      if (!player) return;
      if (player.cards.length >= 3) return;

      // Check if card is already assigned
      const assignedNumbers = currentGame.players.flatMap((p) =>
        p.cards.map((c) => c.number)
      );
      if (assignedNumbers.includes(number)) return;

      // Assign card
      const card = await Card.findOne({ number }); // predefined card
      if (!card) return;

      player.cards.push({ number, cardId: card._id });
      await currentGame.save();

      io.emit("card-assigned", { number, content: card.numbers });
    });

    // Manual Bingo pressed
    socket.on("press-bingo", async ({ telegramId }) => {
      if (!currentGame || currentGame.status !== "RUNNING") return;

      const player = currentGame.players.find((p) => p.telegramId === telegramId);
      if (!player || player.hasBingo) return;

      let valid = false;

      for (const c of player.cards) {
        const cardData = await Card.findById(c.cardId);
        if (checkWinner(cardData.numbers, currentGame.calledNumbers)) {
          valid = true;
          break;
        }
      }

      if (!valid) {
        socket.emit("false-bingo", { telegramId });
        return;
      }

      player.hasBingo = true;

      // First valid bingo → stop draw engine
      if (!currentGame.winners || currentGame.winners.length === 0) {
        currentGame.status = "VERIFY";
        if (currentGame.drawInterval) clearInterval(currentGame.drawInterval);
      }

      currentGame.winners = currentGame.winners || [];
      currentGame.winners.push(telegramId);
      await currentGame.save();

      // 1s delay to catch simultaneous winners
      setTimeout(async () => {
        const winners = [];
        for (const p of currentGame.players) {
          for (const c of p.cards) {
            const cardData = await Card.findById(c.cardId);
            if (checkWinner(cardData.numbers, currentGame.calledNumbers)) {
              winners.push(p.telegramId);
              break;
            }
          }
        }

        const totalPool = currentGame.players.length * 10;
        const derash = totalPool * 0.8;
        const prizePerWinner = derash / winners.length;

        currentGame.status = "FINISHED";
        currentGame.winners = winners;
        await currentGame.save();

        io.emit("game-won", { winners, derash, prizePerWinner });

        // 5s winner announcement then reset game
        setTimeout(() => {
          currentGame = null;
          io.emit("new-round");
        }, 5000);
      }, 1000);
    });

    // Start game draw manually after lobby countdown
    socket.on("start-game", async () => {
      if (!currentGame || currentGame.status !== "WAITING") return;

      currentGame.status = "RUNNING";
      await currentGame.save();

      // Start drawing numbers every 3 seconds
      startDrawEngine(io, currentGame);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
}
