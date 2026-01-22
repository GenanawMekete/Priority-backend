// TELEBIRR PARSER
export function parseTelebirr(text) {
  const amountMatch = text.match(/ETB\s([0-9]+\.?[0-9]*)/);
  const txMatch = text.match(/transaction number is ([A-Z0-9]+)/i);

  if (!amountMatch || !txMatch) return null;

  return {
    provider: "telebirr",
    amount: parseFloat(amountMatch[1]),
    txId: txMatch[1]
  };
}

// CBE BIRR PARSER
export function parseCBE(text) {
  const amountMatch = text.match(/sent ([0-9]+\.?[0-9]*)Br/i);
  const txMatch = text.match(/Txn ID ([A-Z0-9]+)/i);

  if (!amountMatch || !txMatch) return null;

  return {
    provider: "cbe",
    amount: parseFloat(amountMatch[1]),
    txId: txMatch[1]
  };
}
