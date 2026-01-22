import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

import depositRoutes from "./routes/deposit.js";
import { initGameSocket } from "./sockets/gameSocket.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

/* ---------- Socket.IO ---------- */
const io = new Server(server, {
  cors: {
    origin: "*", // later restrict to Netlify domain
    methods: ["GET", "POST"],
  },
});

/* ---------- Middleware ---------- */
app.use(cors());
app.use(express.json());

/* ---------- Routes ---------- */
app.get("/", (req, res) => {
  res.send("🎉 Bingo Backend Running Successfully");
});

app.use("/api/deposit", depositRoutes);

/* ---------- DB ---------- */
connectDB();

/* ---------- Socket Logic ---------- */
initGameSocket(io);

/* ---------- Port Binding (VERY IMPORTANT FOR RENDER) ---------- */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
