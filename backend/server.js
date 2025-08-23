const express = require("express");
const http = require("http");
const mongoose = require("mongoose");

const dotenv = require("dotenv");
const path = require("path");
const matchRoutes = require("./routes/match");
const connectDB = require("./config/db");
const { Server } = require("socket.io");

const bodyParser = require("body-parser");
const Chat = require("./models/Chat");
const socketIo = require("socket.io");
const chatRoutes = require("./routes/chat"); // ✅ Import chat routes
const cors = require("cors");
dotenv.config();
const app = express();
const server = http.createServer(app);



const authRoutes = require('./routes/auth');


app.use(express.static(path.join(__dirname, "frontend")));

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use("/api/chat", chatRoutes);
app.use("/api/match", matchRoutes);


app.use('/api/auth', authRoutes);

app.use("/api/auth", require("./routes/auth"));
app.use("/api/user", require("./routes/profile"));
app.use("/api/match", require("./routes/match"));

app.use("/api/chat", require("./routes/chat"));


 // ✅ Fix: Properly parse URL-encoded data
app.use('/uploads', express.static('uploads')); // Serve profile pictures
app.use(bodyParser.json());
// ====== Connect to MongoDB Atlas ======
 // ✅ This ensures the database is connected

 
const io = new Server(server, {
  cors: {
      origin: "*",
      methods: ["GET", "POST"]
  }
});

// WebSocket Handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", ({ senderId, receiverId }) => {
      const room = [senderId, receiverId].sort().join("_");
      socket.join(room);
      console.log(`User joined room: ${room}`);
  });

  socket.on("sendMessage", ({ senderId, receiverId, message }) => {
      const room = [senderId, receiverId].sort().join("_");
      socket.to(room).emit("receiveMessage", { senderId, message });// Emit to the reciever only
  });

  socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
  });
});


 
connectDB();


// ====== Routes ======





// ====== Start Server ======
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));