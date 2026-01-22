import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";
import { gameSocket, startNewRound } from "./sockets/gameSocket.js";
import depositRoutes from "./routes/deposit.js";

app.use(express.json());
app.use("/api", depositRoutes);
const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

await connectDB();

gameSocket(io);
startNewRound(io);

server.listen(4000, () => console.log("Bingo backend running on 4000"));
