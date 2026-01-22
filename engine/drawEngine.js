import { Game } from "../models/Game.js";

// Draw Engine
let drawIntervals = {}; // { gameId: intervalId }

export const startDrawEngine = (io, game) => {
  if (!game || !game._id) return;

  const numbers = Array.from({ length: 75 }, (_, i) => i + 1);
  shuffle(numbers);

  game.calledNumbers = [];
  game.status = "RUNNING";
  game.winners = [];
  game.save();

  drawIntervals[game._id] = setInterval(async () => {
    if (numbers.length === 0) {
      clearInterval(drawIntervals[game._id]);
      return;
    }

    const nextNumber = numbers.shift();
    game.calledNumbers.push(nextNumber);
    await game.save();

    // Emit called number to all players
    io.emit("number-called", nextNumber);

    // Check winners automatically
    await checkWinners(io, game);

  }, 3000); // 3 seconds draw
};

// Stop draw engine
export const stopDrawEngine = (gameId) => {
  if (drawIntervals[gameId]) clearInterval(drawIntervals[gameId]);
};

// Shuffle helper
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// ========================
// Check winners function
// ========================
const checkWinners = async (io, game) => {
  // Skip if already finished
  if (game.status !== "RUNNING") return;

  const winners = [];

  for (const player of game.players) {
    if (player.hasBingo) continue;

    for (const cardNumbers of player.cards) {
      if (checkWinner(cardNumbers, game.calledNumbers)) {
        winners.push(player.telegramId);
        player.hasBingo = true;
        break;
      }
    }
  }

  if (winners.length > 0) {
    game.status = "FINISHED";
    game.winners = winners;

    // Calculate derash
    const totalPool = game.players.length * 10; // fixed bet 10
    const derash = totalPool * 0.8;
    const prize = derash / winners.length;

    await game.save();

    // Stop draw engine
    stopDrawEngine(game._id);

    // Emit winners
    io.emit("game-won", { winners, derash, prize });

    // Wait 5 seconds before allowing next game
    setTimeout(() => {
      io.emit("new-round");
    }, 5000);
  }
};

// ========================
// Winning Patterns Checker
// ========================
const checkWinner = (cardNumbers, calledNumbers) => {
  // cardNumbers = 5x5 array
  const grid = cardNumbers;
  const calledSet = new Set(calledNumbers);

  // Check rows
  for (let r = 0; r < 5; r++) {
    if (grid[r].every((n) => n === "FREE" || calledSet.has(n))) return true;
  }

  // Check columns
  for (let c = 0; c < 5; c++) {
    if (grid.map((r) => r[c]).every((n) => n === "FREE" || calledSet.has(n))) return true;
  }

  // Check diagonals
  const diag1 = [0, 1, 2, 3, 4].every((i) => grid[i][i] === "FREE" || calledSet.has(grid[i][i]));
  const diag2 = [0, 1, 2, 3, 4].every((i) => grid[i][4 - i] === "FREE" || calledSet.has(grid[i][4 - i]));
  if (diag1 || diag2) return true;

  // Check 4 corners
  const corners = [grid[0][0], grid[0][4], grid[4][0], grid[4][4]];
  if (corners.every((n) => n === "FREE" || calledSet.has(n))) return true;

  return false;
};
