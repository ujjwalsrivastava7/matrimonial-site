/*const express = require("express");
const multer = require("multer");
const path = require("path");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"];
    if (!token) return res.status(403).json({ error: "No token provided" });

    jwt.verify(token.split(" ")[1], process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(500).json({ error: "Invalid token" });
        req.userId = decoded.id;
        next();
    });
};

// Set storage engine for Multer
const storage = multer.diskStorage({
    destination: "./uploads/", // Store images in the 'uploads' folder
    filename: (req, file, cb) => {
        cb(null, req.userId + path.extname(file.originalname)); // Unique filename
    }
});

const upload = multer({ storage });

// API to Upload Profile Picture
router.post("/upload-photo", verifyToken, upload.single("profilePhoto"), async (req, res) => {
    try {
        const filePath = "/uploads/" + req.file.filename;
        await User.findByIdAndUpdate(req.userId, { profilePhoto: filePath });

        res.json({ message: "Profile photo updated!", filePath });
    } catch (error) {
        res.status(500).json({ error: "Error uploading profile photo" });
    }
});

// API to Get User Profile
router.get("/profile", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Error fetching profile" });
    }
});


router.post("/update", verifyToken, async (req, res) => {
    try {
        const { name, age, minAge, maxAge, interests, location } = req.body;

        const updatedProfile = await User.findByIdAndUpdate(
            req.userId,
            {
                name,
                age,
                minAge,
                maxAge,
                interests: interests.split(","), // Convert string to array
                location
            },
            { new: true }
        );

        res.json({ message: "Profile updated successfully!", user: updatedProfile });
    } catch (error) {
        res.status(500).json({ error: "Error updating profile" });
    }
});




// API to Get User Profile

// ✅ API to Update Profile with New Matchmaking Parameters
router.post("/update", verifyToken, async (req, res) => {
    try {
        const { name, age, bio, minAge, maxAge, interests, location } = req.body;

        await User.findByIdAndUpdate(req.userId, {
            name,
            age,
            bio,
            minAge,
            maxAge,
            interests: Array.isArray(interests) ? interests : interests.split(",").map(i => i.trim()),
            location
        });

        res.json({ success: true, message: "Profile updated successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Error updating profile" });
    }
});



module.exports = router;
*/
const express = require("express");
const multer = require("multer");
const path = require("path");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const router = express.Router();

// ✅ Middleware to Verify JWT Token
const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"];
    if (!token) return res.status(403).json({ error: "No token provided" });

    jwt.verify(token.split(" ")[1], process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(500).json({ error: "Invalid token" });
        req.userId = decoded.id;
        next();
    });
};

// ✅ Multer Storage Configuration for Profile Pictures
const storage = multer.diskStorage({
    destination: "./uploads/",
    filename: (req, file, cb) => {
        cb(null, req.userId + path.extname(file.originalname)); // Unique filename per user
    }
});

const upload = multer({ storage });

// ✅ Upload Profile Picture
router.post("/upload-photo", verifyToken, upload.single("profilePhoto"), async (req, res) => {
    try {
        const filePath = "/uploads/" + req.file.filename;
        const updatedUser = await User.findByIdAndUpdate(
            req.userId,
            { profilePhoto: filePath },
            { new: true }
        );

        res.json({ message: "Profile photo updated!", user: updatedUser });
    } catch (error) {
        res.status(500).json({ error: "Error uploading profile photo" });
    }
});

// ✅ Get User Profile
router.get("/profile", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Error fetching profile" });
    }
});

// ✅ Update Profile (Merged and Fixed)
// Update Profile (basic version)
router.put("/update-profile", verifyToken, async (req, res) => {
    try {
        const updatedProfile = await User.findByIdAndUpdate(
            req.userId,
            {
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                age: req.body.age,
                gender: req.body.gender,
                religion: req.body.religion,
                caste: req.body.caste,
                education: req.body.education,
                occupation: req.body.occupation,
                bio: req.body.bio
            },
            { new: true }
        );

        res.json({ 
            success: true, 
            message: "Profile updated successfully!", 
            user: updatedProfile 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: "Error updating profile" 
        });
    }
});

// ================== UPDATE PREFERENCES ==================
router.post("/update-preferences", verifyToken, async (req, res) => {
    try {
        const { minAge, maxAge, interests = [], location, preferredReligions } = req.body;
        
        // Validate input
        if (minAge < 18 || maxAge > 100) {
            return res.status(400).json({ 
                error: "Age range must be between 18-100" 
            });
        }

        // Clean and validate interests
        const cleanedInterests = Array.isArray(interests)
            ? interests.map(i => i.toString().trim()).filter(i => i)
            : interests.split(',').map(i => i.trim()).filter(i => i);

        // Clean preferredReligions
        const cleanedReligions = Array.isArray(preferredReligions)
            ? preferredReligions.filter(r => 
                ['hindu', 'muslim', 'christian', 'sikh', 'jain', 'buddhist', 'other'].includes(r))
            : [preferredReligions].filter(Boolean);

        const updateData = {
            preferences: {
                minAge: Math.max(18, parseInt(minAge)),
                maxAge: Math.min(100, parseInt(maxAge)),
                interests: cleanedInterests,
                location: location?.trim(),
                preferredReligions: cleanedReligions
            }
        };

        const updatedUser = await User.findByIdAndUpdate(
            req.userId,
            updateData,
            { 
                new: true,
                runValidators: true // Ensures schema validations run
            }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            success: true,
            message: "Preferences updated successfully",
            user: updatedUser
        });

    } catch (error) {
        console.error("Database update error:", error);
        
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                error: "Validation failed",
                details: errors 
            });
        }
        
        res.status(500).json({ 
            error: "Database operation failed",
            details: error.message 
        });
    }
});

module.exports = router;