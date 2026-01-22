let interval = null;

export function startDrawEngine(io, game) {
  if (interval) return; // already running

  interval = setInterval(() => {
    const number = Math.floor(Math.random() * 75) + 1;

    // avoid duplicates
    if (game.calledNumbers.includes(number)) return;

    game.calledNumbers.push(number);
    game.save();

    // send to all players
    io.emit("numberCalled", number);

    console.log("🎯 Number called:", number);
  }, 3000); // 3 seconds speed
}

export function stopDrawEngine() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}
