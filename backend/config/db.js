const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            //useNewUrlParser: true,
            //useUnifiedTopology: true
        });
        console.log("✅ MongoDB Atlas Connected Successfully");
    } catch (error) {
        console.error("❌ MongoDB Atlas Connection Error:", error);
        process.exit(1); // Exit process if DB connection fails
    }
};

module.exports = connectDB;
