import Game from "../models/Game.js";
import User from "../models/User.js";
import Card from "../models/Card.js";
import { getRandomCards } from "../engine/cardGenerator.js";
import { checkWinner } from "../engine/patternChecker.js";
import { startDraw } from "../engine/drawEngine.js";

let currentGame = null;

export function gameSocket(io) {
  io.on("connection", socket => {

    // Join game
    socket.on("join-game", async ({ telegramId }) => {
      let user = await User.findOne({ telegramId });
      if (!user) user = await User.create({ telegramId });

      if (!currentGame || currentGame.status !== "WAITING") return;
      if (currentGame.players.length >= 400) return;

      if (user.balance < 10) return;

      user.balance -= 10;
      await user.save();

      const cards = await getRandomCards(3);

      currentGame.players.push({
        telegramId,
        cards: cards.map(c => c._id)
      });

      socket.emit("cards-assigned", cards.map(c => c.numbers));
    });

    // Manual BINGO
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
        const user = await User.findOne({ telegramId });
        user.blocked = true;
        await user.save();
        socket.emit("false-bingo");
        return;
      }

      // First bingo stops draw
      if (currentGame.winners.length === 0) {
        currentGame.status = "VERIFY";
      }

      player.hasBingo = true;
      currentGame.winners.push(telegramId);

      // Verify all players once
      setTimeout(async () => {
        const winners = [];

        for (const p of currentGame.players) {
          for (const cardId of p.cards) {
            const card = await Card.findById(cardId);
            if (checkWinner(card.numbers, currentGame.calledNumbers)) {
              winners.push(p.telegramId);
              break;
            }
          }
        }

        const total = currentGame.players.length * 10;
        const derash = total * 0.8;
        const prize = derash / winners.length;

        for (const w of winners) {
          const u = await User.findOne({ telegramId: w });
          u.balance += prize;
          await u.save();
        }

        io.emit("game-won", { winners, derash, prize });

        // Reset after 5s
        setTimeout(async () => {
          await Game.deleteMany({});
          startNewRound(io);
        }, 5000);

      }, 1000);
    });

  });
}

export async function startNewRound(io) {
  currentGame = await Game.create({
    status: "WAITING",
    players: [],
    calledNumbers: [],
    winners: []
  });

  // Lobby 30 seconds
  setTimeout(() => {
    currentGame.status = "RUNNING";
    startDraw(io, currentGame);
  }, 30000);
}
