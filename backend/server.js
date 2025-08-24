const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");
const cors = require("cors");

// Import Routes
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const matchRoutes = require("./routes/match");
const chatRoutes = require("./routes/chat");

// Import DB Connection
const connectDB = require("./config/db");

dotenv.config();
const app = express();
const server = http.createServer(app);

// ====== Middleware ======
// Dynamic CORS configuration for Vercel deployments
const allowedOrigins = [
  "http://localhost:3000", // Local development
  "https://matrimonial-site-q8v9yn2cy-ujjwalsrivastava7s-projects.vercel.app", // Your current Vercel domain
  /\.vercel\.app$/, // Allow all Vercel deployments
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in the allowed list or matches the pattern
    if (allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    })) {
      callback(null, true);
    } else {
      console.log('CORS blocked for origin:', origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

app.options("*", cors()); // Handle preflight

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve frontend (optional, if you want to serve static frontend from backend)
app.use(express.static(path.join(__dirname, "frontend")));

// Serve uploads folder (for profile pictures)
app.use("/uploads", express.static("uploads"));

// ====== Routes ======
app.use("/api/auth", authRoutes);
app.use("/api/user", profileRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/chat", chatRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// ====== Socket.IO Setup ======
const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      // Same CORS logic as above
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.some(allowedOrigin => {
        if (typeof allowedOrigin === 'string') {
          return origin === allowedOrigin;
        } else if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }
        return false;
      })) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
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
    socket.to(room).emit("receiveMessage", { senderId, message }); // Emit to the receiver
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ====== Connect to MongoDB ======
connectDB();

// ====== Start Server ======
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));