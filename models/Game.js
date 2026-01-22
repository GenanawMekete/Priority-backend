import mongoose from "mongoose";

const playerSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true
  },
  cards: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Card"
  }],
  hasBingo: {
    type: Boolean,
    default: false
  }
});

const gameSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["WAITING", "RUNNING", "VERIFY", "FINISHED"],
    default: "WAITING"
  },

  players: [playerSchema],

  winners: [{
    type: String
  }],

  calledNumbers: [{
    type: Number
  }],

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Game = mongoose.model("Game", gameSchema);

export default Game;
