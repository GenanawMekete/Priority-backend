// backend/engine/patternChecker.js

export function checkAllPatterns(grid, called) {
  const marked = grid.map(row =>
    row.map(n => n === "FREE" || called.includes(n))
  );

  // Rows
  for (let r = 0; r < 5; r++) {
    if (marked[r].every(v => v)) return true;
  }

  // Columns
  for (let c = 0; c < 5; c++) {
    let win = true;
    for (let r = 0; r < 5; r++) {
      if (!marked[r][c]) win = false;
    }
    if (win) return true;
  }

  // Diagonals
  if (
    marked[0][0] &&
    marked[1][1] &&
    marked[2][2] &&
    marked[3][3] &&
    marked[4][4]
  ) return true;

  if (
    marked[0][4] &&
    marked[1][3] &&
    marked[2][2] &&
    marked[3][1] &&
    marked[4][0]
  ) return true;

  // 4 corners
  if (
    marked[0][0] &&
    marked[0][4] &&
    marked[4][0] &&
    marked[4][4]
  ) return true;

  return false;
}
