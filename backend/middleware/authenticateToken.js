const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        return res.status(403).json({ error: "Authorization header missing" });
    }

    const token = authHeader.split(" ")[1]; // Extract token
    if (!token) {
        return res.status(403).json({ error: "Token missing" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => { // Use your secret key
        if (err) {
            return res.status(403).json({ error: "Invalid token" });
        }
        req.user = decoded; // Store decoded user in request
        next();
    });
};