const express = require("express");
const router = express.Router();
const Chat = require("../models/Chat");
//const authenticateToken = require("../middleware/authenticateToken");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/authenticateToken"); 


function authenticateToken(req, res, next) {
    const token = req.header("Authorization")?.split(" ")[1]; // Extract token
    if (!token) return res.status(403).json({ error: "Access denied. No token provided." });

    jwt.verify(token, "your_secret_key", (err, user) => { // Replace with your actual secret key
        if (err) return res.status(403).json({ error: "Invalid token" });
        req.user = user;
        next();
    });
}
// ✅ Route to send a message
router.post("/send", authMiddleware, async (req, res) => {
    try {

        console.log("Request body:", req.body); // Log the request body

        const { senderId, receiverId, message } = req.body;

        if (!senderId || !receiverId || !message) {

            console.error("Missing required fields:", { senderId, receiverId, message });

            return res.status(400).json({ error: "Missing required fields" });
        }

        const chat = new Chat({
            senderId,
            receiverId,
            message,
            timestamp: new Date()
        });

        await chat.save();

        console.log("Message saved successfully:", chat); // Log the saved message

        res.status(201).json({ success: true, message: "Message sent successfully!", data: chat });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ Route to fetch chat history between two users
router.get("/history/:receiverId", authMiddleware, async (req, res) => {
    try {
        const senderId = req.user.id; // Extract from token
        const receiverId = req.params.receiverId;

        if (!receiverId) {
            return res.status(400).json({ error: "Receiver ID is required" });
        }

        const messages = await Chat.find({
            $or: [
                { senderId, receiverId },
                { senderId: receiverId, receiverId: senderId }
            ]
        }).sort({ timestamp: 1 });

        res.json({ success: true, messages });
    } catch (error) {
        console.error("Error fetching chat history:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;