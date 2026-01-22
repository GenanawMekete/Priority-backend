import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

// routes & sockets
import depositRoutes from "./routes/deposit.js";
import gameSocket from "./sockets/gameSocket.js";

// load env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

// middleware
app.use(cors());
app.use(express.json());

// health check
app.get("/", (req, res) => {
  res.send("🚀 Bingo Backend Running Successfully");
});

// routes
app.use("/api/deposit", depositRoutes);

// create http server
const server = http.createServer(app);

// socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// init sockets
gameSocket(io);

// connect mongodb
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

// start server
server.listen(PORT, () => {
  console.log(`🚀 Bingo backend running on port ${PORT}`);
});
