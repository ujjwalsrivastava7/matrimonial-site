const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const matchRoutes = require("./routes/match");
const chatRoutes = require("./routes/chat");

dotenv.config();

const app = express();
const server = http.createServer(app);

// ✅ Allow only your frontend domain in CORS
app.use(cors({
  origin: "https://matrimonial-site.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads')); // Serve profile pictures

// ====== Routes ======
app.use("/api/auth", authRoutes);
app.use("/api/user", profileRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/chat", chatRoutes);

// ====== WebSocket Setup ======
const io = new Server(server, {
  cors: {
    origin: "https://matrimonial-site.vercel.app",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", ({ senderId, receiverId }) => {
    const room = [senderId, receiverId].sort().join("_");
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });

  socket.on("sendMessage", ({ senderId, receiverId, message }) => {
    const room = [senderId, receiverId].sort().join("_");
    io.to(room).emit("receiveMessage", { senderId, message }); // ✅ Send to all in room
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ====== Connect DB ======
connectDB();

// ====== Start Server ======
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
