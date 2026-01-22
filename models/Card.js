import mongoose from "mongoose";

const cardSchema = new mongoose.Schema({
  numbers: {
    type: [[Number]],
    required: true
  }
});

const Card = mongoose.model("Card", cardSchema);

export default Card;
