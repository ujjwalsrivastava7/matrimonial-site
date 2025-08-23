/*const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Register User
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, gender, age, bio, preferences } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword, gender, age, bio, preferences });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login User
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Matches
router.get('/matches', async (req, res) => {
    try {
        const { userId } = req.query;
        const user = await User.findById(userId);
        if (!user) return res.status(400).json({ error: 'User not found' });

        const matches = await User.find({
            gender: user.preferences.gender,
            age: { $gte: user.preferences.minAge, $lte: user.preferences.maxAge }
        });

        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
*/

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// JWT Authentication Middleware
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Register User
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, gender, age, bio, religion, caste, education, occupation } = req.body;

        // Validate required fields
        if (!email || !password || !firstName || !gender || !age) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create user with default preferences
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            gender,
            age,
            bio,
            religion,
            caste,
            education,
            occupation,
            preferences: {
                minAge: 18,
                maxAge: 50,
                preferredReligions: religion ? [religion] : []
            }
        });

        await newUser.save();
        
        // Generate token
        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        
        res.status(201).json({ 
            token,
            user: {
                _id: newUser._id,
                firstName: newUser.firstName,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login User
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        // Generate token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        
        res.json({ 
            token,
            user: {
                _id: user._id,
                firstName: user.firstName,
                email: user.email,
                profilePhoto: user.profilePhoto
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Get Matches
router.get('/matches', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('preferences gender')
            .populate('preferences');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Build match query
        const query = {
            _id: { $ne: user._id }, // Exclude self
            gender: user.preferences?.gender || (user.gender === 'male' ? 'female' : 'male'),
            age: {
                $gte: user.preferences?.minAge || 18,
                $lte: user.preferences?.maxAge || 50
            }
        };

        // Add religion filter if preferences exist
        if (user.preferences?.preferredReligions?.length > 0) {
            query.religion = { $in: user.preferences.preferredReligions };
        }

        // Get matches with basic info
        const matches = await User.find(query)
            .select('firstName lastName age religion location profilePhoto interests')
            .limit(50);

        res.json(matches);

    } catch (error) {
        console.error('Match error:', error);
        res.status(500).json({ error: 'Error finding matches' });
    }
});

module.exports = router;