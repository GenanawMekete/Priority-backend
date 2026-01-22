import { Server } from "socket.io";
import { Card } from "../models/Card.js";
import { Game } from "../models/Game.js";

// Global lobby state (in memory)
let lobby = {
  takenCards: [],           // all selected cards numbers [1-400]
  players: [],              // { telegramId, selectedCards }
  timer: null,
  countdown: 30,            // lobby countdown seconds
};

let currentGame = null;     // will hold the running game

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    // ========================
    // Player joins lobby
    // ========================
    socket.on("join-lobby", ({ telegramId }) => {
      if (!lobby.players.find((p) => p.telegramId === telegramId)) {
        lobby.players.push({ telegramId, selectedCards: [] });
      }

      // Send current lobby state
      socket.emit("lobby-update", { taken: lobby.takenCards });
    });

    // ========================
    // Player selects card(s)
    // ========================
    socket.on("select-card", ({ telegramId, cardNumber }) => {
      const player = lobby.players.find((p) => p.telegramId === telegramId);
      if (!player) return;

      // Check if card is already taken
      if (lobby.takenCards.includes(cardNumber)) return;

      // Check max selection
      if (player.selectedCards.length >= 3) return;

      // Assign card
      player.selectedCards.push(cardNumber);
      lobby.takenCards.push(cardNumber);

      // Notify all players about updated taken cards
      io.emit("lobby-update", { taken: lobby.takenCards });
    });

    // ========================
    // Player ready
    // ========================
    socket.on("ready", ({ telegramId, selectedCards }) => {
      const player = lobby.players.find((p) => p.telegramId === telegramId);
      if (!player) return;

      player.selectedCards = selectedCards;

      // Mark cards as taken globally if not already
      selectedCards.forEach((num) => {
        if (!lobby.takenCards.includes(num)) lobby.takenCards.push(num);
      });

      io.emit("lobby-update", { taken: lobby.takenCards });

      // If all players ready, start game immediately
      const allReady = lobby.players.every((p) => p.selectedCards.length === 3);
      if (allReady) startGame(io);
    });

    // ========================
    // Lobby countdown
    // ========================
    if (!lobby.timer) {
      lobby.timer = setInterval(() => {
        lobby.countdown -= 1;
        io.emit("lobby-timer", { countdown: lobby.countdown });

        // When time expires, start game with all ready players
        if (lobby.countdown <= 0) {
          clearInterval(lobby.timer);
          lobby.timer = null;
          startGame(io);
        }
      }, 1000);
    }

    // ========================
    // Disconnect cleanup
    // ========================
    socket.on("disconnect", () => {
      console.log("Player disconnected:", socket.id);
    });
  });

  return io;
};

// ========================
// Start Game Function
// ========================
const startGame = async (io) => {
  if (lobby.players.length === 0) return;

  // Create a new game in DB
  const game = new Game({
    players: lobby.players.map((p) => ({
      telegramId: p.telegramId,
      cards: p.selectedCards,
      hasBingo: false,
    })),
    status: "RUNNING",
    calledNumbers: [],
  });

  await game.save();
  currentGame = game;

  // Notify frontend to move to game screen
  io.emit("game-starting", { gameId: game._id });

  // Reset lobby for next round
  lobby = { takenCards: [], players: [], timer: null, countdown: 30 };
};
