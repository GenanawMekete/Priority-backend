import { Server } from "socket.io";
import { generateCard } from "../engine/cardGenerator.js";
import { checkWinner } from "../engine/patternChecker.js";
import { startDrawEngine, stopDrawEngine } from "../engine/drawEngine.js";

// In-memory storage for rooms (replace with DB for production)
const rooms = {}; // roomId => { players: [], cardsTaken: {}, calledNumbers: [], drawInterval, winners: [] }

export default (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // adjust for production
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("New socket connected:", socket.id);

    // =======================
    // Join Lobby / Room
    // =======================
    socket.on("join-lobby", ({ telegramId, roomId }) => {
      if (!rooms[roomId]) {
        rooms[roomId] = {
          players: [],
          cardsTaken: {},
          calledNumbers: [],
          winners: [],
          drawInterval: null,
        };
      }

      // Add player if not exists
      const player = rooms[roomId].players.find((p) => p.telegramId === telegramId);
      if (!player) {
        rooms[roomId].players.push({
          telegramId,
          cards: [], // numbers 1-400 assigned
          hasBingo: false,
        });
      }

      // Send current taken cards for lobby UI
      const cardsArray = Object.entries(rooms[roomId].cardsTaken).map(([number, content]) => ({
        number: parseInt(number),
        content,
      }));
      socket.emit("current-taken-cards", { cards: cardsArray });
    });

    // =======================
    // Player Selects Card
    // =======================
    socket.on("select-card", ({ telegramId, roomId, number }) => {
      const room = rooms[roomId];
      if (!room) return;

      // Already taken
      if (room.cardsTaken[number]) return;

      // Generate unique card content
      const cardContent = generateCard();

      // Mark card as taken
      room.cardsTaken[number] = cardContent;

      // Assign to player
      const player = room.players.find((p) => p.telegramId === telegramId);
      if (player) player.cards.push({ number, content: cardContent });

      // Broadcast to all clients in room
      io.emit("card-assigned", { number, content: cardContent });
    });

    // =======================
    // Start Game Draw
    // =======================
    socket.on("start-game", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room) return;

      room.calledNumbers = [];
      room.winners = [];
      room.players.forEach((p) => (p.hasBingo = false));

      // Start draw engine every 3 seconds
      room.drawInterval = setInterval(() => {
        const nextNumber = startDrawEngine(room.calledNumbers);
        if (!nextNumber) return; // all numbers drawn

        room.calledNumbers.push(nextNumber);
        io.emit("number-called", { number: nextNumber, roomId });
      }, 3000);
    });

    // =======================
    // Player presses BINGO
    // =======================
    socket.on("press-bingo", ({ telegramId, roomId }) => {
      const room = rooms[roomId];
      if (!room || room.winners.includes(telegramId)) return;

      const player = room.players.find((p) => p.telegramId === telegramId);
      if (!player) return;

      let valid = false;
      // Check each assigned card
      for (const c of player.cards) {
        if (checkWinner(c.content, room.calledNumbers)) {
          valid = true;
          break;
        }
      }

      if (!valid) {
        socket.emit("false-bingo", { telegramId });
        return;
      }

      // First valid Bingo → stop draw
      if (room.winners.length === 0) {
        clearInterval(room.drawInterval);
        room.drawInterval = null;
      }

      player.hasBingo = true;
      room.winners.push(telegramId);

      // Announce winners
      const totalPool = room.players.length * 10; // assuming fixed bet
      const derash = totalPool * 0.8;
      const prizePerWinner = derash / room.winners.length;

      io.emit("game-won", {
        roomId,
        winners: room.winners,
        derash,
        prize: prizePerWinner,
      });
    });

    // =======================
    // Disconnect
    // =======================
    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
      // Optional: remove player from rooms if needed
    });
  });
};
