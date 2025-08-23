const express = require("express");
const router = express.Router();
const User = require("../models/User");
const verifyToken = require("../middleware/verifyToken");

// GET /api/match/find
router.get("/find", verifyToken, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);

        if (!currentUser) {
            return res.status(404).json({ error: "User not found or token invalid." });
        }

        // Normalize preferences
        const minAge = Number(currentUser.minAge) || 18;
        const maxAge = Number(currentUser.maxAge) || 100;
        const interests = Array.isArray(currentUser.interests) ? currentUser.interests : [];
        const location = currentUser.location;

        const baseQuery = {
            _id: { $ne: req.user.id },
            age: { $gte: minAge, $lte: maxAge }
        };

        const optionalConditions = [];
        if (interests.length > 0) optionalConditions.push({ interests: { $in: interests } });
        if (location) optionalConditions.push({ location });

        if (optionalConditions.length > 0) {
            baseQuery.$or = optionalConditions;
        }

        const matches = await User.find(baseQuery).select("-password");
        console.log("Match result raw:", matches);

        
        console.log("Matching users found:", matches.length);
        res.json(matches);
    } catch (error) {
        // Detect JWT-specific issues (e.g., token expired, malformed)
        if (error.name === "JsonWebTokenError") {
            console.error("Invalid token:", error.message);
            return res.status(401).json({ error: "Invalid token. Please log in again." });
        }

        if (error.name === "TokenExpiredError") {
            console.error("Token expired:", error.message);
            return res.status(401).json({ error: "Session expired. Please log in again." });
        }

        console.error("Error fetching matches:", error);
        res.status(500).json({ error: "Server error, please try again." });
    }
});

module.exports = router;
