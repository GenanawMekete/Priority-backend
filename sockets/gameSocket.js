import { Server } from "socket.io";
import { Card } from "../models/Card.js";
import { Game } from "../models/Game.js";

// Helper to check if card numbers match winning pattern
import { checkWinner } from "../engine/patternChecker.js";
import { startDrawEngine, stopDrawEngine } from "../engine/drawEngine.js";

// Keep all active rooms here (for future multi-room support)
const activeGames = {}; // roomId → game object

export const initializeGameSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("Player connected", socket.id);

    // ===========================
    // JOIN GAME / ROOM
    // ===========================
    socket.on("join-game", async ({ telegramId, roomId = "default" }) => {
      if (!activeGames[roomId]) {
        // Initialize room if it doesn't exist
        activeGames[roomId] = {
          roomId,
          players: [],
          calledNumbers: [],
          status: "WAITING",
          winners: [],
          drawInterval: null,
        };
      }

      const game = activeGames[roomId];

      // Avoid duplicate joins
      if (!game.players.find((p) => p.telegramId === telegramId)) {
        game.players.push({
          telegramId,
          cards: [], // card numbers assigned
          hasBingo: false,
        });
      }

      socket.join(roomId);
      io.to(roomId).emit("players-updated", game.players.map((p) => p.telegramId));
    });

    // ===========================
    // SELECT CARD
    // ===========================
    socket.on("select-card", async ({ telegramId, number, roomId = "default" }) => {
      const game = activeGames[roomId];
      if (!game) return;

      // Check if card is already taken
      if (game.players.some((p) => p.cards.includes(number))) {
        socket.emit("card-taken", number);
        return;
      }

      // Assign random bingo numbers to this card
      const cardDoc = await Card.aggregate([{ $sample: { size: 1 } }]);
      const cardContent = cardDoc[0].numbers;

      // Update game state
      game.players.forEach((p) => {
        if (p.telegramId === telegramId) {
          p.cards.push(number);
        }
      });

      // Broadcast to everyone that this card number is now taken
      io.to(roomId).emit("card-assigned", { number, content: cardContent });
    });

    // ===========================
    // UNSELECT CARD
    // ===========================
    socket.on("unselect-card", ({ telegramId, number, roomId = "default" }) => {
      const game = activeGames[roomId];
      if (!game) return;

      game.players.forEach((p) => {
        if (p.telegramId === telegramId) {
          p.cards = p.cards.filter((c) => c !== number);
        }
      });

      io.to(roomId).emit("card-unassigned", { number });
    });

    // ===========================
    // PRESS BINGO
    // ===========================
    socket.on("press-bingo", async ({ telegramId, roomId = "default" }) => {
      const game = activeGames[roomId];
      if (!game || game.status !== "RUNNING") return;

      const player = game.players.find((p) => p.telegramId === telegramId);
      if (!player || player.hasBingo) return;

      let valid = false;

      for (const cardNumber of player.cards) {
        const card = await Card.findOne({ number: cardNumber });
        if (card && checkWinner(card.numbers, game.calledNumbers)) {
          valid = true;
          break;
        }
      }

      if (!valid) {
        socket.emit("false-bingo");
        return;
      }

      // Mark player as winner
      player.hasBingo = true;
      game.winners.push(telegramId);

      // Stop draw engine if first valid bingo
      if (game.winners.length === 1) {
        stopDrawEngine(game.drawInterval);
        game.status = "VERIFY";

        // Verify all other players
        setTimeout(async () => {
          const finalWinners = [];

          for (const p of game.players) {
            for (const cardNumber of p.cards) {
              const card = await Card.findOne({ number: cardNumber });
              if (card && checkWinner(card.numbers, game.calledNumbers)) {
                finalWinners.push(p.telegramId);
                break;
              }
            }
          }

          const totalPool = game.players.length * 10;
          const derash = totalPool * 0.8;
          const prize = derash / finalWinners.length;

          game.status = "FINISHED";
          io.to(roomId).emit("game-won", {
            winners: finalWinners,
            derash,
            prize,
          });

          // Reset after 5 seconds
          setTimeout(() => {
            activeGames[roomId] = {
              roomId,
              players: [],
              calledNumbers: [],
              status: "WAITING",
              winners: [],
              drawInterval: null,
            };
            io.to(roomId).emit("new-round");
          }, 5000);
        }, 1000);
      }
    });

    // ===========================
    // START DRAW (ADMIN / SERVER)
    // ===========================
    socket.on("start-draw", ({ roomId = "default" }) => {
      const game = activeGames[roomId];
      if (!game || game.status !== "WAITING") return;

      game.status = "RUNNING";

      game.drawInterval = startDrawEngine(io, roomId, game.calledNumbers);
    });

    // ===========================
    // DISCONNECT
    // ===========================
    socket.on("disconnect", () => {
      console.log("Player disconnected", socket.id);
      // Optional: remove player from all rooms
      Object.values(activeGames).forEach((game) => {
        game.players = game.players.filter((p) => p.socketId !== socket.id);
      });
    });
  });
};
