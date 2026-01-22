// backend/sockets/gameSocket.js

import Game from "../models/Game.js";
import Card from "../models/Card.js";
import { startDrawEngine } from "../engine/drawEngine.js";

/* In-memory state (fast, resets if server restarts) */
let rooms = {}; 
// rooms[roomId] = {
//   players: { telegramId: socketId },
//   takenCards: Set(),
//   selectedCards: { telegramId: [cardNumbers] },
//   started: false,
// };

export function initGameSocket(io) {
  io.on("connection", (socket) => {
    console.log("🟢 Player connected:", socket.id);

    /* -------- JOIN ROOM -------- */
    socket.on("join-room", async ({ roomId, telegramId }) => {
      socket.join(roomId);

      if (!rooms[roomId]) {
        rooms[roomId] = {
          players: {},
          takenCards: new Set(),
          selectedCards: {},
          started: false,
        };

        // Create game in DB if not exists
        await Game.create({
          roomId,
          status: "waiting",
          calledNumbers: [],
          players: [],
        });

        console.log("🏠 New room created:", roomId);
      }

      rooms[roomId].players[telegramId] = socket.id;

      socket.emit("room-joined", { roomId });
      console.log(`👤 ${telegramId} joined room ${roomId}`);
    });

    /* -------- CARD SELECTION (1–400) -------- */
    socket.on("select-card", async ({ roomId, telegramId, number }) => {
      const room = rooms[roomId];
      if (!room || room.started) return;

      // Already taken?
      if (room.takenCards.has(number)) {
        socket.emit("card-rejected", number);
        return;
      }

      // Max 3 cards per player
      const current = room.selectedCards[telegramId] || [];
      if (current.length >= 3) return;

      // Generate card content if not exists
      let card = await Card.findOne({ number });

      if (!card) {
        card = await Card.create({
          number,
          grid: generateBingoCard(),
        });
      }

      // Save selection
      room.takenCards.add(number);
      room.selectedCards[telegramId] = [...current, number];

      // Save to DB
      await Game.updateOne(
        { roomId },
        {
          $addToSet: { players: telegramId },
          $push: { cards: { telegramId, number, grid: card.grid } },
        }
      );

      // Broadcast to everyone
      io.to(roomId).emit("card-assigned", {
        number,
        telegramId,
        content: card.grid,
      });

      console.log(`🎴 Card ${number} taken by ${telegramId}`);
    });

    /* -------- AUTO START GAME (WHEN TIMER ENDS OR FIRST PLAYER READY) -------- */
    socket.on("start-game", async ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.started) return;

      room.started = true;

      await Game.updateOne(
        { roomId },
        { status: "running" }
      );

      io.to(roomId).emit("game-started");

      console.log("🚀 Game started in room:", roomId);

      // Start automatic draw engine
      startDrawEngine(io, roomId);
    });

    /* -------- CLAIM BINGO -------- */
    socket.on("claim-bingo", async ({ roomId, telegramId, cardNumber }) => {
      console.log(`🏆 Bingo claim from ${telegramId} on card ${cardNumber}`);

      // Here later we validate patterns
      // For now: accept winner

      io.to(roomId).emit("winner", {
        telegramId,
        cardNumber,
      });

      await Game.updateOne(
        { roomId },
        { status: "finished", winner: telegramId }
      );

      console.log("🎉 Winner:", telegramId);
    });

    /* -------- DISCONNECT -------- */
    socket.on("disconnect", () => {
      console.log("🔴 Player disconnected:", socket.id);
    });
  });
}

/* -------- BINGO CARD GENERATOR (5x5) -------- */
function generateBingoCard() {
  function randomNumbers(min, max, count) {
    const arr = [];
    while (arr.length < count) {
      const n = Math.floor(Math.random() * (max - min + 1)) + min;
      if (!arr.includes(n)) arr.push(n);
    }
    return arr;
  }

  const B = randomNumbers(1, 15, 5);
  const I = randomNumbers(16, 30, 5);
  const N = randomNumbers(31, 45, 5);
  const G = randomNumbers(46, 60, 5);
  const O = randomNumbers(61, 75, 5);

  const grid = [];

  for (let i = 0; i < 5; i++) {
    grid.push([B[i], I[i], N[i], G[i], O[i]]);
  }

  grid[2][2] = "FREE"; // center

  return grid;
}
