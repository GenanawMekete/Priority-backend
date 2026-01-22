// engine/smsParser.js

// TELEBIRR SMS PARSER
export function parseTelebirrSMS(text) {
  /*
  Example:
  Dear Genanew 
  You have transferred ETB 200.00 to mitku tasew (2519****6445) on 07/01/2026 14:43:00.
  Your transaction number is DA79MIEY8X.
  */

  try {
    const amountMatch = text.match(/ETB\s+([\d.]+)/);
    const txnMatch = text.match(/transaction number is\s+([A-Z0-9]+)/i);

    if (!amountMatch || !txnMatch) return null;

    return {
      provider: "telebirr",
      amount: parseFloat(amountMatch[1]),
      transactionId: txnMatch[1]
    };
  } catch (err) {
    return null;
  }
}

// CBE BIRR SMS PARSER
export function parseCBEBirrSMS(text) {
  /*
  Example:
  Dear AMANUEL, you have sent 190.00Br. to TADESE MESERET on 20/01/26 21:35,
  Txn ID DAK413U7RTC.
  */

  try {
    const amountMatch = text.match(/sent\s+([\d.]+)Br/i);
    const txnMatch = text.match(/Txn ID\s+([A-Z0-9]+)/i);

    if (!amountMatch || !txnMatch) return null;

    return {
      provider: "cbebirr",
      amount: parseFloat(amountMatch[1]),
      transactionId: txnMatch[1]
    };
  } catch (err) {
    return null;
  }
}
