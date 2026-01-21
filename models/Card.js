import mongoose from "mongoose";

const CardSchema = new mongoose.Schema({
  numbers: [[Number]] // 5x5 matrix
});

export default mongoose.model("Card", CardSchema);
