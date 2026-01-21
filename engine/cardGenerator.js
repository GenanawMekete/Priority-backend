import Card from "../models/Card.js";

export async function getRandomCards(count = 3) {
  return await Card.aggregate([{ $sample: { size: count } }]);
}
