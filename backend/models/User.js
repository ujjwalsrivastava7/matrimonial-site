/*
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    age: { type: Number, required: true },
    bio: { type: String },
    profilePhoto: { type: String },
    
    // Preferences as individual fields (NOT nested)
    minAge: { type: Number, default: 18 },
    maxAge: { type: Number, default: 50 },
    interests: { type: [String], default: [] },
    location: { type: String }
});

module.exports = mongoose.model("User", userSchema);
*/
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    // Basic Information
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: { 
        type: String, 
        required: true,
        minlength: 8
    },
    age: { 
        type: Number, 
        required: true,
        min: 18,
        max: 100 
    },
    gender: {
        type: String,
        required: true,
        enum: ['male', 'female', 'other']
    },
    
    // Professional Details
    education: {
        type: String,
        required: true,
        enum: ['high_school', 'bachelor', 'master', 'phd', 'other'],
        default: 'bachelor'
    },
    occupation: {
        type: String,
        required: true,
        trim: true
    },
    
    // Cultural Background
    religion: {
        type: String,
        required: true,
        enum: ['hindu', 'muslim', 'christian', 'sikh', 'jain', 'buddhist', 'other'],
        default: 'hindu'
    },
    caste: {
        type: String,
        trim: true
    },
    
    // Profile Information
    bio: { 
        type: String,
        maxlength: 500 
    },
    profilePhoto: { 
        type: String,
        default: 'default.jpg'
    },
    photos: [{
        type: String
    }],
    
    // Preferences
    preferences: {
        minAge: { 
            type: Number, 
            default: 18,
            min: 18
        },
        maxAge: { 
            type: Number, 
            default: 50,
            max: 100 
        },
        preferredReligions: [{
            type: String,
            enum: ['hindu', 'muslim', 'christian', 'sikh', 'jain', 'buddhist', 'other']
        }],
        interests: { 
            type: [String], 
            default: [] 
        },
        location: { 
            type: String,
            trim: true
        }
    }
}, {
    timestamps: true // Maintains createdAt and updatedAt automatically
});

// Indexes for faster queries
//userSchema.index({ email: 1 });
userSchema.index({ age: 1, gender: 1 });
userSchema.index({ religion: 1, caste: 1 });
userSchema.index({ education: 1, occupation: 1 });

module.exports = mongoose.model("User", userSchema);