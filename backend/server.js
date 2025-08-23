const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const matchRoutes = require("./routes/match");
const chatRoutes = require("./routes/chat");

const cors = require("cors");
dotenv.config();

const app = express();
const server = http.createServer(app);

// ====== CORS Setup ======
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://matrimonial-site.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow tools like Postman
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// ====== Middleware ======
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve uploaded images
app.use("/uploads", express.static("uploads"));

// ====== Routes ======
app.use("/api/auth", authRoutes);
app.use("/api/user", profileRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/chat", chatRoutes);

// ====== Socket.io Setup ======
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("joinRoom", ({ senderId, receiverId }) => {
    const room = [senderId, receiverId].sort().join("_");
    socket.join(room);
    console.log(`📌 User joined room: ${room}`);
  });

  socket.on("sendMessage", ({ senderId, receiverId, message }) => {
    const room = [senderId, receiverId].sort().join("_");
    io.to(room).emit("receiveMessage", { senderId, message });
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// ====== Connect to DB & Start Server ======
connectDB();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
