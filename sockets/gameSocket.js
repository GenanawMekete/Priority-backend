import { Server } from "socket.io";
import { startDrawEngine } from "../engine/drawEngine.js";
import { checkWinner } from "../engine/patternChecker.js";
import Card from "../models/Card.js";

// In-memory tracking
let takenCards = new Set();
let playersInLobby = {};
let gameStarted = false;

export default function initializeGameSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  // Example: load predefined cards (replace with DB)
  const predefinedCards = Array.from({ length: 400 }, (_, i) => {
    // 5x5 array
    const arr = Array.from({ length: 25 }, () => Math.floor(Math.random() * 75) + 1);
    arr[12] = "FREE"; // center free
    return arr;
  });

  function getCardByNumber(cardNumber) {
    return predefinedCards[cardNumber - 1];
  }

  io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    socket.on("join-lobby", ({ telegramId }) => {
      if (gameStarted) {
        socket.emit("lobby-closed");
        return;
      }
      if (!playersInLobby[telegramId]) {
        playersInLobby[telegramId] = {
          telegramId,
          selectedCards: [],
        };
      }
      socket.emit("lobby-status", {
        takenCards: Array.from(takenCards),
        playerCards: playersInLobby[telegramId].selectedCards,
      });
    });

    socket.on("select-card", ({ telegramId, cardNumber }) => {
      if (gameStarted) return;

      const player = playersInLobby[telegramId];
      if (!player || player.selectedCards.length >= 3) return;

      if (!takenCards.has(cardNumber)) {
        takenCards.add(cardNumber);

        const cardContent = getCardByNumber(cardNumber);
        player.selectedCards.push({ cardNumber, cardContent });

        socket.emit("cards-assigned", { cardNumber, cardContent });
        io.emit("card-taken", { cardNumber });

        // Auto-start if all players have 3 cards
        const allReady = Object.values(playersInLobby).every(
          (p) => p.selectedCards.length === 3
        );
        if (allReady) {
          setTimeout(() => startGame(), 1000);
        }
      }
    });

    function startGame() {
      if (gameStarted) return;
      gameStarted = true;

      const gamePlayers = Object.values(playersInLobby);
      io.emit("game-started", { players: gamePlayers });

      startDrawEngine(io, gamePlayers);
    }

    socket.on("disconnect", () => {
      console.log("Player disconnected:", socket.id);
    });
  });
}
