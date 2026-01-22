import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import connectDB from "./config/db.js";

import depositRoutes from "./routes/deposit.js";
import { initGameSocket } from "./sockets/gameSocket.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

/* ------------------ MIDDLEWARE ------------------ */

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));

app.use(express.json());

/* ------------------ DATABASE ------------------ */

connectDB();

/* ------------------ ROUTES ------------------ */

// Health check (VERY IMPORTANT FOR RENDER)
app.get("/", (req, res) => {
  res.json({ status: "Bingo backend running 🚀" });
});

// Deposit route (Telebirr / CBE SMS)
app.use("/api/deposit", depositRoutes);

/* ------------------ SOCKET.IO ------------------ */

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize game socket engine
initGameSocket(io);

/* ------------------ SERVER START ------------------ */

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`🚀 Bingo backend running on port ${PORT}`);
});
