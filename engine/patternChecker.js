export function checkWinner(card, called) {
  const c = card.map(row => row.map(n => called.includes(n)));

  // Rows
  for (let r = 0; r < 5; r++) if (c[r].every(x => x)) return true;

  // Columns
  for (let col = 0; col < 5; col++) {
    let ok = true;
    for (let r = 0; r < 5; r++) if (!c[r][col]) ok = false;
    if (ok) return true;
  }

  // Diagonals
  if ([0,1,2,3,4].every(i => c[i][i])) return true;
  if ([0,1,2,3,4].every(i => c[i][4-i])) return true;

  // 4 corners
  if (c[0][0] && c[0][4] && c[4][0] && c[4][4]) return true;

  return false;
}
