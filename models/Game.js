  players: [{
    telegramId: String,
    cards: [mongoose.ObjectId],
    hasBingo: { type: Boolean, default: false }
  }],
  calledNumbers: [Number],
  winners: [String]
});

export default mongoose.model("Game", GameSchema);
